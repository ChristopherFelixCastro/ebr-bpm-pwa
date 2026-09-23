import { CoreApiError } from '@ebr-bpm/core-client';
import { api, core } from '../api/client';
import { db } from '../db/schema';
import type { Evidence, Inspection, SyncQueueItem } from '../types';

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}
export async function sha256Hex(data: BufferSource | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
}
export async function evidenceHash(evidence: Evidence, baseVersion: number) {
  return sha256Hex(canonical({
    baseVersion, contentSha256: await sha256Hex(await evidence.blob.arrayBuffer()),
    fileName: evidence.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 300),
    mimeType: evidence.mimeType, operationType: 'ADD_EVIDENCE', sizeBytes: evidence.sizeBytes,
    ...(evidence.bpmItemId ? { bpmItemId: evidence.bpmItemId } : {}),
  }));
}
const active = new Map<string, Promise<void>>();
const blocked = new Set(['AUTH_REQUIRED', 'CONFLICT', 'REJECTED']);
async function record(id: string, result: 'OK' | 'ERROR', error?: CoreApiError) {
  await db.syncLog.put({ id, operationId: id, result, httpStatus: error?.status, errorCode: error?.code, occurredAt: new Date().toISOString() });
}
async function saveVersion(inspection: Inspection, version: number, status?: Inspection['status']) {
  inspection.version = version;
  if (status) {
    inspection.status = status;
    if (status !== 'LOCAL_PENDING' && status !== 'SYNC_CONFLICT') inspection.serverStatus = status;
  }
  await db.inspections.update(inspection.id, {
    version: inspection.version, status: inspection.status, serverStatus: inspection.serverStatus, updatedAt: new Date().toISOString(),
  });
}
async function fail(item: SyncQueueItem, error: unknown, inspection: Inspection) {
  const failure = error instanceof CoreApiError ? error : undefined;
  const status = failure?.status === 401 ? 'AUTH_REQUIRED'
    : failure?.status === 409 ? 'CONFLICT'
      : failure && [400, 403, 413, 422].includes(failure.status) ? 'REJECTED' : 'RETRYABLE';
  await db.syncQueue.update(item.operationId, { status, attempts: item.attempts + 1, lastError: failure?.code ?? (error instanceof Error ? error.message : 'NETWORK_ERROR') });
  if (status === 'CONFLICT') await db.inspections.update(inspection.id, { status: 'SYNC_CONFLICT' });
  await record(item.operationId, 'ERROR', failure);
}
async function sendEvidence(inspection: Inspection): Promise<boolean> {
  const all = await db.evidences.where('inspectionId').equals(inspection.id).toArray();
  if (all.some((entry) => entry.status === 'REJECTED')) return false;
  const evidences = all
    .filter((entry) => entry.status !== 'CONFIRMED' && entry.status !== 'REJECTED')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const evidence of evidences) {
    try {
      const baseVersion = evidence.baseVersion ?? inspection.version;
      const payloadHash = evidence.payloadHash ?? await evidenceHash(evidence, baseVersion);
      await db.evidences.update(evidence.id, { status: 'UPLOADING', baseVersion, payloadHash });
      const result = await api.uploadEvidence(inspection.id, { ...evidence, baseVersion, payloadHash });
      await db.evidences.update(evidence.id, { status: 'CONFIRMED' });
      const template = await db.templates.get(inspection.id);
      if (template) await db.templates.update(inspection.id, { serverEvidenceCount: template.serverEvidenceCount + 1 });
      await saveVersion(inspection, result.version);
      await record(evidence.operationId, 'OK');
    } catch (error) {
      const failure = error instanceof CoreApiError ? error : undefined;
      const status = failure?.status && [400, 403, 409, 413, 422].includes(failure.status) ? 'REJECTED' : 'PENDING';
      await db.evidences.update(evidence.id, { status, lastError: failure?.code ?? (error instanceof Error ? error.message : 'NETWORK_ERROR') });
      if (failure?.status === 409) await db.inspections.update(inspection.id, { status: 'SYNC_CONFLICT' });
      await record(evidence.operationId, 'ERROR', failure);
      return false;
    }
  }
  return true;
}
async function run(userId: string) {
  if (!navigator.onLine || !core.authenticated) return;
  const inspections = (await db.inspections.toArray()).filter((entry) => entry.ownerUserId === userId);
  for (const inspection of inspections) {
    const queue = (await db.syncQueue.where('inspectionId').equals(inspection.id).toArray())
      .filter((entry) => entry.ownerUserId === userId).sort((a, b) => a.order - b.order);
    if (queue.some((entry) => blocked.has(entry.status))) continue;
    const unsent = (await db.evidences.where('inspectionId').equals(inspection.id).toArray()).some((entry) => ['PENDING', 'UPLOADING'].includes(entry.status));
    if (!queue.some((entry) => ['PENDING', 'SENDING', 'RETRYABLE'].includes(entry.status)) && !unsent) continue;
    if (inspection.serverStatus === 'DRAFT') {
      try {
        const started = await api.startInspection(inspection.id, inspection.version);
        await saveVersion(inspection, started.version, inspection.status === 'LOCAL_PENDING' ? 'LOCAL_PENDING' : started.status);
        inspection.serverStatus = started.status;
      } catch (error) {
        if (!(error instanceof CoreApiError) || error.status !== 409) continue;
        const fresh = (await core.inspection(inspection.id)).data;
        if (fresh.status !== 'IN_PROGRESS') continue;
        await saveVersion(inspection, fresh.version);
        inspection.serverStatus = fresh.status;
      }
    }
    let stopped = false;
    for (const item of queue) {
      if (item.status === 'APPLIED') continue;
      if (blocked.has(item.status) || !navigator.onLine) { stopped = true; break; }
      try {
        if (item.type === 'FINALIZE' || item.type === 'SUBMIT') {
          if (item.type === 'FINALIZE' && !await sendEvidence(inspection)) { stopped = true; break; }
          await db.syncQueue.update(item.operationId, { status: 'SENDING' });
          const fresh = (await core.inspection(inspection.id)).data;
          if (item.type === 'FINALIZE' && fresh.status === 'PENDING_SUBMISSION')
            await saveVersion(inspection, fresh.version, 'PENDING_SUBMISSION');
          else if (item.type === 'SUBMIT' && fresh.status === 'SUBMITTED')
            await saveVersion(inspection, fresh.version, 'SUBMITTED');
          else {
            const result = item.type === 'FINALIZE' ? await api.finalize(inspection.id, inspection.version)
              : await api.submit(inspection.id, inspection.version);
            await saveVersion(inspection, result.version, result.status);
          }
        } else if (item.type === 'SAVE_LOCATION') {
          const baseVersion = item.baseVersion ?? inspection.version;
          const payloadHash = item.payloadHash ?? await sha256Hex(canonical({ ...item.payload, baseVersion }));
          await db.syncQueue.update(item.operationId, { status: 'SENDING', baseVersion, payloadHash });
          const result = await api.recordLocation(inspection.id, {
            operationId: item.operationId, baseVersion, payloadHash,
            latitude: item.payload.latitude as number, longitude: item.payload.longitude as number,
            accuracyMeters: item.payload.accuracyMeters as number, capturedAt: item.payload.capturedAt as string,
          });
          await saveVersion(inspection, result.version);
        } else {
          const baseVersion = item.baseVersion ?? inspection.version;
          const payloadHash = item.payloadHash ?? await sha256Hex(canonical(item.payload));
          await db.syncQueue.update(item.operationId, { status: 'SENDING', baseVersion, payloadHash });
          const result = await api.sendOfflineOperation(inspection.id, {
            operationId: item.operationId, operationType: item.type, baseVersion,
            payload: item.payload, payloadHash, createdAt: item.createdAt,
          });
          if (result.status !== 'APPLIED') {
            const status = result.status === 'CONFLICT' ? 'CONFLICT' : 'REJECTED';
            await db.syncQueue.update(item.operationId, { status, lastError: result.code });
            if (status === 'CONFLICT') await db.inspections.update(inspection.id, { status: 'SYNC_CONFLICT' });
            await record(item.operationId, 'ERROR');
            stopped = true;
            break;
          }
          await saveVersion(inspection, result.resultingVersion ?? result.currentVersion);
        }
        await db.syncQueue.update(item.operationId, { status: 'APPLIED' });
        await record(item.operationId, 'OK');
      } catch (error) { await fail(item, error, inspection); stopped = true; }
      if (stopped) break;
    }
    if (!stopped) await sendEvidence(inspection);
  }
}
export function syncNow(userId: string): Promise<void> {
  const existing = active.get(userId);
  if (existing) return existing;
  const task = run(userId).finally(() => active.delete(userId));
  active.set(userId, task);
  return task;
}
