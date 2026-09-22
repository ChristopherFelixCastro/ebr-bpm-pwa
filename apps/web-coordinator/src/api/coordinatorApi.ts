import {
  MOCK_CASES,
  MOCK_EVALUATORS,
  MOCK_INSPECTIONS,
} from './mockData'

import type {
  AssignInspectionInput,
  AssignmentHistory,
  CancelInspectionInput,
  CaseDecisionHistory,
  CaseDecisionInput,
  CaseStatus,
  CoordinatorCase,
  CreateCaseInput,
  DashboardSummary,
  Evaluator,
  Inspection,
  RescheduleInspectionInput,
  ScheduleConflict,
  ScheduleHistory,
  ScheduleInspectionInput,
} from './types'
import { hasAccessToken } from './http'
import { coreCoordinatorApi } from './coreCoordinatorApi'

const delay = (ms = 250) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const shouldUseCoreApi = () =>
  hasAccessToken() && !import.meta.env.VITE_USE_MOCK

let cases: CoordinatorCase[] = [...MOCK_CASES]

let inspections: Inspection[] = [
  ...MOCK_INSPECTIONS,
]

let caseDecisionHistory: CaseDecisionHistory[] = []

let assignmentHistory: AssignmentHistory[] =
  MOCK_INSPECTIONS
    .filter((inspection) =>
      Boolean(inspection.assignedEvaluatorId),
    )
    .map((inspection, index) => ({
      id: `ASG-${String(index + 1).padStart(3, '0')}`,
      inspectionId: inspection.id,
      action: 'ASIGNACION',
      evaluatorId:
        inspection.assignedEvaluatorId ?? '',
      reason: 'Asignación inicial',
      createdAt: inspection.createdAt,
    }))

let scheduleHistory: ScheduleHistory[] =
  MOCK_INSPECTIONS
    .filter(
      (inspection) =>
        inspection.scheduledAt &&
        inspection.scheduledEndAt,
    )
    .map((inspection, index) => ({
      id: `SCH-${String(index + 1).padStart(3, '0')}`,
      inspectionId: inspection.id,
      action: 'PROGRAMACION',
      scheduledAt: inspection.scheduledAt,
      scheduledEndAt:
        inspection.scheduledEndAt,
      conflictAcknowledged:
        inspection.conflictAcknowledged,
      conflictComment:
        inspection.conflictComment,
      createdAt: inspection.createdAt,
    }))

function generateCaseId(): string {
  const numbers = cases
    .map((caseData) => {
      const match = caseData.id.match(/\d+/)

      return match
        ? Number(match[0])
        : Number.NaN
    })
    .filter(
      (number) => !Number.isNaN(number),
    )

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `CAS-${String(nextNumber).padStart(3, '0')}`
}

function generateInspectionId(): string {
  const numbers = inspections
    .map((inspection) =>
      Number(
        inspection.id.replace('INS-', ''),
      ),
    )
    .filter(
      (number) => !Number.isNaN(number),
    )

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `INS-${String(nextNumber).padStart(3, '0')}`
}

function generateDecisionHistoryId(): string {
  const numbers = caseDecisionHistory
    .map((record) =>
      Number(
        record.id.replace('DEC-', ''),
      ),
    )
    .filter(
      (number) => !Number.isNaN(number),
    )

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `DEC-${String(nextNumber).padStart(3, '0')}`
}

function generateAssignmentId(): string {
  const numbers = assignmentHistory
    .map((assignment) =>
      Number(
        assignment.id.replace('ASG-', ''),
      ),
    )
    .filter(
      (number) => !Number.isNaN(number),
    )

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `ASG-${String(nextNumber).padStart(3, '0')}`
}

function generateScheduleHistoryId(): string {
  const numbers = scheduleHistory
    .map((record) =>
      Number(
        record.id.replace('SCH-', ''),
      ),
    )
    .filter(
      (number) => !Number.isNaN(number),
    )

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `SCH-${String(nextNumber).padStart(3, '0')}`
}

function validateDateRange(
  scheduledAt: string,
  scheduledEndAt: string,
) {
  const start =
    new Date(scheduledAt).getTime()

  const end =
    new Date(scheduledEndAt).getTime()

  if (
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    throw new Error(
      'La fecha y hora seleccionadas no son válidas.',
    )
  }

  if (end <= start) {
    throw new Error(
      'La hora de finalización debe ser posterior a la hora de inicio.',
    )
  }
}

