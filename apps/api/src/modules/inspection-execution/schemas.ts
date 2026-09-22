import { z } from 'zod';

export const uuid = z.string().uuid();
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const iso = z.string().datetime({ offset: true });
export const versionSchema = z.object({ version: z.number().int().positive() }).strict();
export const baseVersionSchema = z.object({ baseVersion: z.number().int().positive() }).strict();

export const inspectionListSchema = z.object({
  page, limit,
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_SUBMISSION', 'SUBMITTED']).optional(),
  evaluatorUserId: uuid.optional(),
  caseId: uuid.optional(),
  origin: z.enum(['COMPANY_REQUEST', 'INSTITUTIONAL_PROGRAM', 'HEALTH_ALERT', 'COMPLAINT']).optional(),
  createdFrom: iso.optional(), createdTo: iso.optional(),
}).strict();

export const bpmResponseSchema = z.object({
  baseVersion: z.number().int().positive(),
  responseValue: z.enum(['C', 'CP', 'IT', 'NA']),
  observations: z.string().trim().max(2000).nullable().optional(),
}).strict();

export const riskFactorSchema = z.object({
  baseVersion: z.number().int().positive(), optionId: uuid,
}).strict();

export const foodSnapshotSchema = z.object({
  baseVersion: z.number().int().positive(), foodRiskSubcategoryId: uuid,
}).strict();

export const evidenceDeleteSchema = z.object({
  version: z.number().int().positive(), baseVersion: z.number().int().positive(),
}).strict();
export const evidenceDecisionSchema = z.object({
  version: z.number().int().positive(), reason: z.string().trim().min(1).max(500).optional(),
}).strict();
export const unlockSchema = z.object({
  version: z.number().int().positive(), reason: z.string().trim().min(1).max(500),
}).strict();
export const recalculateSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict();

export const operationType = z.enum([
  'UPSERT_BPM_RESPONSE', 'DELETE_BPM_RESPONSE', 'UPSERT_RISK_FACTOR_SELECTION',
  'ADD_FOOD_SNAPSHOT', 'ADD_EVIDENCE', 'SOFT_DELETE_EVIDENCE', 'FINALIZE',
]);
export const offlineOperationSchema = z.object({
  operationId: uuid,
  operationType,
  baseVersion: z.number().int().positive(),
  payload: z.record(z.unknown()),
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: iso,
}).strict();
export const offlineBatchSchema = z.object({ operations: z.array(offlineOperationSchema).min(1).max(100) }).strict();

export type InspectionListInput = z.infer<typeof inspectionListSchema>;
export type OfflineOperationInput = z.infer<typeof offlineOperationSchema>;
