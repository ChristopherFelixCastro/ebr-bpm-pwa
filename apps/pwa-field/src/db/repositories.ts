import { db } from "./schema";
import { api } from "../api/client";
import type {
  Inspection,
  EvaluationResponse,
  BpmResponseValue,
  SyncQueueItem,
} from "../types";

export async function fetchAndCacheAssignedInspections(): Promise<
  Inspection[]
> {
  const fresh = await api.getAssignedInspections();

  const merged = await Promise.all(
    fresh.map(async (inspection) => {
      const local = await db.inspections.get(inspection.id);
      if (!local) return inspection;
      // Si ya existe localmente, el estado/versión/descarga locales mandan
      return {
        ...inspection,
        downloadedAt: local.downloadedAt,
        status: local.status,
        entityVersion: local.entityVersion,
      };
    }),
  );

  await db.inspections.bulkPut(merged);
  return merged;
}

export async function getLocalInspections(): Promise<Inspection[]> {
  return db.inspections.toArray();
}

export async function downloadInspectionPackage(inspectionId: string) {
  const { inspection, template } = await api.getOfflinePackage(inspectionId);
  await db.templates.put(template);
  await db.inspections.put({
    ...inspection,
    downloadedAt: new Date().toISOString(),
  });
}

export async function getInspectionWithTemplate(inspectionId: string) {
  const inspection = await db.inspections.get(inspectionId);
  if (!inspection) return null;
  const template = await db.templates.get(inspection.templateVersionId);
  return { inspection, template };
}

export async function getResponses(
  inspectionId: string,
): Promise<EvaluationResponse[]> {
  return db.responses.where("inspectionId").equals(inspectionId).toArray();
}

export async function saveResponse(
  inspectionId: string,
  bpmItemId: string,
  value: BpmResponseValue,
  observation: string,
) {
  const id = `${inspectionId}_${bpmItemId}`;
  const existing = await db.responses.get(id);
  const entityVersion = (existing?.entityVersion ?? 0) + 1;

  await db.responses.put({
    id,
    inspectionId,
    bpmItemId,
    value,
    observation,
    entityVersion,
    updatedAt: new Date().toISOString(),
  });

  // Cada cambio genera/actualiza una operación pendiente en la cola
  const operationId = crypto.randomUUID();
  const queueItem: SyncQueueItem = {
    operationId,
    type: "UPSERT_RESPONSE",
    inspectionId,
    entityVersion,
    payload: { bpmItemId, value, observation },
    status: "PENDIENTE",
    attempts: 0,
    order: Date.now(),
    createdAt: new Date().toISOString(),
  };
  await db.syncQueue.put(queueItem);
}

export async function finalizeInspectionOffline(inspectionId: string) {
  await db.inspections.update(inspectionId, {
    status: "PENDIENTE_DE_ENVIO",
    updatedAt: new Date().toISOString(),
  });
}