function findConflicts(
  evaluatorId: string,
  scheduledAt: string,
  scheduledEndAt: string,
  ignoredInspectionId?: string,
): ScheduleConflict[] {
  const newStart =
    new Date(scheduledAt).getTime()

  const newEnd =
    new Date(scheduledEndAt).getTime()

  return inspections
    .filter((inspection) => {
      if (
        inspection.id ===
        ignoredInspectionId
      ) {
        return false
      }

      if (
        inspection.status === 'CANCELADA'
      ) {
        return false
      }

      if (
        inspection.assignedEvaluatorId !==
        evaluatorId
      ) {
        return false
      }

      if (
        !inspection.scheduledAt ||
        !inspection.scheduledEndAt
      ) {
        return false
      }

      const existingStart =
        new Date(
          inspection.scheduledAt,
        ).getTime()

      const existingEnd =
        new Date(
          inspection.scheduledEndAt,
        ).getTime()

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      )
    })
    .map((inspection) => ({
      inspectionId: inspection.id,
      evaluatorId:
        inspection.assignedEvaluatorId ?? '',
      scheduledAt:
        inspection.scheduledAt ?? '',
      scheduledEndAt:
        inspection.scheduledEndAt ?? '',
      establishmentName:
        inspection.establishmentName,
    }))
}

