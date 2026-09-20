import { useEffect, useState } from "react";
import { db } from "../db/schema";
import { api } from "../api/client";
import type { SyncQueueItem } from "../types";

export default function SyncPanel() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

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
      // Si perdimos conexión a mitad del lote, detenemos aquí en vez de
      // seguir intentando (y acumulando fallos) uno por uno.
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
      } catch {
        await db.syncQueue.update(item.operationId, {
          status: "REINTENTABLE",
          attempts: item.attempts + 1,
        });
        setLastError(
          "No se pudo sincronizar una operación. Se reintentará automáticamente.",
        );
      }
    }

    await loadQueue();
    setSyncing(false);
  }

  // Refresca la vista de la cola cada 2s
  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sincroniza al recuperar conexión (evento del navegador)
  useEffect(() => {
    const handleOnline = () => handleSync();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Reintento periódico mientras esté online (cubre señal débil/intermitente,
  // donde el evento "online" del navegador no siempre se dispara)
  useEffect(() => {
    const retryInterval = setInterval(() => {
      if (navigator.onLine) handleSync();
    }, 15000);
    return () => clearInterval(retryInterval);
  }, []);

  const pendingCount = queue.filter(
    (q) => q.status === "PENDIENTE" || q.status === "REINTENTABLE",
  ).length;

  if (pendingCount === 0 && queue.length === 0) return null;

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
        {pendingCount > 0
          ? `${pendingCount} operación(es) pendiente(s) de sincronizar`
          : "Todo sincronizado ✅"}
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
