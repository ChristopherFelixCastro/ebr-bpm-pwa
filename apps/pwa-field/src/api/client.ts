import { CoreApiError, CoreClient, type CoreInspection, type CoreUser } from '@ebr-bpm/core-client';
import type { BpmTemplate, EvaluationResponse, FieldAssignment, Inspection } from '../types';

export { CoreApiError as ApiError };
let expiredHandler: (() => void) | undefined;
export const setExpiredHandler = (handler?: () => void) => { expiredHandler = handler; };
export const core = new CoreClient({ onSessionExpired: () => expiredHandler?.() });

type ServerItem = BpmTemplate['items'][number];
type WorkPackage = {
  inspection: CoreInspection;
  bpmTemplate: { versionId: string; items: ServerItem[] };
  responses: Array<{ bpmItemId: string; responseValue: EvaluationResponse['value']; observations: string | null; updatedAt: string }>;
  riskRule: { versionId: string; factors: BpmTemplate['factors']; foodCatalog: BpmTemplate['foodCatalog'] };
  factorSelections: BpmTemplate['factorSelections'];
  foodSnapshots: BpmTemplate['foodSnapshots'];
  evidence: Array<{ id: string; bpmItemId: string | null; fileName: string; status: string; sizeBytes: number; deletedAt: string | null }>;
  generatedAt: string;
};
export const toLocalInspection = (row: CoreInspection, userId: string): Inspection => ({
  id: row.id, ownerUserId: userId, caseId: row.caseId, status: row.status,
  establishmentName: row.establishmentName, establishmentAddress: row.establishmentAddress, companyName: row.companyName,
  serverStatus: row.status, version: row.version, contentRevision: row.contentRevision,
  templateVersionId: row.bpmTemplateVersionId, updatedAt: row.updatedAt,
});

export const api = {
  login: (email: string, password: string) => core.login(email, password),
  restoreSession: () => core.restoreSession(),
  me: () => core.me().then((x) => x.data),
  logout: () => core.logout(),
  async getAssignments(user: CoreUser): Promise<FieldAssignment[]> {
    const rows: FieldAssignment[] = [];
    for (let page = 1; ; page += 1) {
      const params = new URLSearchParams({ page: String(page), limit: '100', active: 'true' });
      if (user.roleCode === 'EVALUATOR') params.set('evaluatorUserId', user.id);
      const result = await core.request<FieldAssignment[]>(`/v1/assignments?${params}`);
      rows.push(...result.data);
      if (rows.length >= (result.meta.total ?? rows.length) || result.data.length < 100) break;
    }
    return rows;
  },
  async createInspection(caseId: string) {
    return (await core.request<CoreInspection>(`/v1/cases/${encodeURIComponent(caseId)}/inspections`, { method: 'POST', body: '{}' })).data;
  },
  async getAssignedInspections(user: CoreUser): Promise<Inspection[]> {
    const rows: CoreInspection[] = [];
    for (let page = 1; ; page += 1) {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (user.roleCode === 'EVALUATOR') params.set('evaluatorUserId', user.id);
      const result = await core.request<CoreInspection[]>(`/v1/inspections?${params}`);
      rows.push(...result.data);
      if (rows.length >= (result.meta.total ?? rows.length) || result.data.length < 100) break;
    }
    return rows.map((row) => toLocalInspection(row, user.id));
  },
  async getOfflinePackage(id: string, userId: string) {
    const result = await core.request<WorkPackage>(`/v1/inspections/${encodeURIComponent(id)}/work-package`);
    const p = result.data;
    const template: BpmTemplate = {
      inspectionId: id,
      templateVersionId: p.bpmTemplate.versionId, riskRuleVersionId: p.riskRule.versionId,
      items: p.bpmTemplate.items, factors: p.riskRule.factors, foodCatalog: p.riskRule.foodCatalog,
      factorSelections: p.factorSelections, foodSnapshots: p.foodSnapshots, generatedAt: p.generatedAt,
      serverEvidenceCount: p.evidence.filter((e) => e.status !== 'ARCHIVED' && !e.deletedAt).length,
      serverEvidence: p.evidence.filter((e) => e.status !== 'ARCHIVED' && !e.deletedAt)
        .map(({ id: evidenceId, bpmItemId, fileName, status, sizeBytes }) => ({ id: evidenceId, bpmItemId, fileName, status, sizeBytes })),
    };
    const responses: EvaluationResponse[] = p.responses.map((row) => ({
      id: `${id}_${row.bpmItemId}`, inspectionId: id, bpmItemId: row.bpmItemId,
      value: row.responseValue, observation: row.observations ?? '', updatedAt: row.updatedAt,
    }));
    return { inspection: toLocalInspection(p.inspection, userId), template, responses };
  },
  async startInspection(id: string, version: number) {
    return (await core.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}/start`, {
      method: 'POST', body: JSON.stringify({ version }),
    })).data;
  },
  async sendOfflineOperation(id: string, operation: Record<string, unknown>) {
    const result = await core.request<Array<{
      operationId: string; status: 'APPLIED' | 'CONFLICT' | 'REJECTED'; currentVersion: number;
      resultingVersion?: number; contentRevision?: number; code?: string;
    }>>(`/v1/inspections/${encodeURIComponent(id)}/offline-operations/batch`, {
      method: 'POST', body: JSON.stringify({ operations: [operation] }),
    });
    return result.data[0];
  },
  async uploadEvidence(id: string, evidence: { blob: Blob; fileName: string; baseVersion: number; operationId: string; payloadHash: string; bpmItemId: string | null }) {
    const body = new FormData();
    body.set('file', evidence.blob, evidence.fileName);
    body.set('baseVersion', String(evidence.baseVersion));
    body.set('operationId', evidence.operationId);
    body.set('payloadHash', evidence.payloadHash);
    if (evidence.bpmItemId) body.set('bpmItemId', evidence.bpmItemId);
    return (await core.request<{ evidenceId: string; version: number }>(`/v1/inspections/${encodeURIComponent(id)}/evidence`, { method: 'POST', body })).data;
  },
  async recordLocation(id: string, body: { operationId: string; baseVersion: number; payloadHash: string; latitude: number; longitude: number; accuracyMeters: number; capturedAt: string }) {
    return (await core.request<{ id: string; version: number }>(`/v1/inspections/${encodeURIComponent(id)}/location`, {
      method: 'POST', body: JSON.stringify(body),
    })).data;
  },
  async finalize(id: string, version: number) {
    return (await core.request<{ inspection: CoreInspection }>(`/v1/inspections/${encodeURIComponent(id)}/finalize`, {
      method: 'POST', body: JSON.stringify({ version }),
    })).data.inspection;
  },
  async submit(id: string, version: number) {
    return (await core.request<{ inspection: CoreInspection }>(`/v1/inspections/${encodeURIComponent(id)}/submit`, {
      method: 'POST', body: JSON.stringify({ version }),
    })).data.inspection;
  },
};
