// Estados de una inspección en el dispositivo
export type InspectionStatus =
  | "ASIGNADA"
  | "EN_PROGRESO"
  | "PENDIENTE_DE_ENVIO"
  | "ENVIANDO"
  | "EN_REVISION"
  | "APROBADA"
  | "DEVUELTA"
  | "CERRADA"
  | "CONFLICTO"
  | "RECHAZADA";

export type BpmResponseValue = "C" | "CP" | "IT" | "NA";

export interface Inspection {
  id: string; // uuid de la inspección (viene del servidor)
  establishmentName: string;
  establishmentAddress: string;
  status: InspectionStatus;
  entityVersion: number;
  templateVersionId: string;
  assignedEvaluatorId: string;
  scheduledAt: string; // ISO-8601
  downloadedAt?: string; // cuándo se descargó el paquete offline
  updatedAt: string;
}

export interface BpmTemplateItem {
  id: string; // id técnico del ítem
  parentId: string | null;
  visibleCode: string; // ej. "1.1.1"
  text: string;
  type: "SECTION" | "SUBSECTION" | "ITEM";
  order: number;
  isEvaluable: boolean;
}

export interface BpmTemplate {
  templateVersionId: string;
  publishedAt: string;
  items: BpmTemplateItem[];
}

export interface EvaluationResponse {
  id: string; // `${inspectionId}_${bpmItemId}`
  inspectionId: string;
  bpmItemId: string;
  value: BpmResponseValue | null;
  observation: string;
  entityVersion: number;
  updatedAt: string;
}

export type EvidenceType = "PHOTO" | "DOCUMENT" | "VIDEO";
export type EvidenceStatus =
  | "PENDIENTE"
  | "SUBIENDO"
  | "CONFIRMADA"
  | "RECHAZADA";

export interface Evidence {
  id: string; // uuid local
  inspectionId: string;
  bpmItemId: string | null;
  type: EvidenceType;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  blob: Blob;
  status: EvidenceStatus;
  createdAt: string;
}

export interface InspectionLocation {
  id: string;
  inspectionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export type SyncOperationType =
  | "UPSERT_RESPONSE"
  | "UPLOAD_EVIDENCE"
  | "SUBMIT_INSPECTION";

export type SyncOperationStatus =
  | "PENDIENTE"
  | "ENVIANDO"
  | "CONFIRMADA"
  | "REINTENTABLE"
  | "REQUIERE_AUTENTICACION"
  | "CONFLICTO"
  | "RECHAZADA";

export interface SyncQueueItem {
  operationId: string; // uuid generado en el dispositivo
  type: SyncOperationType;
  inspectionId: string;
  entityVersion: number;
  payload: unknown;
  status: SyncOperationStatus;
  attempts: number;
  order: number;
  createdAt: string;
  lastError?: string;
}

export interface SyncLogEntry {
  id: string;
  operationId: string;
  result: "OK" | "ERROR";
  httpStatus?: number;
  errorCode?: string;
  occurredAt: string;
}

export type UserRole = "TECNICO_EVALUADOR" | "UNIVERSAL";

export interface AuthUser {
  id: string;
  fullName: string;
  role: UserRole;
}
