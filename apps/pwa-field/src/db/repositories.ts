import { db } from './schema';
import { api } from '../api/client';
import type { BpmResponseValue, EvaluationResponse, Inspection, InspectionLocation, SyncOperationType, SyncQueueItem } from '../types';

const awaiting = new Set(['PENDING', 'SENDING', 'RETRYABLE', 'AUTH_REQUIRED', 'CONFLICT', 'REJECTED']);
export async function pendingFor(id: string) {
  return (await db.syncQueue.where('inspectionId').equals(id).toArray()).some((entry) => awaiting.has(entry.status))
    || (await db.evidences.where('inspectionId').equals(id).toArray()).some((entry) => entry.status !== 'CONFIRMED');
}
export async function fetchAndCacheAssignedInspections(userId: string, user: Parameters<typeof api.getAssignedInspections>[0]): Promise<Inspection[]> {
  const fresh = await api.getAssignedInspections(user);
  const merged = await Promise.all(fresh.map(async (inspection) => {
    const local = await db.inspections.get(inspection.id);
    if (!local || local.ownerUserId !== userId) return inspection;
    if (await pendingFor(inspection.id)) return { ...local, updatedAt: inspection.updatedAt };
    return { ...inspection, downloadedAt: local.downloadedAt };
  }));
  await db.inspections.bulkPut(merged);
  return merged;
}
export async function getLocalInspections(userId: string): Promise<Inspection[]> {
  return (await db.inspections.toArray()).filter((inspection) => inspection.ownerUserId === userId);
}
export async function downloadInspectionPackage(id: string, userId: string) {
  if (await pendingFor(id)) throw new Error('Sincroniza o resuelve el trabajo local antes de actualizar el paquete.');
  const { inspection, template, responses } = await api.getOfflinePackage(id, userId);
  await db.transaction('rw', db.inspections, db.templates, db.responses, db.evidences, async () => {
    await db.templates.put(template);
    await db.responses.where('inspectionId').equals(id).delete();
    await db.responses.bulkPut(responses);
    const confirmed = (await db.evidences.where('inspectionId').equals(id).toArray()).filter((entry) => entry.status === 'CONFIRMED');
    for (const entry of confirmed) await db.evidences.delete(entry.id);
    await db.inspections.put({ ...inspection, downloadedAt: new Date().toISOString() });
  });
}
export async function getInspectionWithTemplate(id: string, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId) return null;
  const template = await db.templates.get(id);
  return { inspection, template };
}
export async function getResponses(id: string): Promise<EvaluationResponse[]> {
  return db.responses.where('inspectionId').equals(id).toArray();
}
async function enqueue(id: string, ownerUserId: string, type: SyncOperationType, payload: Record<string, unknown>) {
  const last = await db.syncQueue.orderBy('order').last();
  const entry: SyncQueueItem = {
    operationId: crypto.randomUUID(), inspectionId: id, ownerUserId, type, payload,
    status: 'PENDING', attempts: 0, order: Math.max(Date.now(), (last?.order ?? 0) + 1),
    createdAt: new Date().toISOString(),
  };
  await db.syncQueue.put(entry);
  return entry;
}
export async function saveResponse(id: string, itemId: string, value: BpmResponseValue, observation: string, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId || !['DRAFT', 'IN_PROGRESS'].includes(inspection.status))
    throw new Error('Esta inspección ya no admite cambios locales.');
  const response: EvaluationResponse = {
    id: `${id}_${itemId}`, inspectionId: id, bpmItemId: itemId, value,
    observation, updatedAt: new Date().toISOString(),
  };
  await db.transaction('rw', db.responses, db.syncQueue, async () => {
    const prior = (await db.syncQueue.where('inspectionId').equals(id).toArray())
      .find((entry) => entry.type === 'UPSERT_BPM_RESPONSE' && entry.payload.bpmItemId === itemId && entry.status === 'PENDING' && !entry.baseVersion);
    if (prior) await db.syncQueue.update(prior.operationId, { payload: { bpmItemId: itemId, responseValue: value, observations: observation } });
    else await enqueue(id, ownerUserId, 'UPSERT_BPM_RESPONSE', { bpmItemId: itemId, responseValue: value, observations: observation });
    await db.responses.put(response);
  });
}
export async function selectFactor(id: string, factorId: string, optionId: string, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  const template = inspection && await db.templates.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId || !['DRAFT', 'IN_PROGRESS'].includes(inspection.status) || !template)
    throw new Error('Esta inspección no admite cambios.');
  await db.transaction('rw', db.syncQueue, db.templates, async () => {
    const prior = (await db.syncQueue.where('inspectionId').equals(id).toArray())
      .find((entry) => entry.type === 'UPSERT_RISK_FACTOR_SELECTION' && entry.payload.factorId === factorId && entry.status === 'PENDING' && !entry.baseVersion);
    if (prior) await db.syncQueue.update(prior.operationId, { payload: { factorId, optionId } });
    else await enqueue(id, ownerUserId, 'UPSERT_RISK_FACTOR_SELECTION', { factorId, optionId });
    template.factorSelections = [...template.factorSelections.filter((entry) => entry.riskFactorId !== factorId), { riskFactorId: factorId, optionId }];
    await db.templates.put(template);
  });
}
export async function addFood(id: string, foodRiskSubcategoryId: string, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  const template = inspection && await db.templates.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId || !['DRAFT', 'IN_PROGRESS'].includes(inspection.status) || !template)
    throw new Error('Esta inspección no admite cambios.');
  if (template.foodSnapshots.some((entry) => entry.foodRiskSubcategoryId === foodRiskSubcategoryId)) return;
  await db.transaction('rw', db.syncQueue, db.templates, async () => {
    await enqueue(id, ownerUserId, 'ADD_FOOD_SNAPSHOT', { foodRiskSubcategoryId });
    template.foodSnapshots.push({ foodRiskSubcategoryId });
    await db.templates.put(template);
  });
}
export async function saveLocation(id: string, location: InspectionLocation, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId || !['DRAFT', 'IN_PROGRESS'].includes(inspection.status))
    throw new Error('Esta inspección no admite cambios.');
  await db.transaction('rw', db.locations, db.syncQueue, async () => {
    await db.locations.where('inspectionId').equals(id).delete();
    const prior = (await db.syncQueue.where('inspectionId').equals(id).toArray())
      .filter((item) => item.type === 'SAVE_LOCATION' && item.status === 'PENDING' && !item.baseVersion);
    for (const item of prior) await db.syncQueue.delete(item.operationId);
    await db.locations.put(location);
    await enqueue(id, ownerUserId, 'SAVE_LOCATION', {
      latitude: location.latitude, longitude: location.longitude,
      accuracyMeters: location.accuracy, capturedAt: location.capturedAt,
    });
  });
}
export async function finalizeInspectionOffline(id: string, ownerUserId: string) {
  const inspection = await db.inspections.get(id);
  const template = inspection && await db.templates.get(id);
  if (!inspection || inspection.ownerUserId !== ownerUserId || !template || !['DRAFT', 'IN_PROGRESS'].includes(inspection.status))
    throw new Error('Esta inspección no puede finalizarse.');
  const responses = await getResponses(id);
  const missing = template.items.filter((item) => item.itemKind === 'CRITERION' && item.isEvaluable)
    .filter((item) => !responses.some((response) => response.bpmItemId === item.id && response.value));
  if (missing.length) throw new Error(`Faltan ${missing.length} criterios BPM.`);
  if (template.factors.some((factor) => !template.factorSelections.some((entry) => entry.riskFactorId === factor.id)))
    throw new Error('Completa los seis factores de riesgo.');
  if (!template.foodSnapshots.length) throw new Error('Selecciona al menos un producto alimentario.');
  const applicable = template.foodSnapshots.some((entry) => template.foodCatalog.some((category) =>
    category.subcategories.some((subcategory) => subcategory.id === entry.foodRiskSubcategoryId && subcategory.riskScore !== null)));
  if (!applicable) throw new Error('Todos los productos seleccionados son no aplicables.');
  await db.transaction('rw', db.inspections, db.syncQueue, async () => {
    await enqueue(id, ownerUserId, 'FINALIZE', {});
    await enqueue(id, ownerUserId, 'SUBMIT', {});
    await db.inspections.update(id, { status: 'LOCAL_PENDING', updatedAt: new Date().toISOString() });
  });
}
