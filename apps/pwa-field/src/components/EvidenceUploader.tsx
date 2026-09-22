import { useEffect, useRef, useState } from "react";
import { db } from "../db/schema";
import type { Evidence, EvidenceType } from "../types";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_EVIDENCES = 10;

const ALLOWED_TYPES: Record<string, EvidenceType> = {
  "image/jpeg": "PHOTO",
  "image/png": "PHOTO",
  "image/webp": "PHOTO",
  "application/pdf": "DOCUMENT",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
};

interface Props {
  inspectionId: string;
  bpmItemId: string | null;
  finalized?: boolean;
  onChange?: () => void;
}

export default function EvidenceUploader({
  inspectionId,
  bpmItemId,
  finalized,
  onChange,
}: Props) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadEvidences() {
    const all = await db.evidences
      .where("inspectionId")
      .equals(inspectionId)
      .toArray();
    setEvidences(all.filter((e) => e.bpmItemId === bpmItemId));
  }

  useEffect(() => {
    void loadEvidences();
  }, [inspectionId, bpmItemId]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar cantidad total por inspección
    const totalCount = await db.evidences
      .where("inspectionId")
      .equals(inspectionId)
      .count();
    if (totalCount >= MAX_EVIDENCES) {
      setError(
        `Ya alcanzaste el máximo de ${MAX_EVIDENCES} evidencias por inspección.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Validar tamaño
    if (file.size > MAX_SIZE_BYTES) {
      setError(
        `El archivo pesa más de 5 MB (${(file.size / 1024 / 1024).toFixed(2)} MB). No se guardará.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Validar tipo
    const evidenceType = ALLOWED_TYPES[file.type];
    if (!evidenceType) {
      setError(
        `Formato no soportado (${file.type || "desconocido"}). Usa JPEG, PNG, WebP, PDF, MP4 o WebM.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const evidence: Evidence = {
      id: crypto.randomUUID(),
      inspectionId,
      bpmItemId,
      type: evidenceType,
      mimeType: file.type,
      fileName: file.name,
      sizeBytes: file.size,
      blob: file,
      status: "PENDIENTE",
      createdAt: new Date().toISOString(),
    };

    await db.evidences.put(evidence);
    await loadEvidences();
    onChange?.();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    await db.evidences.delete(id);
    await loadEvidences();
    onChange?.();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"
        capture="environment"
        onChange={handleFileSelect}
        disabled={finalized}
      />
      {error && <p style={{ color: "#f66" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0, marginTop: 4 }}>
        {evidences.map((ev) => (
          <li
            key={ev.id}
            style={{
              fontSize: 13,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            📎 {ev.fileName} ({(ev.sizeBytes / 1024).toFixed(0)} KB)
            <button
              onClick={() => handleDelete(ev.id)}
              disabled={finalized}
              style={{ fontSize: 11 }}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
