import LocationCapture from "../components/LocationCapture";
import EvidenceUploader from "../components/EvidenceUploader";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  getInspectionWithTemplate,
  getResponses,
  saveResponse,
  finalizeInspectionOffline,
} from "../db/repositories";
import type {
  BpmTemplateItem,
  EvaluationResponse,
  BpmResponseValue,
  Inspection,
  BpmTemplate,
} from "../types";

const OPTIONS: BpmResponseValue[] = ["C", "CP", "IT", "NA"];

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<BpmTemplate | null>(null);
  const [responses, setResponses] = useState<
    Record<string, EvaluationResponse>
  >({});
  const [finalized, setFinalized] = useState(false);
  const responsesRef = useRef(responses);
  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  async function load() {
    if (!id) return;
    const result = await getInspectionWithTemplate(id);
    if (!result?.template) return;
    setInspection(result.inspection);
    setTemplate(result.template);

    const savedResponses = await getResponses(id);
    const map: Record<string, EvaluationResponse> = {};
    savedResponses.forEach((r) => (map[r.bpmItemId] = r));
    setResponses(map);
    setFinalized(result.inspection.status === "PENDIENTE_DE_ENVIO");
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAnswer(itemId: string, value: BpmResponseValue) {
    if (!id) return;
    const observation = responses[itemId]?.observation ?? "";
    await saveResponse(id, itemId, value, observation);
    await load();
  }

  const debouncedSaveObservation = useRef(
    debounce((itemId: string, observation: string) => {
      if (!id) return;
      const value = responsesRef.current[itemId]?.value ?? null;
      if (!value) return;
      saveResponse(id, itemId, value, observation);
    }, 600),
  ).current;

  async function handleFinalize() {
    if (!id) return;
    await finalizeInspectionOffline(id);
    setFinalized(true);
  }

  if (!inspection || !template)
    return <p style={{ padding: 24 }}>Cargando inspección...</p>;
  const inspectionId = inspection.id;
  const evaluableItems = template.items.filter((i) => i.isEvaluable);
  const answered = evaluableItems.filter((i) => responses[i.id]?.value).length;

  function renderItem(item: BpmTemplateItem) {
    if (item.type !== "ITEM") {
      return (
        <h3 key={item.id} style={{ marginTop: 24 }}>
          {item.visibleCode} — {item.text}
        </h3>
      );
    }
    const current = responses[item.id];
    return (
      <div
        key={item.id}
        style={{
          border: "1px solid #ddd",
          padding: 12,
          marginBottom: 8,
          borderRadius: 6,
        }}
      >
        <p>
          <strong>{item.visibleCode}</strong> {item.text}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              disabled={finalized}
              onClick={() => handleAnswer(item.id, opt)}
              style={{
                fontWeight: current?.value === opt ? "bold" : "normal",
                background: current?.value === opt ? "#2563eb" : "#fff",
                color: current?.value === opt ? "#fff" : "#000",
                border:
                  current?.value === opt
                    ? "2px solid #1e40af"
                    : "1px solid #999",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        <textarea
          disabled={finalized}
          placeholder="Observación (opcional)"
          defaultValue={current?.observation ?? ""}
          onChange={(e) => debouncedSaveObservation(item.id, e.target.value)}
          style={{ width: "100%", marginTop: 8 }}
        />
        <EvidenceUploader
          inspectionId={inspectionId}
          bpmItemId={item.id}
          finalized={finalized}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, paddingBottom: 100 }}>
      <h2>{inspection.establishmentName}</h2>
      <p>{inspection.establishmentAddress}</p>
      <p>
        Progreso: {answered} / {evaluableItems.length} ítems respondidos
      </p>
      <p>Estado: {inspection.status}</p>
      <LocationCapture inspectionId={inspectionId} finalized={finalized} />
      {template.items.map(renderItem)}

      {!finalized ? (
        <button
          onClick={handleFinalize}
          disabled={answered < evaluableItems.length}
        >
          Finalizar (queda Pendiente de envío)
        </button>
      ) : (
        <p style={{ color: "green" }}>
          ✅ Finalizada localmente — Pendiente de envío
        </p>
      )}
    </div>
  );
}
