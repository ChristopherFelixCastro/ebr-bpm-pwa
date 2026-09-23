import { useEffect, useRef, useState } from 'react';
import { db } from '../db/schema';
import type { Evidence } from '../types';

const MAX_SIZE = 5 * 1024 * 1024;
const VALID = new Map([['image/jpeg', /\.jpe?g$/i], ['image/png', /\.png$/i], ['image/webp', /\.webp$/i], ['application/pdf', /\.pdf$/i], ['video/mp4', /\.mp4$/i], ['video/webm', /\.webm$/i]]);
interface Props { inspectionId: string; bpmItemId: string | null; finalized?: boolean }
export default function EvidenceUploader({ inspectionId, bpmItemId, finalized }: Props) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [serverCount, setServerCount] = useState(0);
  const [serverEvidence, setServerEvidence] = useState<Array<{ id: string; bpmItemId: string | null; fileName: string; status: string; sizeBytes: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function load() {
    const rows = await db.evidences.where('inspectionId').equals(inspectionId).toArray();
    setEvidences(rows);
    const template = await db.templates.get(inspectionId);
    setServerCount(template?.serverEvidenceCount ?? 0);
    setServerEvidence(template?.serverEvidence ?? []);
  }
  useEffect(() => { void load(); }, [inspectionId]);
  async function add(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const count = serverCount + evidences.filter((item) => item.status !== 'CONFIRMED').length;
      if (count >= 10) throw new Error('Ya hay diez evidencias activas en esta inspección.');
      if (!file.size || file.size > MAX_SIZE) throw new Error('El archivo debe pesar entre 1 byte y 5 MB.');
      if (!VALID.get(file.type)?.test(file.name)) throw new Error('Usa JPEG, PNG, WebP, PDF, MP4 o WebM.');
      const row: Evidence = {
        id: crypto.randomUUID(), inspectionId, bpmItemId, mimeType: file.type,
        fileName: file.name, sizeBytes: file.size, blob: file, status: 'PENDING',
        createdAt: new Date().toISOString(), operationId: crypto.randomUUID(),
      };
      await db.evidences.put(row);
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el archivo.'); }
    finally { if (input.current) input.current.value = ''; }
  }
  async function remove(id: string) {
    const evidence = await db.evidences.get(id);
    if (!evidence || evidence.status === 'CONFIRMED') return;
    await db.evidences.delete(id);
    await load();
  }
  return <section>
    <p>Hasta 10 archivos, 5 MB cada uno. Formatos: JPEG, PNG, WebP, PDF, MP4 o WebM.</p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" disabled={finalized}
      onChange={(event) => void add(event)} />
    {error && <p role="alert">{error}</p>}
    <ul>{serverEvidence.filter((evidence) => evidence.bpmItemId === bpmItemId).map((evidence) => <li key={evidence.id}>
      {evidence.fileName} ({Math.round(evidence.sizeBytes / 1024)} KB) · {evidence.status} (Core)
    </li>)}{evidences.filter((evidence) => evidence.bpmItemId === bpmItemId).map((evidence) => <li key={evidence.id}>
      {evidence.fileName} ({Math.round(evidence.sizeBytes / 1024)} KB) · {evidence.status}
      {evidence.lastError && <span role="alert"> · {evidence.lastError}</span>}
      {!finalized && evidence.status !== 'CONFIRMED' &&
        <button type="button" onClick={() => void remove(evidence.id)}>Quitar</button>}
    </li>)}</ul>
  </section>;
}
