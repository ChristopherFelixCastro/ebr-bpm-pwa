import type { CoreInspection, CoreUser } from '@ebr-bpm/core-client';

export type BpmResponseValue = 'C' | 'CP' | 'IT' | 'NA';
export type InspectionStatus = CoreInspection['status'] | 'LOCAL_PENDING' | 'SYNC_CONFLICT';
export interface Inspection {
  id: string;
  ownerUserId: string;
  caseId: string;
  establishmentName: string | null;
  establishmentAddress: string | null;
  companyName: string | null;
  status: InspectionStatus;
  serverStatus: CoreInspection['status'];
  version: number;
  contentRevision: number;
  templateVersionId: string;
  updatedAt: string;
  downloadedAt?: string;
}
export interface BpmTemplateItem {
  id: string;
  parentItemId: string | null;
  displayCode: string | null;
  title: string;
  itemKind: 'SECTION' | 'SUBSECTION' | 'GROUP' | 'CRITERION';
  sortOrder: number;
  isEvaluable: boolean;
  guidanceItems?: Array<{ id: string; text: string; sortOrder: number; criticality: string | null }>;
}
export interface RiskFactor {
  id: string; code: string; name: string; sortOrder: number;
  options: Array<{ id: string; code: string; label: string; score: number | string }>;
}
export interface FoodCategory {
  id: string; name: string; code: string;
  subcategories: Array<{ id: string; name: string; riskScore: number | null }>;
}
export interface BpmTemplate {
  inspectionId: string;
  templateVersionId: string;
  riskRuleVersionId: string;
  items: BpmTemplateItem[];
  factors: RiskFactor[];
  foodCatalog: FoodCategory[];
  factorSelections: Array<{ riskFactorId: string; optionId: string }>;
  foodSnapshots: Array<{ foodRiskSubcategoryId: string }>;
  serverEvidenceCount: number;
  serverEvidence: Array<{ id: string; bpmItemId: string | null; fileName: string; status: string; sizeBytes: number }>;
  generatedAt: string;
}
export interface EvaluationResponse {
  id: string;
  inspectionId: string;
  bpmItemId: string;
  value: BpmResponseValue | null;
  observation: string;
  updatedAt: string;
}
export interface Evidence {
  id: string;
  inspectionId: string;
  bpmItemId: string | null;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  blob: Blob;
  status: 'PENDING' | 'UPLOADING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  operationId: string;
  baseVersion?: number;
  payloadHash?: string;
  lastError?: string;
}
export interface InspectionLocation {
  id: string; inspectionId: string; latitude: number; longitude: number;
  accuracy: number; capturedAt: string;
}
export type SyncOperationType = 'UPSERT_BPM_RESPONSE' | 'UPSERT_RISK_FACTOR_SELECTION' | 'ADD_FOOD_SNAPSHOT' | 'SAVE_LOCATION' | 'FINALIZE' | 'SUBMIT';
export type SyncOperationStatus = 'PENDING' | 'SENDING' | 'APPLIED' | 'RETRYABLE' | 'AUTH_REQUIRED' | 'CONFLICT' | 'REJECTED';
export interface SyncQueueItem {
  operationId: string;
  type: SyncOperationType;
  inspectionId: string;
  ownerUserId: string;
  payload: Record<string, unknown>;
  status: SyncOperationStatus;
  attempts: number;
  order: number;
  createdAt: string;
  baseVersion?: number;
  payloadHash?: string;
  lastError?: string;
}
export interface SyncLogEntry {
  id: string; operationId: string; result: 'OK' | 'ERROR';
  httpStatus?: number; errorCode?: string; occurredAt: string;
}
export type AuthUser = CoreUser;
export interface FieldAssignment {
  id: string; caseId: string; evaluator: { id: string; fullName: string };
  case: { status: string; origin: string; priority: string };
}
