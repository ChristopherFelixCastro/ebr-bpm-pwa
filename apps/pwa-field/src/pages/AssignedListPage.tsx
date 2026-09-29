import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAndCacheAssignedInspections,
  getLocalInspections,
  downloadInspectionPackage,
} from "../db/repositories";
import type { FieldAssignment, Inspection } from "../types";
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

export default function AssignedListPage() {
  const { user, onlineSession } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine && onlineSession && user) {
        const fresh = await fetchAndCacheAssignedInspections(user.id, user);
        setInspections(fresh);
        setAssignments(await api.getAssignments(user));
      } else {
        setInspections(user ? await getLocalInspections(user.id) : []);
      }
    } catch {
      setInspections(user ? await getLocalInspections(user.id) : []);
      setError("No se pudo conectar. Mostrando datos guardados localmente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id, onlineSession]);

  async function handleDownload(id: string) {
    if (!user) return;
    try { await downloadInspectionPackage(id, user.id); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible descargar el paquete.'); }
  }
  async function handleCreate(caseId: string) {
    if (!user) return;
    try {
      const created = await api.createInspection(caseId);
      await downloadInspectionPackage(created.id, user.id);
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No fue posible crear la inspección.'); }
  }

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Mis evaluaciones asignadas</h2>
      {error && <p style={{ color: "orange" }}>{error}</p>}
      {inspections.length === 0 && <p>No hay evaluaciones asignadas.</p>}
      {onlineSession && assignments.filter((assignment) => assignment.case.status === 'ASSIGNED' &&
        !inspections.some((inspection) => inspection.caseId === assignment.caseId)).map((assignment) => <section key={assignment.id}>
        <p>Caso asignado {assignment.caseId} · {assignment.case.origin} · {assignment.case.priority}</p>
        <button onClick={() => void handleCreate(assignment.caseId)}>Crear inspección</button>
      </section>)}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {inspections.map((insp) => (
          <li
            key={insp.id}
            style={{
              border: "1px solid #ccc",
              padding: 12,
              marginBottom: 8,
              borderRadius: 8,
            }}
          >
            <strong>{insp.establishmentName ?? insp.companyName ?? 'Inspección asignada'}</strong>
            <p>{insp.establishmentAddress ?? `Caso ${insp.caseId}`}</p>
            <p>Estado: {insp.status}</p>
            {insp.downloadedAt ? (
              <Link to={`/inspection/${insp.id}`}>Abrir inspección</Link>
            ) : (
              <button onClick={() => void handleDownload(insp.id)} disabled={!onlineSession}>
                Descargar para trabajo offline
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
