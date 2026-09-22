import { apiClient, unwrap } from './http'
import type { components } from './generated/schema'
import type {
  CoordinatorCase,
  Evaluator,
  Inspection,
  DashboardSummary,
  CreateCaseInput,
  CaseDecisionInput,
  ScheduleInspectionInput,
  RescheduleInspectionInput,
  CancelInspectionInput,
  AssignInspectionInput,
  CaseStatus,
  CaseOrigin,
  CasePriority,
} from './types'

type ApiIntakeCase = components['schemas']['IntakeCase']
type ApiSchedule = components['schemas']['Schedule']

export function mapOriginToCore(origin: CaseOrigin): 'INSTITUTIONAL_PROGRAM' | 'HEALTH_ALERT' | 'COMPLAINT' {
  switch (origin) {
    case 'PROGRAMACION_INSTITUCIONAL':
      return 'INSTITUTIONAL_PROGRAM'
    case 'ALERTA_LAPCH':
      return 'HEALTH_ALERT'
    case 'DENUNCIA':
      return 'COMPLAINT'
    default:
      return 'INSTITUTIONAL_PROGRAM'
  }
}

export function mapCoreOriginToCoordinator(origin: string): CaseOrigin {
  switch (origin) {
    case 'INSTITUTIONAL_PROGRAM':
      return 'PROGRAMACION_INSTITUCIONAL'
    case 'HEALTH_ALERT':
      return 'ALERTA_LAPCH'
    case 'COMPLAINT':
      return 'DENUNCIA'
    case 'COMPANY_REQUEST':
      return 'SOLICITUD_EMPRESA'
    default:
      return 'PROGRAMACION_INSTITUCIONAL'
  }
}

export function mapCoreStatusToCoordinator(status: string): CaseStatus {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'RECIBIDO'
    case 'PENDING_ASSIGNMENT':
      return 'PROCEDE_EVALUACION'
    case 'ASSIGNED':
      return 'PROGRAMADO'
    case 'NO_ACTION':
      return 'NO_PROCEDE'
    case 'REFERRED':
      return 'REMITIDO'
    case 'CLOSED':
      return 'CANCELADO'
    default:
      return 'RECIBIDO'
  }
}

export function mapCorePriorityToCoordinator(priority: string): CasePriority {
  switch (priority) {
    case 'LOW':
      return 'Baja'
    case 'MEDIUM':
      return 'Media'
    case 'HIGH':
      return 'Alta'
    case 'URGENT':
      return 'Urgente'
    default:
      return 'Media'
  }
}

