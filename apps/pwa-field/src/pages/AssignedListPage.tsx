import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAndCacheAssignedInspections,
  getLocalInspections,
  downloadInspectionPackage,
} from "../db/repositories";
import type { Inspection } from "../types";

export default function AssignedListPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const fresh = await fetchAndCacheAssignedInspections();
        setInspections(fresh);
      } else {
        setInspections(await getLocalInspections());
      }
    } catch {
      setInspections(await getLocalInspections());
      setError("No se pudo conectar. Mostrando datos guardados localmente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDownload(id: string) {
    await downloadInspectionPackage(id);
    await load();
  }

  if (loading) return <p style={{ padding: 24 }}>Cargando...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Mis evaluaciones asignadas</h2>
      {error && <p style={{ color: "orange" }}>{error}</p>}
      {inspections.length === 0 && <p>No hay evaluaciones asignadas.</p>}
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
            <strong>{insp.establishmentName}</strong>
            <p>{insp.establishmentAddress}</p>
            <p>Estado: {insp.status}</p>
            {insp.downloadedAt ? (
              <Link to={`/inspection/${insp.id}`}>Abrir inspección</Link>
            ) : (
              <button onClick={() => handleDownload(insp.id)}>
                Descargar para trabajo offline
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
