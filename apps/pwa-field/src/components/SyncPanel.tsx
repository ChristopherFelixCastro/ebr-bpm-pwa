import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db/schema";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { SyncQueueItem } from "../types";

export default function SyncPanel() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function loadQueue() {
    const all = await db.syncQueue.orderBy("order").toArray();
    setQueue(all);
  }

  async function handleSync() {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    setLastError(null);

    const pending = await db.syncQueue
      .where("status")
      .anyOf("PENDIENTE", "REINTENTABLE")
      .toArray();

    for (const item of pending.sort((a, b) => a.order - b.order)) {
      if (!navigator.onLine) {
        setLastError(
          "Se perdió la conexión durante la sincronización. Se reintentará automáticamente.",
        );
        break;
      }

      await db.syncQueue.update(item.operationId, { status: "ENVIANDO" });

      try {
        const result = await api.sendSyncOperation(item);
        if (result.status === 200) {
          await db.syncQueue.update(item.operationId, { status: "CONFIRMADA" });
          await db.syncLog.put({
            id: item.operationId,
            operationId: item.operationId,
            result: "OK",
            httpStatus: 200,
            occurredAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        if (err instanceof ApiError) {
          await db.syncLog.put({
            id: item.operationId,
            operationId: item.operationId,
            result: "ERROR",
            httpStatus: err.status,
            errorCode: err.code,
            occurredAt: new Date().toISOString(),
          });

          if (err.status === 401) {
            // Detener toda la cola, no perder datos, pedir login de nuevo
            await db.syncQueue.update(item.operationId, {
              status: "REQUIERE_AUTENTICACION",
            });
            setLastError(
              "Tu sesión expiró. Vuelve a iniciar sesión (tu trabajo no se perdió).",
            );
            logout();
            navigate("/login", { state: { from: window.location.pathname } });
            setSyncing(false);
            return; // detiene el resto de la cola por completo
          }

          if (err.status === 403) {
            await db.syncQueue.update(item.operationId, {
              status: "RECHAZADA",
              attempts: item.attempts + 1,
            });
            setLastError(
              "Una operación fue rechazada por permisos. Contacta al Coordinador.",
            );
            continue; // no reintenta sola
          }

          if (err.status === 409) {
            await db.syncQueue.update(item.operationId, {
              status: "CONFLICTO",
              attempts: item.attempts + 1,
            });
            setLastError(
              "Conflicto: otra modificación ya fue confirmada para esta inspección. Revisa el estado actualizado.",
            );
            continue; // se bloquea, no se sobrescribe
          }

          if (err.status === 413) {
            await db.syncQueue.update(item.operationId, {
              status: "RECHAZADA",
              attempts: item.attempts + 1,
            });
            setLastError(
              "Un archivo excede el límite permitido y fue rechazado.",
            );
            continue;
          }

          if (err.status === 422) {
            await db.syncQueue.update(item.operationId, {
              status: "RECHAZADA",
              attempts: item.attempts + 1,
            });
            setLastError("La API rechazó la operación: " + err.message);
            continue;
          }

          // 5xx u otros: reintentable
          await db.syncQueue.update(item.operationId, {
            status: "REINTENTABLE",
            attempts: item.attempts + 1,
          });
          setLastError(
            "Error temporal del servidor. Se reintentará automáticamente.",
          );
        } else {
          // Error de red genuino (sin conexión real, fetch falló, etc.)
          await db.syncQueue.update(item.operationId, {
            status: "REINTENTABLE",
            attempts: item.attempts + 1,
          });
          setLastError("Error de red. Se reintentará automáticamente.");
        }
      }
    }

    await loadQueue();
    setSyncing(false);
  }

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => handleSync();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    const retryInterval = setInterval(() => {
      if (navigator.onLine) handleSync();
    }, 15000);
    return () => clearInterval(retryInterval);
  }, []);

  const pendingCount = queue.filter((q) =>
    ["PENDIENTE", "REINTENTABLE", "ENVIANDO"].includes(q.status),
  ).length;
  const blockedCount = queue.filter((q) =>
    ["CONFLICTO", "RECHAZADA", "REQUIERE_AUTENTICACION"].includes(q.status),
  ).length;

  if (pendingCount === 0 && blockedCount === 0 && queue.length === 0)
    return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#111",
        padding: 12,
        borderTop: "1px solid #333",
      }}
    >
      <p style={{ margin: 0, fontSize: 13 }}>
        {pendingCount > 0 && `${pendingCount} pendiente(s) de sincronizar. `}
        {blockedCount > 0 &&
          `⚠️ ${blockedCount} bloqueada(s), requieren atención. `}
        {pendingCount === 0 && blockedCount === 0 && "Todo sincronizado ✅"}
      </p>
      {lastError && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#f90" }}>
          {lastError}
        </p>
      )}
      {pendingCount > 0 && (
        <button onClick={handleSync} disabled={syncing || !navigator.onLine}>
          {syncing ? "Sincronizando..." : "Sincronizar ahora"}
        </button>
      )}
    </div>
  );
}
