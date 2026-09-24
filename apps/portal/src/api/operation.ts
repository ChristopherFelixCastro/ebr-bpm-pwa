import { core } from './core'

export type CaseOrigin = 'COMPANY_REQUEST' | 'INSTITUTIONAL_PROGRAM' | 'HEALTH_ALERT' | 'COMPLAINT'
export type CaseStatus = 'PENDING_REVIEW' | 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'NO_ACTION' | 'REFERRED' | 'CLOSED'
export type OperationalCase = {
  id: string; origin: CaseOrigin; status: CaseStatus; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  companyId: string | null; establishmentId: string | null; version: number; createdAt: string; updatedAt: string;
  source: { version: number; requestId?: string; requestType?: string; establishmentName?: string; reason?: string | null; observations?: string | null; programReference?: string | null; plannedDate?: string | null; alertNumber?: string; alertDate?: string; productDescription?: string; description?: string; complaintType?: string; receivedAt?: string; isAnonymous?: boolean; hasComplainantContact?: boolean; complainantData?: { fullName?: string; phone?: string; email?: string; preferredContactMethod: 'PHONE' | 'EMAIL' | 'NONE' } | null; decision?: string; decisionReason?: string | null; referralReason?: string | null; referralDestination?: string | null; decidedAt?: string | null }
}
export type Evaluator = { id: string; fullName: string }
export type Assignment = { id: string; caseId: string; evaluator: Evaluator; assignedBy: Evaluator; assignedAt: string; unassignedAt: string | null; isActive: boolean; hasEditableInspection: boolean; reason: string | null; version: number; case: { origin: CaseOrigin; status: CaseStatus; priority: string; companyId: string | null; establishmentId: string | null } }
export type Schedule = { id: string; caseId: string; assignmentId: string; evaluator: Evaluator; scheduledStartAt: string; scheduledEndAt: string; timezone: string; status: 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED'; notes: string | null; cancellationReason: string | null; cancelledAt: string | null; rescheduledFromScheduleId: string | null; version: number }
export type OperationWarning = { code: 'EVALUATOR_SCHEDULE_OVERLAP'; conflictingScheduleIds: string[] }
export type PageQuery = { page: number; limit: number; search?: string; origin?: CaseOrigin; status?: CaseStatus }
const query = (values: object) => { const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) }); return `?${params}` }
const path = (id: string) => encodeURIComponent(id)
const get = async <T,>(url: string) => (await core.request<T>(url, { cache: 'no-store' })).data
const page = <T,>(url: string) => core.request<T[]>(url, { cache: 'no-store' })
const post = async <T,>(url: string, body: unknown) => core.request<T>(url, { method: 'POST', body: JSON.stringify(body) })
const patch = async <T,>(url: string, body: unknown) => (await core.request<T>(url, { method: 'PATCH', body: JSON.stringify(body) })).data

export const operationApi = {
  cases: (values: PageQuery) => page<OperationalCase>(`/v1/cases${query(values)}`),
  case: (id: string) => get<OperationalCase>(`/v1/cases/${path(id)}`),
  createProgram: (body: { companyId?: string; establishmentId?: string; programReference?: string | null; plannedDate?: string | null; reason: string; observations?: string | null }) => post<OperationalCase>('/v1/institutional-program-cases', body),
  updateProgram: (id: string, body: { version: number; programReference?: string | null; plannedDate?: string | null; reason?: string; observations?: string | null }) => patch<OperationalCase>(`/v1/institutional-program-cases/${path(id)}`, body),
  createAlert: (body: { companyId?: string; establishmentId?: string; alertNumber: string; alertDate: string; productDescription: string; description: string }) => post<OperationalCase>('/v1/health-alerts', body),
  updateAlert: (id: string, body: { version: number; alertNumber?: string; alertDate?: string; productDescription?: string; description?: string }) => patch<OperationalCase>(`/v1/health-alerts/${path(id)}`, body),
  decideAlert: (id: string, body: { version: number; decision: 'PROCEEDS' | 'NOT_PROCEEDS'; reason?: string }) => post<OperationalCase>(`/v1/health-alerts/${path(id)}/decide`, body),
  createComplaint: (body: { companyId?: string; establishmentId?: string; complaintType: string; receivedAt: string; description: string; complainantData?: { fullName?: string; phone?: string; email?: string; preferredContactMethod: 'PHONE' | 'EMAIL' | 'NONE' } }) => post<OperationalCase>('/v1/complaints', body),
  updateComplaint: (id: string, body: { version: number; complaintType?: string; receivedAt?: string; description?: string }) => patch<OperationalCase>(`/v1/complaints/${path(id)}`, body),
  decideComplaint: (id: string, body: { version: number; decision: 'PROCEEDS' | 'NOT_PROCEEDS' | 'REFERRED'; decisionReason?: string; referralReason?: string; referralDestination?: string }) => post<OperationalCase>(`/v1/complaints/${path(id)}/decide`, body),
  evaluators: (values: { page: number; limit: number; search?: string }) => page<Evaluator>(`/v1/assignable-evaluators${query(values)}`),
  assignments: (values: { page: number; limit: number; active?: boolean; caseId?: string; origin?: CaseOrigin }) => page<Assignment>(`/v1/assignments${query(values)}`),
  caseAssignments: (caseId: string, values: { page: number; limit: number; active?: boolean }) => page<Assignment>(`/v1/cases/${path(caseId)}/assignments${query(values)}`),
  assign: (caseId: string, body: { evaluatorUserId: string; reason?: string }) => post<Assignment>(`/v1/cases/${path(caseId)}/assignments`, body),
  reassign: (caseId: string, body: { newEvaluatorUserId: string; currentAssignmentVersion: number; reason: string }) => post<{ assignment: Assignment; schedule: { previous: Schedule; current: Schedule } | null }>(`/v1/cases/${path(caseId)}/reassign`, body),
  schedules: (values: { page: number; limit: number; status?: Schedule['status']; caseId?: string; startFrom?: string; startTo?: string }) => page<Schedule>(`/v1/schedules${query(values)}`),
  caseSchedules: (caseId: string, values: { page: number; limit: number; status?: Schedule['status'] }) => page<Schedule>(`/v1/cases/${path(caseId)}/schedules${query(values)}`),
  schedule: (caseId: string, body: { scheduledStartAt: string; scheduledEndAt: string; notes?: string }) => post<Schedule>(`/v1/cases/${path(caseId)}/schedules`, body),
  reschedule: (caseId: string, scheduleId: string, body: { version: number; scheduledStartAt: string; scheduledEndAt: string; reason: string; notes?: string }) => post<{ previous: Schedule; current: Schedule }>(`/v1/cases/${path(caseId)}/schedules/${path(scheduleId)}/reschedule`, body),
  cancelSchedule: (caseId: string, scheduleId: string, body: { version: number; reason: string }) => post<Schedule>(`/v1/cases/${path(caseId)}/schedules/${path(scheduleId)}/cancel`, body),
}
