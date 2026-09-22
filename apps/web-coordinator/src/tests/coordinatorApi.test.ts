import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

async function getApi() {
  const module = await import(
    '../api/coordinatorApi'
  )

  return module.coordinatorApi
}

beforeEach(() => {
  vi.resetModules()
})

describe('Coordinator API - casos y decisiones', () => {
  it('crea un caso y registra la decisión PROCEDE_EVALUACION', async () => {
    const api = await getApi()

    const createdCase =
      await api.createCase({
        origin: 'ALERTA_LAPCH',
        companyName: 'Empresa Test',
        establishmentName:
          'Establecimiento Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Alta',
        referenceCode: 'TEST-001',
        description:
          'Caso creado por prueba automatizada.',
      })

    expect(createdCase.status).toBe(
      'RECIBIDO',
    )

    const updatedCase =
      await api.registerCaseDecision({
        caseId: createdCase.id,
        decision:
          'PROCEDE_EVALUACION',
        justification:
          'El caso cumple con los criterios para evaluación.',
      })

    expect(updatedCase.status).toBe(
      'PROCEDE_EVALUACION',
    )

    const history =
      await api.getCaseDecisionHistory(
        createdCase.id,
      )

    expect(history).toHaveLength(1)
    expect(history[0].caseId).toBe(
      createdCase.id,
    )
    expect(history[0].decision).toBe(
      'PROCEDE_EVALUACION',
    )
    expect(
      history[0].justification,
    ).toBe(
      'El caso cumple con los criterios para evaluación.',
    )
  })

  it('rechaza una decisión sin justificación', async () => {
    const api = await getApi()

    const createdCase =
      await api.createCase({
        origin: 'DENUNCIA',
        companyName:
          'Empresa Decisión Test',
        establishmentName:
          'Sucursal Decisión Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Media',
      })

    await expect(
      api.registerCaseDecision({
        caseId: createdCase.id,
        decision: 'NO_PROCEDE',
        justification: '',
      }),
    ).rejects.toThrow(
      'Debes indicar una justificación para la decisión.',
    )
  })
})

describe('Coordinator API - programación', () => {
  it('programa una inspección y actualiza el caso a PROGRAMADO', async () => {
    const api = await getApi()

    const createdCase =
      await api.createCase({
        origin:
          'PROGRAMACION_INSTITUCIONAL',
        companyName:
          'Empresa Programación Test',
        establishmentName:
          'Planta Programación Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Alta',
      })

    await api.registerCaseDecision({
      caseId: createdCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Caso habilitado para programación.',
    })

    const evaluators =
      await api.getEvaluators()

    expect(
      evaluators.length,
    ).toBeGreaterThan(0)

    const evaluator =
      evaluators[0]

    const inspection =
      await api.scheduleInspection({
        caseId: createdCase.id,
        evaluatorId: evaluator.id,
        scheduledAt:
          '2030-10-10T09:00:00',
        scheduledEndAt:
          '2030-10-10T11:00:00',
        conflictAcknowledged: false,
      })

    expect(inspection.caseId).toBe(
      createdCase.id,
    )

    expect(
      inspection.assignedEvaluatorId,
    ).toBe(evaluator.id)

    expect(inspection.status).toBe(
      'ASIGNADA',
    )

    const caseAfterScheduling =
      await api.getCaseById(
        createdCase.id,
      )

    expect(
      caseAfterScheduling?.status,
    ).toBe('PROGRAMADO')

    const history =
      await api.getScheduleHistory(
        inspection.id,
      )

    expect(
      history.some(
        (item) =>
          item.action ===
          'PROGRAMACION',
      ),
    ).toBe(true)
  })

  it('detecta un conflicto de horario para el mismo técnico', async () => {
    const api = await getApi()

    const evaluators =
      await api.getEvaluators()

    const evaluator =
      evaluators[0]

    const firstCase =
      await api.createCase({
        origin: 'ALERTA_LAPCH',
        companyName:
          'Empresa Conflicto A',
        establishmentName:
          'Planta Conflicto A',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Urgente',
      })

    await api.registerCaseDecision({
      caseId: firstCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Primera evaluación de prueba.',
    })

    await api.scheduleInspection({
      caseId: firstCase.id,
      evaluatorId: evaluator.id,
      scheduledAt:
        '2031-01-15T09:00:00',
      scheduledEndAt:
        '2031-01-15T11:00:00',
      conflictAcknowledged: false,
    })

    const conflicts =
      await api.checkScheduleConflicts(
        evaluator.id,
        '2031-01-15T10:00:00',
        '2031-01-15T12:00:00',
      )

    expect(
      conflicts.length,
    ).toBeGreaterThan(0)

    expect(
      conflicts.some(
        (conflict) =>
          conflict.evaluatorId ===
          evaluator.id,
      ),
    ).toBe(true)
  })

  it('permite reprogramar y registra el motivo en el historial', async () => {
    const api = await getApi()

    const evaluators =
      await api.getEvaluators()

    const createdCase =
      await api.createCase({
        origin: 'DENUNCIA',
        companyName:
          'Empresa Reprogramación Test',
        establishmentName:
          'Sucursal Reprogramación Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Media',
      })

    await api.registerCaseDecision({
      caseId: createdCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Caso listo para evaluación.',
    })

    const inspection =
      await api.scheduleInspection({
        caseId: createdCase.id,
        evaluatorId:
          evaluators[0].id,
        scheduledAt:
          '2032-02-10T08:00:00',
        scheduledEndAt:
          '2032-02-10T10:00:00',
        conflictAcknowledged: false,
      })

    const rescheduled =
      await api.rescheduleInspection({
        inspectionId:
          inspection.id,
        scheduledAt:
          '2032-02-11T13:00:00',
        scheduledEndAt:
          '2032-02-11T15:00:00',
        reason:
          'Cambio solicitado por coordinación.',
        conflictAcknowledged: false,
      })

    expect(
      rescheduled.scheduledAt,
    ).toBe(
      '2032-02-11T13:00:00',
    )

    const history =
      await api.getScheduleHistory(
        inspection.id,
      )

    const rescheduleRecord =
      history.find(
        (item) =>
          item.action ===
          'REPROGRAMACION',
      )

    expect(
      rescheduleRecord,
    ).toBeDefined()

    expect(
      rescheduleRecord?.reason,
    ).toBe(
      'Cambio solicitado por coordinación.',
    )
  })
})

