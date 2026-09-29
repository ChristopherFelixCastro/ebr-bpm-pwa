import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({
  sendOfflineOperation: vi.fn(), startInspection: vi.fn(), uploadEvidence: vi.fn(),
  recordLocation: vi.fn(), finalize: vi.fn(), submit: vi.fn(),
}));
vi.mock('../api/client', () => ({ api: calls, core: { authenticated: true, inspection: vi.fn() } }));
import { db } from '../db/schema';
import { addFood, finalizeInspectionOffline, getResponses, saveResponse, selectFactor } from '../db/repositories';
import { evidenceHash, syncNow } from '../offline/sync';
import type { BpmTemplate, Evidence, Inspection } from '../types';

const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const criterion = '33333333-3333-4333-8333-333333333333';
const food = '44444444-4444-4444-8444-444444444444';
const inspection = (status: Inspection['status'] = 'IN_PROGRESS'): Inspection => ({
  id, ownerUserId: owner, caseId: '55555555-5555-4555-8555-555555555555',
  establishmentName: 'Planta', establishmentAddress: null, companyName: 'Empresa',
  status, serverStatus: status === 'DRAFT' ? 'DRAFT' : 'IN_PROGRESS',
  version: 1, contentRevision: 1, templateVersionId: '66666666-6666-4666-8666-666666666666',
  updatedAt: new Date().toISOString(), downloadedAt: new Date().toISOString(),
});
const template = (): BpmTemplate => ({
  inspectionId: id, templateVersionId: inspection().templateVersionId, riskRuleVersionId: '77777777-7777-4777-8777-777777777777',
  generatedAt: new Date().toISOString(), serverEvidenceCount: 0,
  serverEvidence: [],
  items: [{ id: criterion, parentItemId: null, displayCode: '1', title: 'Criterio',
    itemKind: 'CRITERION', sortOrder: 1, isEvaluable: true }],
  factors: Array.from({ length: 6 }, (_, index) => ({
    id: `factor-${index}`, code: `FACTOR_${index}`, name: `Factor ${index}`, sortOrder: index,
    options: [{ id: `option-${index}`, code: 'LOW', label: 'Bajo', score: 1 }],
  })),
  foodCatalog: [{ id: 'category', name: 'Alimentos', code: 'FOOD', subcategories: [{ id: food, name: 'Producto', riskScore: 1 }] }],
  factorSelections: [], foodSnapshots: [],
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  await db.open();
  await db.transaction('rw', db.tables, async () => { for (const table of db.tables) await table.clear(); });
  await db.inspections.put(inspection());
  await db.templates.put(template());
});
describe('trabajo de campo sin conexión', () => {
  it('incluye el criterio BPM en la identidad de una evidencia', async () => {
    const evidence: Evidence = {
      id: crypto.randomUUID(), inspectionId: id, bpmItemId: criterion,
      fileName: 'hallazgo.pdf', mimeType: 'application/pdf', sizeBytes: 8,
      blob: new Blob(['%PDF-1.0'], { type: 'application/pdf' }),
      status: 'PENDING', createdAt: new Date().toISOString(), operationId: crypto.randomUUID(),
    };
    expect(await evidenceHash(evidence, 1)).not.toBe(await evidenceHash({ ...evidence, bpmItemId: null }, 1));
  });
  it('conserva una sola operación pendiente por criterio y exige cálculo completo para finalizar', async () => {
    await saveResponse(id, criterion, 'C', 'Primera nota', owner);
    await saveResponse(id, criterion, 'CP', 'Nota final', owner);
    expect((await getResponses(id))[0]).toMatchObject({ value: 'CP', observation: 'Nota final' });
    expect((await db.syncQueue.toArray()).filter((entry) => entry.type === 'UPSERT_BPM_RESPONSE')).toHaveLength(1);
    await expect(finalizeInspectionOffline(id, owner)).rejects.toThrow('seis factores');
    for (let index = 0; index < 6; index += 1) await selectFactor(id, `factor-${index}`, `option-${index}`, owner);
    await addFood(id, food, owner);
    await finalizeInspectionOffline(id, owner);
    expect((await db.inspections.get(id))?.status).toBe('LOCAL_PENDING');
    expect((await db.syncQueue.orderBy('order').toArray()).slice(-2).map((entry) => entry.type)).toEqual(['FINALIZE', 'SUBMIT']);
  });
  it('encadena la versión devuelta por el Core y no duplica un reintento confirmado', async () => {
    await saveResponse(id, criterion, 'C', 'Guardado', owner);
    calls.sendOfflineOperation.mockResolvedValue({ status: 'APPLIED', currentVersion: 2, resultingVersion: 2 });
    await syncNow(owner);
    expect((await db.inspections.get(id))?.version).toBe(2);
    expect((await db.syncQueue.toArray())[0].status).toBe('APPLIED');
    await syncNow(owner);
    expect(calls.sendOfflineOperation).toHaveBeenCalledTimes(1);
  });
  it('bloquea conflicto 409 sin borrar la respuesta capturada', async () => {
    await saveResponse(id, criterion, 'IT', 'Hallazgo', owner);
    calls.sendOfflineOperation.mockResolvedValue({ status: 'CONFLICT', currentVersion: 3, code: 'VERSION_CONFLICT' });
    await syncNow(owner);
    expect((await db.inspections.get(id))?.status).toBe('SYNC_CONFLICT');
    expect((await db.syncQueue.toArray())[0].status).toBe('CONFLICT');
    expect((await getResponses(id))[0].observation).toBe('Hallazgo');
  });
});