export const coreCoordinatorApi = {
  async getCases(): Promise<CoordinatorCase[]> {
    const [intakeRes, reqsRes] = await Promise.all([
      apiClient.GET('/v1/cases', { params: { query: { limit: 100 } } }),
      apiClient.GET('/v1/company-requests', { params: { query: { limit: 100 } } }).catch(() => ({ data: undefined, error: undefined, response: new Response() })),
    ])

    const result: CoordinatorCase[] = []

    if (intakeRes.data?.data) {
      for (const item of intakeRes.data.data) {
        const source = item.source as Record<string, unknown> | undefined
        result.push({
          id: item.id,
          origin: mapCoreOriginToCoordinator(item.origin),
          companyName: (source?.companyName as string) || 'Empresa registrada',
          establishmentName: (source?.establishmentName as string) || 'Establecimiento principal',
          establishmentAddress: (source?.establishmentAddress as string) || 'Dirección registrada',
          priority: mapCorePriorityToCoordinator(item.priority),
          status: mapCoreStatusToCoordinator(item.status),
          referenceCode: (source?.programReference || source?.alertNumber || source?.complaintType) as string | undefined,
          description: (source?.reason || source?.description || source?.productDescription) as string | undefined,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })
      }
    }

    if (reqsRes?.data?.data) {
      for (const req of reqsRes.data.data) {
        result.push({
          id: req.id,
          origin: 'SOLICITUD_EMPRESA',
          companyName: 'Empresa Solicitante',
          establishmentName: req.establishmentName || 'Establecimiento Solicitante',
          establishmentAddress: 'Dirección registrada',
          priority: 'Media',
          status: req.status === 'PENDING_ASSIGNMENT' ? 'PROCEDE_EVALUACION' : 'RECIBIDO',
          referenceCode: req.requestType,
          description: req.reason,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })
      }
    }

    return result
  },

  async getCaseById(id: string): Promise<CoordinatorCase | undefined> {
    try {
      const res = await apiClient.GET('/v1/cases/{id}', { params: { path: { id } } })
      if (res.data?.data) {
        const item = res.data.data
        const source = item.source as Record<string, unknown> | undefined
        return {
          id: item.id,
          origin: mapCoreOriginToCoordinator(item.origin),
          companyName: (source?.companyName as string) || 'Empresa registrada',
          establishmentName: (source?.establishmentName as string) || 'Establecimiento principal',
          establishmentAddress: (source?.establishmentAddress as string) || 'Dirección registrada',
          priority: mapCorePriorityToCoordinator(item.priority),
          status: mapCoreStatusToCoordinator(item.status),
          referenceCode: source?.programReference || source?.alertNumber || source?.complaintType || undefined,
          description: source?.reason || source?.description || source?.productDescription || undefined,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }
      }
    } catch {
      // Could be a company-request
    }

    try {
      const res = await apiClient.GET('/v1/company-requests/{id}', { params: { path: { id } } })
      if (res.data?.data) {
        const req = res.data.data
        return {
          id: req.id,
          origin: 'SOLICITUD_EMPRESA',
          companyName: 'Empresa Solicitante',
          establishmentName: req.establishmentName || 'Establecimiento Solicitante',
          establishmentAddress: 'Dirección registrada',
          priority: 'Media',
          status: req.status === 'PENDING_ASSIGNMENT' ? 'PROCEDE_EVALUACION' : 'RECIBIDO',
          referenceCode: req.requestType,
          description: req.reason,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        }
      }
    } catch {
      // not found
    }

    return undefined
  },

  async createCase(input: CreateCaseInput): Promise<CoordinatorCase> {
    if (input.origin === 'ALERTA_LAPCH') {
      const res = unwrap<ApiIntakeCase>(
        await apiClient.POST('/v1/health-alerts', {
          body: {
            alertNumber: input.referenceCode || `ALT-${Date.now()}`,
            alertDate: new Date().toISOString().split('T')[0],
            productDescription: input.description || input.establishmentName,
            description: input.description || input.establishmentName,
          },
        })
      )
      return {
        id: res.id,
        origin: 'ALERTA_LAPCH',
        companyName: input.companyName,
        establishmentName: input.establishmentName,
        establishmentAddress: input.establishmentAddress,
        priority: input.priority,
        status: 'RECIBIDO',
        referenceCode: input.referenceCode,
        description: input.description,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
      }
    }

    if (input.origin === 'DENUNCIA') {
      const res = unwrap<ApiIntakeCase>(
        await apiClient.POST('/v1/complaints', {
          body: {
            complaintType: input.referenceCode || 'Denuncia sanitaria',
            receivedAt: new Date().toISOString(),
            description: input.description || input.establishmentName,
          },
        })
      )
      return {
        id: res.id,
        origin: 'DENUNCIA',
        companyName: input.companyName,
        establishmentName: input.establishmentName,
        establishmentAddress: input.establishmentAddress,
        priority: input.priority,
        status: 'RECIBIDO',
        referenceCode: input.referenceCode,
        description: input.description,
        createdAt: res.createdAt,
        updatedAt: res.updatedAt,
      }
    }

    // Default: PROGRAMACION_INSTITUCIONAL
    const res = unwrap<ApiIntakeCase>(
      await apiClient.POST('/v1/institutional-program-cases', {
        body: {
          programReference: input.referenceCode || `PROG-${Date.now()}`,
          plannedDate: new Date().toISOString().split('T')[0],
          reason: input.description || 'Programación institucional',
        },
      })
    )
    return {
      id: res.id,
      origin: 'PROGRAMACION_INSTITUCIONAL',
      companyName: input.companyName,
      establishmentName: input.establishmentName,
      establishmentAddress: input.establishmentAddress,
      priority: input.priority,
      status: 'PROCEDE_EVALUACION',
      referenceCode: input.referenceCode,
      description: input.description,
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
    }
  },

  async registerCaseDecision(input: CaseDecisionInput): Promise<CoordinatorCase> {
    const caseRecord = await this.getCaseById(input.caseId)
    if (!caseRecord) throw new Error('Caso no encontrado.')

    if (caseRecord.origin === 'ALERTA_LAPCH') {
      const decision = input.decision === 'PROCEDE_EVALUACION' ? 'PROCEEDS' : 'NOT_PROCEEDS'
      await apiClient.POST('/v1/health-alerts/{caseId}/decide', {
        params: { path: { caseId: input.caseId } as Record<string, string> },
        body: {
          version: 1,
          decision,
          reason: input.justification,
        },
      })
    } else if (caseRecord.origin === 'DENUNCIA') {
      const decision = input.decision === 'PROCEDE_EVALUACION'
        ? 'PROCEEDS'
        : input.decision === 'REMITIDO'
          ? 'REFERRED'
          : 'NOT_PROCEEDS'

      await apiClient.POST('/v1/complaints/{caseId}/decide', {
        params: { path: { caseId: input.caseId } as Record<string, string> },
        body: {
          version: 1,
          decision,
          decisionReason: decision !== 'REFERRED' ? input.justification : undefined,
          referralReason: decision === 'REFERRED' ? input.justification : undefined,
          referralDestination: decision === 'REFERRED' ? 'Dirección General de Epidemiología' : undefined,
        },
      })
    }

    return {
      ...caseRecord,
      status: input.decision,
      updatedAt: new Date().toISOString(),
    }
  },

  async getEvaluators(): Promise<Evaluator[]> {
    const res = await apiClient.GET('/v1/users', { params: { query: { limit: 100 } } })
    if (!res.data?.data) return []

    return res.data.data
      .filter((u) => u.roleCode === 'EVALUATOR' && u.status === 'APPROVED')
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        available: true,
      }))
  },

  async getInspections(): Promise<Inspection[]> {
    const res = await apiClient.GET('/v1/inspections')
    if (!res.data?.data) return []

    return res.data.data.map((ins) => ({
      id: ins.id,
      caseId: ins.caseId,
      establishmentName: 'Establecimiento inspeccionado',
      establishmentAddress: 'Dirección registrada',
      status: ins.status === 'DRAFT' || ins.status === 'IN_PROGRESS' || ins.status === 'PENDING_SUBMISSION'
        ? 'ASIGNADA'
        : 'PROGRAMADA',
      assignedEvaluatorId: ins.evaluatorUserId,
      templateVersionId: ins.bpmTemplateVersionId,
      conflictAcknowledged: false,
      createdAt: ins.startedAt || new Date().toISOString(),
      updatedAt: ins.submittedAt || new Date().toISOString(),
    }))
  },

  async scheduleInspection(input: ScheduleInspectionInput): Promise<Inspection> {
    // 1. Assign case to evaluator
    await apiClient.POST('/v1/cases/{caseId}/assignments', {
      params: { path: { caseId: input.caseId } },
      body: {
        evaluatorUserId: input.evaluatorId,
        reason: input.conflictComment || 'Asignación de inspección',
      },
    })

    // 2. Schedule inspection
    const scheduleRes = unwrap<ApiSchedule>(
      await apiClient.POST('/v1/cases/{caseId}/schedules', {
        params: { path: { caseId: input.caseId } },
        body: {
          scheduledStartAt: input.scheduledAt,
          scheduledEndAt: input.scheduledEndAt,
          notes: input.conflictComment,
        },
      })
    )

    return {
      id: scheduleRes.id,
      caseId: input.caseId,
      establishmentName: 'Establecimiento programado',
      establishmentAddress: 'Dirección programada',
      status: 'ASIGNADA',
      assignedEvaluatorId: input.evaluatorId,
      scheduledAt: input.scheduledAt,
      scheduledEndAt: input.scheduledEndAt,
      templateVersionId: 'bpm-v1',
      conflictAcknowledged: input.conflictAcknowledged,
      conflictComment: input.conflictComment,
      createdAt: scheduleRes.scheduledStartAt,
      updatedAt: scheduleRes.scheduledStartAt,
    }
  },

  async rescheduleInspection(input: RescheduleInspectionInput): Promise<Inspection> {
    const schedulesRes = await apiClient.GET('/v1/schedules', {
      params: { query: { limit: 100 } },
    })

    const targetSchedule = schedulesRes.data?.data?.find(
      (s) => s.id === input.inspectionId || s.caseId === input.inspectionId
    )

    if (targetSchedule) {
      await apiClient.POST('/v1/cases/{caseId}/schedules/{scheduleId}/reschedule', {
        params: { path: { caseId: targetSchedule.caseId, scheduleId: targetSchedule.id } },
        body: {
          version: targetSchedule.version,
          scheduledStartAt: input.scheduledAt,
          scheduledEndAt: input.scheduledEndAt,
          reason: input.reason,
          notes: input.conflictComment,
        },
      })
    }

    return {
      id: input.inspectionId,
      caseId: targetSchedule?.caseId || input.inspectionId,
      establishmentName: 'Establecimiento',
      establishmentAddress: 'Dirección',
      status: 'PROGRAMADA',
      scheduledAt: input.scheduledAt,
      scheduledEndAt: input.scheduledEndAt,
      templateVersionId: 'bpm-v1',
      conflictAcknowledged: input.conflictAcknowledged,
      conflictComment: input.conflictComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  async cancelInspection(input: CancelInspectionInput): Promise<Inspection> {
    const schedulesRes = await apiClient.GET('/v1/schedules', {
      params: { query: { limit: 100 } },
    })

    const targetSchedule = schedulesRes.data?.data?.find(
      (s) => s.id === input.inspectionId || s.caseId === input.inspectionId
    )

    if (targetSchedule) {
      await apiClient.POST('/v1/cases/{caseId}/schedules/{scheduleId}/cancel', {
        params: { path: { caseId: targetSchedule.caseId, scheduleId: targetSchedule.id } },
        body: {
          version: targetSchedule.version,
          reason: input.reason,
        },
      })
    }

    return {
      id: input.inspectionId,
      caseId: targetSchedule?.caseId || input.inspectionId,
      establishmentName: 'Establecimiento',
      establishmentAddress: 'Dirección',
      status: 'CANCELADA',
      cancellationReason: input.reason,
      cancelledAt: new Date().toISOString(),
      templateVersionId: 'bpm-v1',
      conflictAcknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  async updateAssignment(input: AssignInspectionInput): Promise<Inspection> {
    const assignmentsRes = await apiClient.GET('/v1/assignments', {
      params: { query: { active: true, limit: 100 } },
    })

    const activeAsg = assignmentsRes.data?.data?.find(
      (a) => a.id === input.inspectionId || a.caseId === input.inspectionId
    )

    if (activeAsg) {
      await apiClient.POST('/v1/cases/{caseId}/reassign', {
        params: { path: { caseId: activeAsg.caseId } },
        body: {
          newEvaluatorUserId: input.evaluatorId,
          currentAssignmentVersion: activeAsg.version,
          reason: input.reason || 'Reasignación por coordinación',
        },
      })
    }

    return {
      id: input.inspectionId,
      caseId: activeAsg?.caseId || input.inspectionId,
      establishmentName: 'Establecimiento',
      establishmentAddress: 'Dirección',
      status: 'ASIGNADA',
      assignedEvaluatorId: input.evaluatorId,
      templateVersionId: 'bpm-v1',
      conflictAcknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  async getDashboard(): Promise<DashboardSummary> {
    const [casesRes, inspectionsRes] = await Promise.all([
      apiClient.GET('/v1/cases', { params: { query: { limit: 100 } } }),
      apiClient.GET('/v1/inspections'),
    ])

    const cases = casesRes.data?.data || []
    const inspections = inspectionsRes.data?.data || []

    const pendingCases = cases.filter(
      (c) => c.status === 'PENDING_REVIEW' || c.status === 'PENDING_ASSIGNMENT'
    ).length

    const scheduledInspections = inspections.filter(
      (i) => i.status === 'DRAFT' || i.status === 'IN_PROGRESS' || i.status === 'PENDING_SUBMISSION'
    ).length

    const urgentCases = cases.filter((c) => c.priority === 'HIGH').length

    return {
      pendingCases,
      scheduledInspections,
      urgentCases,
      unassignedInspections: 0,
    }
  },
}
