export type CaseOrigin =
  | 'SOLICITUD_EMPRESA'
  | 'PROGRAMACION_INSTITUCIONAL'
  | 'ALERTA_LAPCH'
  | 'DENUNCIA'

export type CaseStatus =
  | 'RECIBIDO'
  | 'EN_ANALISIS'
  | 'PROCEDE_EVALUACION'
  | 'PROGRAMADO'
  | 'NO_PROCEDE'
  | 'REMITIDO'
  | 'CANCELADO'

export type CasePriority =
  | 'Baja'
  | 'Media'
  | 'Alta'
  | 'Urgente'

export type InspectionStatus =
  | 'PROGRAMADA'
  | 'ASIGNADA'
  | 'CANCELADA'

export type AssignmentAction =
  | 'ASIGNACION'
  | 'REASIGNACION'

export type ScheduleAction =
  | 'PROGRAMACION'
  | 'REPROGRAMACION'
  | 'CANCELACION'

export type CaseDecisionAction =
  | 'PROCEDE_EVALUACION'
  | 'NO_PROCEDE'
  | 'REMITIDO'

export interface CoordinatorCase {
  id: string
  origin: CaseOrigin
  companyName: string
  establishmentName: string
  establishmentAddress: string
  priority: CasePriority
  status: CaseStatus
  referenceCode?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCaseInput {
  origin: CaseOrigin
  companyName: string
  establishmentName: string
  establishmentAddress: string
  priority: CasePriority
  referenceCode?: string
  description?: string
}

export interface CaseDecisionInput {
  caseId: string
  decision: CaseDecisionAction
  justification: string
}

export interface CaseDecisionHistory {
  id: string
  caseId: string
  previousStatus: CaseStatus
  decision: CaseDecisionAction
  justification: string
  createdAt: string
}

export interface Evaluator {
  id: string
  fullName: string
  available: boolean
}

export interface Inspection {
  id: string
  caseId: string
  establishmentName: string
  establishmentAddress: string
  status: InspectionStatus
  assignedEvaluatorId?: string
  scheduledAt?: string
  scheduledEndAt?: string
  templateVersionId: string
  conflictAcknowledged: boolean
  conflictComment?: string
  cancellationReason?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduleInspectionInput {
  caseId: string
  evaluatorId: string
  scheduledAt: string
  scheduledEndAt: string
  conflictAcknowledged: boolean
  conflictComment?: string
}

export interface RescheduleInspectionInput {
  inspectionId: string
  scheduledAt: string
  scheduledEndAt: string
  reason: string
  conflictAcknowledged: boolean
  conflictComment?: string
}

export interface CancelInspectionInput {
  inspectionId: string
  reason: string
}

export interface ScheduleConflict {
  inspectionId: string
  evaluatorId: string
  scheduledAt: string
  scheduledEndAt: string
  establishmentName: string
}

export interface AssignmentHistory {
  id: string
  inspectionId: string
  action: AssignmentAction
  previousEvaluatorId?: string
  evaluatorId: string
  reason?: string
  createdAt: string
}

export interface AssignInspectionInput {
  inspectionId: string
  evaluatorId: string
  reason?: string
}

export interface ScheduleHistory {
  id: string
  inspectionId: string
  action: ScheduleAction
  previousScheduledAt?: string
  previousScheduledEndAt?: string
  scheduledAt?: string
  scheduledEndAt?: string
  reason?: string
  conflictAcknowledged: boolean
  conflictComment?: string
  createdAt: string
}

export interface DashboardSummary {
  pendingCases: number
  scheduledInspections: number
  urgentCases: number
  unassignedInspections: number
}