describe('Coordinator API - asignaciones', () => {
  it('reasigna un técnico y conserva el historial de asignación', async () => {
    const api = await getApi()

    const evaluators =
      await api.getEvaluators()

    expect(
      evaluators.length,
    ).toBeGreaterThanOrEqual(2)

    const createdCase =
      await api.createCase({
        origin:
          'PROGRAMACION_INSTITUCIONAL',
        companyName:
          'Empresa Asignación Test',
        establishmentName:
          'Planta Asignación Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Alta',
      })

    await api.registerCaseDecision({
      caseId: createdCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Caso listo para asignación.',
    })

    const inspection =
      await api.scheduleInspection({
        caseId: createdCase.id,
        evaluatorId:
          evaluators[0].id,
        scheduledAt:
          '2033-03-20T09:00:00',
        scheduledEndAt:
          '2033-03-20T11:00:00',
        conflictAcknowledged: false,
      })

    const reassigned =
      await api.updateAssignment({
        inspectionId:
          inspection.id,
        evaluatorId:
          evaluators[1].id,
        reason:
          'Redistribución de carga de trabajo.',
      })

    expect(
      reassigned.assignedEvaluatorId,
    ).toBe(evaluators[1].id)

    const history =
      await api.getAssignmentHistory(
        inspection.id,
      )

    const reassignment =
      history.find(
        (item) =>
          item.action ===
          'REASIGNACION',
      )

    expect(reassignment).toBeDefined()

    expect(
      reassignment?.previousEvaluatorId,
    ).toBe(evaluators[0].id)

    expect(
      reassignment?.evaluatorId,
    ).toBe(evaluators[1].id)

    expect(
      reassignment?.reason,
    ).toBe(
      'Redistribución de carga de trabajo.',
    )
  })

  it('exige un motivo cuando se reasigna un técnico', async () => {
    const api = await getApi()

    const evaluators =
      await api.getEvaluators()

    const createdCase =
      await api.createCase({
        origin: 'ALERTA_LAPCH',
        companyName:
          'Empresa Motivo Test',
        establishmentName:
          'Planta Motivo Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Alta',
      })

    await api.registerCaseDecision({
      caseId: createdCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Caso listo para prueba.',
    })

    const inspection =
      await api.scheduleInspection({
        caseId: createdCase.id,
        evaluatorId:
          evaluators[0].id,
        scheduledAt:
          '2034-04-10T09:00:00',
        scheduledEndAt:
          '2034-04-10T11:00:00',
        conflictAcknowledged: false,
      })

    await expect(
      api.updateAssignment({
        inspectionId:
          inspection.id,
        evaluatorId:
          evaluators[1].id,
        reason: '',
      }),
    ).rejects.toThrow(
      'Debes indicar el motivo de la reasignación.',
    )
  })
})

describe('Coordinator API - cancelación', () => {
  it('cancela una inspección y registra la cancelación en el historial', async () => {
    const api = await getApi()

    const evaluators =
      await api.getEvaluators()

    const createdCase =
      await api.createCase({
        origin: 'DENUNCIA',
        companyName:
          'Empresa Cancelación Test',
        establishmentName:
          'Sucursal Cancelación Test',
        establishmentAddress:
          'Santo Domingo',
        priority: 'Media',
      })

    await api.registerCaseDecision({
      caseId: createdCase.id,
      decision:
        'PROCEDE_EVALUACION',
      justification:
        'Caso listo para programación.',
    })

    const inspection =
      await api.scheduleInspection({
        caseId: createdCase.id,
        evaluatorId:
          evaluators[0].id,
        scheduledAt:
          '2035-05-12T09:00:00',
        scheduledEndAt:
          '2035-05-12T11:00:00',
        conflictAcknowledged: false,
      })

    const cancelled =
      await api.cancelInspection({
        inspectionId:
          inspection.id,
        reason:
          'Cancelación registrada durante la prueba automatizada.',
      })

    expect(cancelled.status).toBe(
      'CANCELADA',
    )

    expect(
      cancelled.cancellationReason,
    ).toBe(
      'Cancelación registrada durante la prueba automatizada.',
    )

    const caseAfterCancellation =
      await api.getCaseById(
        createdCase.id,
      )

    expect(
      caseAfterCancellation?.status,
    ).toBe('CANCELADO')

    const history =
      await api.getScheduleHistory(
        inspection.id,
      )

    expect(
      history.some(
        (item) =>
          item.action ===
          'CANCELACION',
      ),
    ).toBe(true)
  })
})