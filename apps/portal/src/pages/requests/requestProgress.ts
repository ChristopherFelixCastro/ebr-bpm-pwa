import type { CompanyRequest } from '../../api/resources'

export type RequestProgressStatus = NonNullable<CompanyRequest['progressStatus']>

const progressLabels: Record<RequestProgressStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_REVIEW: 'Pendiente de revisión',
  PENDING_ASSIGNMENT: 'Pendiente de asignación',
  ASSIGNED: 'En trámite',
  NO_ACTION: 'Sin acción',
  REFERRED: 'Remitido',
  CLOSED: 'Cerrado',
}

export function requestProgressStatus(request: CompanyRequest): RequestProgressStatus {
  return request.progressStatus ?? request.caseStatus ?? request.status
}

export function requestProgressLabel(request: CompanyRequest): string {
  return progressLabels[requestProgressStatus(request)]
}