export const coordinatorApi = {
  async getCases(): Promise<
    CoordinatorCase[]
  > {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.getCases()
    }

    await delay()

    return [...cases]
  },

  async createCase(
    input: CreateCaseInput,
  ): Promise<CoordinatorCase> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.createCase(input)
    }

    await delay()

    if (!input.companyName.trim()) {
      throw new Error(
        'Debes indicar la empresa o razón social.',
      )
    }

    if (!input.establishmentName.trim()) {
      throw new Error(
        'Debes indicar el establecimiento.',
      )
    }

    if (!input.establishmentAddress.trim()) {
      throw new Error(
        'Debes indicar la dirección del establecimiento.',
      )
    }

    const now =
      new Date().toISOString()

    const newCase: CoordinatorCase = {
      id: generateCaseId(),
      origin: input.origin,
      companyName:
        input.companyName.trim(),
      establishmentName:
        input.establishmentName.trim(),
      establishmentAddress:
        input.establishmentAddress.trim(),
      priority: input.priority,
      status: 'RECIBIDO',
      referenceCode:
        input.referenceCode?.trim() ||
        undefined,
      description:
        input.description?.trim() ||
        undefined,
      createdAt: now,
      updatedAt: now,
    }

    cases = [
      newCase,
      ...cases,
    ]

    return newCase
  },

  async getCaseById(
    id: string,
  ): Promise<
    CoordinatorCase | undefined
  > {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.getCaseById(id)
    }

    await delay()

    return cases.find(
      (item) => item.id === id,
    )
  },

  async updateCaseStatus(
    id: string,
    status: CaseStatus,
  ): Promise<CoordinatorCase> {
    await delay()

    const caseIndex =
      cases.findIndex(
        (item) => item.id === id,
      )

    if (caseIndex === -1) {
      throw new Error(
        'Caso no encontrado.',
      )
    }

    const updatedCase: CoordinatorCase = {
      ...cases[caseIndex],
      status,
      updatedAt:
        new Date().toISOString(),
    }

    cases = cases.map((item) =>
      item.id === id
        ? updatedCase
        : item,
    )

    return updatedCase
  },

  async registerCaseDecision(
    input: CaseDecisionInput,
  ): Promise<CoordinatorCase> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.registerCaseDecision(input)
    }

    await delay()

    const caseIndex =
      cases.findIndex(
        (item) =>
          item.id === input.caseId,
      )

    if (caseIndex === -1) {
      throw new Error(
        'Caso no encontrado.',
      )
    }

    if (!input.justification.trim()) {
      throw new Error(
        'Debes indicar una justificación para la decisión.',
      )
    }

    const currentCase =
      cases[caseIndex]

    if (
      currentCase.status === 'PROGRAMADO' ||
      currentCase.status === 'CANCELADO'
    ) {
      throw new Error(
        'El estado actual del caso no permite registrar una nueva decisión.',
      )
    }

    const now =
      new Date().toISOString()

    const updatedCase: CoordinatorCase = {
      ...currentCase,
      status: input.decision,
      updatedAt: now,
    }

    cases = cases.map((item) =>
      item.id === input.caseId
        ? updatedCase
        : item,
    )

    caseDecisionHistory = [
      ...caseDecisionHistory,
      {
        id: generateDecisionHistoryId(),
        caseId: input.caseId,
        previousStatus:
          currentCase.status,
        decision: input.decision,
        justification:
          input.justification.trim(),
        createdAt: now,
      },
    ]

    return updatedCase
  },

  async getCaseDecisionHistory(
    caseId?: string,
  ): Promise<CaseDecisionHistory[]> {
    await delay()

    const result = caseId
      ? caseDecisionHistory.filter(
          (record) =>
            record.caseId === caseId,
        )
      : caseDecisionHistory

    return [...result].sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
  },

  async getEvaluators(): Promise<
    Evaluator[]
  > {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.getEvaluators()
    }

    await delay()

    return [...MOCK_EVALUATORS]
  },

  async getInspections(): Promise<
    Inspection[]
  > {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.getInspections()
    }

    await delay()

    return [...inspections]
  },

  async getInspectionById(
    inspectionId: string,
  ): Promise<
    Inspection | undefined
  > {
    await delay()

    return inspections.find(
      (inspection) =>
        inspection.id ===
        inspectionId,
    )
  },

  async getSchedulableCases(): Promise<
    CoordinatorCase[]
  > {
    if (shouldUseCoreApi()) {
      const allCases = await coreCoordinatorApi.getCases()
      return allCases.filter((item) => item.status === 'PROCEDE_EVALUACION')
    }

    await delay()

    return cases.filter(
      (item) =>
        item.status ===
        'PROCEDE_EVALUACION',
    )
  },

  async checkScheduleConflicts(
    evaluatorId: string,
    scheduledAt: string,
    scheduledEndAt: string,
    ignoredInspectionId?: string,
  ): Promise<ScheduleConflict[]> {
    await delay(150)

    return findConflicts(
      evaluatorId,
      scheduledAt,
      scheduledEndAt,
      ignoredInspectionId,
    )
  },

  async scheduleInspection(
    input: ScheduleInspectionInput,
  ): Promise<Inspection> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.scheduleInspection(input)
    }

    await delay()

    const caseData = cases.find(
      (item) =>
        item.id === input.caseId,
    )

    if (!caseData) {
      throw new Error(
        'Caso no encontrado.',
      )
    }

    if (
      caseData.status !==
      'PROCEDE_EVALUACION'
    ) {
      throw new Error(
        'El caso debe estar en estado Procede evaluación para ser programado.',
      )
    }

    const evaluator =
      MOCK_EVALUATORS.find(
        (item) =>
          item.id ===
          input.evaluatorId,
      )

    if (!evaluator) {
      throw new Error(
        'Técnico no encontrado.',
      )
    }

    validateDateRange(
      input.scheduledAt,
      input.scheduledEndAt,
    )

    const existingInspection =
      inspections.find(
        (inspection) =>
          inspection.caseId ===
            input.caseId &&
          inspection.status !==
            'CANCELADA',
      )

    if (existingInspection) {
      throw new Error(
        'Este caso ya tiene una inspección activa.',
      )
    }

    const conflicts =
      findConflicts(
        input.evaluatorId,
        input.scheduledAt,
        input.scheduledEndAt,
      )

    if (
      conflicts.length > 0 &&
      !input.conflictAcknowledged
    ) {
      throw new Error(
        'Existe un conflicto de horario que debe ser confirmado.',
      )
    }

    if (
      conflicts.length > 0 &&
      !input.conflictComment?.trim()
    ) {
      throw new Error(
        'Debes indicar un comentario para justificar el conflicto.',
      )
    }

    const now =
      new Date().toISOString()

    const newInspection: Inspection = {
      id: generateInspectionId(),
      caseId: caseData.id,
      establishmentName:
        caseData.establishmentName,
      establishmentAddress:
        caseData.establishmentAddress,
      status: 'ASIGNADA',
      assignedEvaluatorId:
        input.evaluatorId,
      scheduledAt:
        input.scheduledAt,
      scheduledEndAt:
        input.scheduledEndAt,
      templateVersionId:
        'bpm-2024-10',
      conflictAcknowledged:
        input.conflictAcknowledged,
      conflictComment:
        input.conflictComment?.trim() ||
        undefined,
      createdAt: now,
      updatedAt: now,
    }

    inspections = [
      ...inspections,
      newInspection,
    ]

    assignmentHistory = [
      ...assignmentHistory,
      {
        id: generateAssignmentId(),
        inspectionId:
          newInspection.id,
        action: 'ASIGNACION',
        evaluatorId:
          input.evaluatorId,
        reason:
          'Asignación al programar la inspección',
        createdAt: now,
      },
    ]

    scheduleHistory = [
      ...scheduleHistory,
      {
        id: generateScheduleHistoryId(),
        inspectionId:
          newInspection.id,
        action: 'PROGRAMACION',
        scheduledAt:
          input.scheduledAt,
        scheduledEndAt:
          input.scheduledEndAt,
        conflictAcknowledged:
          input.conflictAcknowledged,
        conflictComment:
          input.conflictComment?.trim() ||
          undefined,
        createdAt: now,
      },
    ]

    cases = cases.map((item) =>
      item.id === caseData.id
        ? {
            ...item,
            status: 'PROGRAMADO',
            updatedAt: now,
          }
        : item,
    )

    return newInspection
  },

  async rescheduleInspection(
    input: RescheduleInspectionInput,
  ): Promise<Inspection> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.rescheduleInspection(input)
    }

    await delay()

    const inspection =
      inspections.find(
        (item) =>
          item.id ===
          input.inspectionId,
      )

    if (!inspection) {
      throw new Error(
        'Inspección no encontrada.',
      )
    }

    if (
      inspection.status ===
      'CANCELADA'
    ) {
      throw new Error(
        'No puedes reprogramar una inspección cancelada.',
      )
    }

    if (
      !inspection.assignedEvaluatorId
    ) {
      throw new Error(
        'La inspección debe tener un técnico asignado antes de reprogramarse.',
      )
    }

    if (!input.reason.trim()) {
      throw new Error(
        'Debes indicar el motivo de la reprogramación.',
      )
    }

    validateDateRange(
      input.scheduledAt,
      input.scheduledEndAt,
    )

    const conflicts =
      findConflicts(
        inspection.assignedEvaluatorId,
        input.scheduledAt,
        input.scheduledEndAt,
        inspection.id,
      )

    if (
      conflicts.length > 0 &&
      !input.conflictAcknowledged
    ) {
      throw new Error(
        'Existe un conflicto de horario que debe ser confirmado.',
      )
    }

    if (
      conflicts.length > 0 &&
      !input.conflictComment?.trim()
    ) {
      throw new Error(
        'Debes indicar un comentario para justificar el conflicto.',
      )
    }

    const now =
      new Date().toISOString()

    const previousScheduledAt =
      inspection.scheduledAt

    const previousScheduledEndAt =
      inspection.scheduledEndAt

    const updatedInspection: Inspection = {
      ...inspection,
      scheduledAt:
        input.scheduledAt,
      scheduledEndAt:
        input.scheduledEndAt,
      conflictAcknowledged:
        input.conflictAcknowledged,
      conflictComment:
        input.conflictComment?.trim() ||
        undefined,
      updatedAt: now,
    }

    inspections =
      inspections.map((item) =>
        item.id ===
        input.inspectionId
          ? updatedInspection
          : item,
      )

    scheduleHistory = [
      ...scheduleHistory,
      {
        id: generateScheduleHistoryId(),
        inspectionId:
          input.inspectionId,
        action: 'REPROGRAMACION',
        previousScheduledAt,
        previousScheduledEndAt,
        scheduledAt:
          input.scheduledAt,
        scheduledEndAt:
          input.scheduledEndAt,
        reason:
          input.reason.trim(),
        conflictAcknowledged:
          input.conflictAcknowledged,
        conflictComment:
          input.conflictComment?.trim() ||
          undefined,
        createdAt: now,
      },
    ]

    return updatedInspection
  },

  async cancelInspection(
    input: CancelInspectionInput,
  ): Promise<Inspection> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.cancelInspection(input)
    }

    await delay()

    const inspection =
      inspections.find(
        (item) =>
          item.id ===
          input.inspectionId,
      )

    if (!inspection) {
      throw new Error(
        'Inspección no encontrada.',
      )
    }

    if (
      inspection.status ===
      'CANCELADA'
    ) {
      throw new Error(
        'La inspección ya está cancelada.',
      )
    }

    if (!input.reason.trim()) {
      throw new Error(
        'Debes indicar el motivo de la cancelación.',
      )
    }

    const now =
      new Date().toISOString()

    const updatedInspection: Inspection = {
      ...inspection,
      status: 'CANCELADA',
      cancellationReason:
        input.reason.trim(),
      cancelledAt: now,
      updatedAt: now,
    }

    inspections =
      inspections.map((item) =>
        item.id ===
        input.inspectionId
          ? updatedInspection
          : item,
      )

    scheduleHistory = [
      ...scheduleHistory,
      {
        id: generateScheduleHistoryId(),
        inspectionId:
          input.inspectionId,
        action: 'CANCELACION',
        previousScheduledAt: inspection.scheduledAt,
        previousScheduledEndAt: inspection.scheduledEndAt,
        reason:
          input.reason.trim(),
        conflictAcknowledged: false,
        createdAt: now,
      },
    ]

    cases = cases.map((item) =>
      item.id === inspection.caseId
        ? {
            ...item,
            status: 'CANCELADO',
            updatedAt: now,
          }
        : item,
    )

    return updatedInspection
  },

  async getScheduleHistory(
    inspectionId?: string,
  ): Promise<
    ScheduleHistory[]
  > {
    await delay()

    const result = inspectionId
      ? scheduleHistory.filter(
          (item) =>
            item.inspectionId ===
            inspectionId,
        )
      : scheduleHistory

    return [...result].sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
  },

  async assignInspection(
    inspectionId: string,
    evaluatorId: string,
  ): Promise<Inspection> {
    return coordinatorApi.updateAssignment({
      inspectionId,
      evaluatorId,
      reason:
        'Asignación manual',
    })
  },

  async updateAssignment(
    input: AssignInspectionInput,
  ): Promise<Inspection> {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.updateAssignment(input)
    }

    await delay()

    const inspection =
      inspections.find(
        (item) =>
          item.id ===
          input.inspectionId,
      )

    if (!inspection) {
      throw new Error(
        'Inspección no encontrada.',
      )
    }

    if (
      inspection.status ===
      'CANCELADA'
    ) {
      throw new Error(
        'No puedes asignar una inspección cancelada.',
      )
    }

    const evaluator =
      MOCK_EVALUATORS.find(
        (item) =>
          item.id ===
          input.evaluatorId,
      )

    if (!evaluator) {
      throw new Error(
        'Técnico no encontrado.',
      )
    }

    const previousEvaluatorId =
      inspection.assignedEvaluatorId

    if (
      previousEvaluatorId ===
      input.evaluatorId
    ) {
      throw new Error(
        'El técnico seleccionado ya está asignado a esta inspección.',
      )
    }

    if (
      previousEvaluatorId &&
      !input.reason?.trim()
    ) {
      throw new Error(
        'Debes indicar el motivo de la reasignación.',
      )
    }

    const now =
      new Date().toISOString()

    const updatedInspection: Inspection = {
      ...inspection,
      assignedEvaluatorId:
        input.evaluatorId,
      status: 'ASIGNADA',
      updatedAt: now,
    }

    inspections =
      inspections.map((item) =>
        item.id ===
        input.inspectionId
          ? updatedInspection
          : item,
      )

    assignmentHistory = [
      ...assignmentHistory,
      {
        id: generateAssignmentId(),
        inspectionId:
          input.inspectionId,
        action:
          previousEvaluatorId
            ? 'REASIGNACION'
            : 'ASIGNACION',
        previousEvaluatorId,
        evaluatorId:
          input.evaluatorId,
        reason:
          input.reason?.trim() ||
          'Asignación inicial',
        createdAt: now,
      },
    ]

    return updatedInspection
  },

  async getAssignmentHistory(
    inspectionId?: string,
  ): Promise<
    AssignmentHistory[]
  > {
    await delay()

    const result = inspectionId
      ? assignmentHistory.filter(
          (item) =>
            item.inspectionId ===
            inspectionId,
        )
      : assignmentHistory

    return [...result].sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
  },

  async getDashboard(): Promise<
    DashboardSummary
  > {
    if (shouldUseCoreApi()) {
      return coreCoordinatorApi.getDashboard()
    }

    await delay()

    const pendingCases =
      cases.filter(
        (item) =>
          item.status ===
            'RECIBIDO' ||
          item.status ===
            'EN_ANALISIS' ||
          item.status ===
            'PROCEDE_EVALUACION',
      ).length

    const scheduledInspections =
      inspections.filter(
        (item) =>
          item.status ===
            'PROGRAMADA' ||
          item.status ===
            'ASIGNADA',
      ).length

    const urgentCases =
      cases.filter(
        (item) =>
          item.priority ===
          'Urgente',
      ).length

    const unassignedInspections =
      inspections.filter(
        (item) =>
          item.status !==
            'CANCELADA' &&
          !item.assignedEvaluatorId,
      ).length

    return {
      pendingCases,
      scheduledInspections,
      urgentCases,
      unassignedInspections,
    }
  },
}