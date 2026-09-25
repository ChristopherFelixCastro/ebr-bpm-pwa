import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'

const account = (roleCode: CoreUser['roleCode']): CoreUser => ({ id: roleCode === 'EVALUATOR' ? 'evaluator-1' : roleCode, fullName: roleCode, roleCode, status: 'APPROVED', companyId: null, authTime: Date.now() })
const envelope = (data: unknown, total = 0) => ({ data, meta: { correlationId: 'test', total } }) as never
const inspection = { id: 'inspection-1', evaluatorUserId: 'evaluator-1', status: 'SUBMITTED', version: 1 }
const evaluation = { id: inspection.id, caseId: 'case-1', inspectionStatus: 'SUBMITTED', lifecycleStatus: 'READY_FOR_REVIEW', companyName: 'Empresa', establishmentName: 'Planta', currentCalculation: null, currentReview: null, latestReport: null, closure: null }
const packageData = { inspection, bpmTemplate: { versionId: 'template-1', items: [{ id: 'item-1', itemKind: 'CRITERION', isEvaluable: true, displayCode: '1', title: 'Criterio' }] }, responses: [{ bpmItemId: 'item-1', responseValue: 'C', observations: null }], riskRule: { factors: [], foodCatalog: [] }, factorSelections: [], foodSnapshots: [], evidence: [] }
const notFound = () => new CoreApiError(404, 'NOT_FOUND', 'No encontrado')

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); core.disconnect(); vi.spyOn(core, 'request').mockImplementation(async (path) => {
  if (path === '/health/ready') return envelope({ status: 'ready' })
  if (String(path).startsWith('/v1/analytics/evaluations/')) return envelope(evaluation)
  if (String(path).endsWith('/work-package')) return envelope(packageData)
  if (String(path).endsWith('/reviews/current') || String(path).endsWith('/closure')) throw notFound()
  if (String(path).endsWith('/reports')) return envelope([])
  if (String(path).includes('/calculations/recalculate')) return envelope({ id: 'calculation-2' })
  return envelope([])
}) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); core.disconnect() })

it('muestra E solo a roles institucionales y correcciones solo a EVALUATOR; bloquea URL directa', async () => {
  for (const role of ['ADMIN', 'COORDINATOR', 'UNIVERSAL'] as const) expect(visibleSections(account(role)).find((section) => section.name === 'Evaluación y cierre')?.pages.map((page) => page.id)).toEqual(['analytics', 'reports', 'history'])
  for (const role of ['COMPANY_ADMIN', 'DELEGATE', 'EVALUATOR'] as const) expect(visibleSections(account(role)).some((section) => section.name === 'Evaluación y cierre')).toBe(false)
  expect(visibleSections(account('EVALUATOR')).find((section) => section.name === 'Inspecciones de campo')?.pages.some((page) => page.id === 'corrections')).toBe(true)
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COMPANY_ADMIN'))
  window.history.replaceState({}, '', '/evaluaciones/inspection-1')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  expect(vi.mocked(core.request).mock.calls.some(([path]) => String(path).includes('/v1/analytics/'))).toBe(false)
})

it('lee el resumen real de Core en Evaluaciones para los tres roles institucionales sin recorrer páginas', async () => {
  const restore = vi.spyOn(core, 'restoreSession')
  const summary = { total: 19, readyForReview: 2, pendingReview: 3, returnedForCorrection: 4, approved: 5, officialReports: 6, closed: 7, byRisk: { LOW: 8, MEDIUM: 9, HIGH: 10 } }
  vi.mocked(core.request).mockImplementation(async (path) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    if (path === '/v1/analytics/summary') return envelope(summary)
    if (String(path).startsWith('/v1/analytics/evaluations?')) return envelope([evaluation], 1)
    return envelope([])
  })
  for (const role of ['ADMIN', 'COORDINATOR', 'UNIVERSAL'] as const) {
    restore.mockResolvedValue(account(role))
    window.history.replaceState({}, '', '/evaluaciones')
    render(<App />)
    expect(await screen.findByText('19')).toBeInTheDocument()
    expect(screen.getByText('Resumen institucional')).toBeInTheDocument()
    expect(screen.getByText('Riesgo alto')).toBeInTheDocument()
    expect(vi.mocked(core.request).mock.calls.filter(([path]) => path === '/v1/analytics/summary')).toHaveLength(1)
    expect(vi.mocked(core.request).mock.calls.filter(([path]) => String(path).startsWith('/v1/analytics/evaluations?'))).toHaveLength(1)
    cleanup(); core.disconnect(); vi.mocked(core.request).mockClear()
  }
})

it('permite recálculo motivado a ADMIN sin mostrar decisiones de revisión o cierre', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('ADMIN'))
  window.history.replaceState({}, '', '/evaluaciones/inspection-1')
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Recalcular' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Abrir revisión' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cerrar expediente' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Motivo de recálculo'), { target: { value: 'Revisión técnica' } })
  fireEvent.click(screen.getByRole('button', { name: 'Recalcular' }))
  await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/inspections/inspection-1/calculations/recalculate', expect.objectContaining({ body: JSON.stringify({ reason: 'Revisión técnica' }) })))
})

it('devuelve criterios solo desde la revisión institucional autorizada', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COORDINATOR'))
  const review = { id: 'review-1', status: 'PENDING_REVIEW', cycleNumber: 1, returnCount: 0 }
  vi.mocked(core.request).mockImplementation(async (path) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    if (String(path).startsWith('/v1/analytics/evaluations/')) return envelope({ ...evaluation, lifecycleStatus: 'PENDING_REVIEW' })
    if (String(path).endsWith('/work-package')) return envelope(packageData)
    if (String(path).endsWith('/reviews/current')) return envelope(review)
    if (String(path).endsWith('/reports')) return envelope([])
    if (String(path).endsWith('/closure')) throw notFound()
    return envelope(review)
  })
  window.history.replaceState({}, '', '/evaluaciones/inspection-1/revision')
  render(<App />)
  fireEvent.click(await screen.findByLabelText('Devolver para corrección'))
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: 'Corregir respuesta' } })
  fireEvent.click(screen.getByLabelText(/1 Criterio/))
  fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }))
  await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/inspections/inspection-1/reviews/review-1/return', expect.objectContaining({ body: JSON.stringify({ reason: 'Corregir respuesta', bpmItemIds: ['item-1'] }) })))
})

it('guarda una corrección con baseVersion y solo después ofrece el reenvío online', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('EVALUATOR'))
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  let corrected = false
  vi.mocked(core.request).mockImplementation(async (path) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    if (path === '/v1/inspections/inspection-1') return envelope({ ...inspection, version: corrected ? 2 : 1 })
    if (String(path).endsWith('/work-package')) return envelope(packageData)
    if (String(path).endsWith('/reviews/current')) return envelope({ id: 'review-1', status: 'RETURNED_FOR_CORRECTION', returnCount: 1, returnReason: 'Revisar criterio', correctionItems: [{ id: 'correction-1', bpmItemId: 'item-1', returnNumber: 1, status: corrected ? 'CORRECTED' : 'OPEN' }] })
    if (String(path).includes('/corrections/item-1')) { corrected = true; return envelope({ version: 2 }) }
    if (String(path).endsWith('/resubmit')) return envelope({ reviewId: 'review-1', status: 'RESUBMITTED' })
    if (String(path).startsWith('/v1/review-corrections')) return envelope([], 0)
    return envelope([])
  })
  window.history.replaceState({}, '', '/campo/correcciones/inspection-1')
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Guardar corrección' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reenviar a revisión' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }))
  await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/inspections/inspection-1/reviews/review-1/corrections/item-1', expect.objectContaining({ body: JSON.stringify({ baseVersion: 1, responseValue: 'C', observations: null }) })))
  fireEvent.click(await screen.findByRole('button', { name: 'Reenviar a revisión' }))
  await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/inspections/inspection-1/reviews/review-1/resubmit', expect.objectContaining({ method: 'POST' })))
})

it('pide reautenticación a UNIVERSAL antes de devolver y repite la misma decisión', async () => {
  const universal = account('UNIVERSAL')
  vi.spyOn(core, 'restoreSession').mockResolvedValue(universal)
  vi.spyOn(core, 'reauthenticate').mockResolvedValue(universal)
  let attempts = 0
  vi.mocked(core.request).mockImplementation(async (path) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    if (String(path).startsWith('/v1/analytics/evaluations/')) return envelope({ ...evaluation, lifecycleStatus: 'PENDING_REVIEW' })
    if (String(path).endsWith('/work-package')) return envelope(packageData)
    if (String(path).endsWith('/reviews/current')) return envelope({ id: 'review-1', status: 'PENDING_REVIEW', cycleNumber: 1, returnCount: 0 })
    if (String(path).endsWith('/reports')) return envelope([])
    if (String(path).endsWith('/closure')) throw notFound()
    if (String(path).endsWith('/return')) { attempts += 1; if (attempts === 1) throw new CoreApiError(401, 'REAUTHENTICATION_REQUIRED', 'Confirme identidad'); return envelope({ status: 'RETURNED_FOR_CORRECTION' }) }
    return envelope([])
  })
  window.history.replaceState({}, '', '/evaluaciones/inspection-1/revision')
  render(<App />)
  fireEvent.click(await screen.findByLabelText('Devolver para corrección'))
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: 'Revisar criterio' } })
  fireEvent.click(screen.getByLabelText(/1 Criterio/))
  fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }))
  expect(await screen.findByText('Confirmar identidad')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-de-prueba' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(attempts).toBe(2))
  expect(core.reauthenticate).toHaveBeenCalledWith('clave-de-prueba')
})

it('reintenta informe con el mismo operationId y solo permite cerrar tras oficializar', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COORDINATOR'))
  let stage: 'approved' | 'draft' | 'official' | 'closed' = 'approved'
  const report = { id: 'report-1', status: 'DRAFT', verificationId: 'verification-1', generatedAt: '2026-09-25T00:00:00Z' }
  const generationIds: string[] = []
  vi.mocked(core.request).mockImplementation(async (path, init) => {
    const route = String(path)
    if (route === '/health/ready') return envelope({ status: 'ready' })
    if (route.startsWith('/v1/analytics/evaluations/')) return envelope({ ...evaluation, lifecycleStatus: stage === 'closed' ? 'CLOSED' : 'APPROVED', currentReview: { id: 'review-1', status: 'APPROVED' } })
    if (route.endsWith('/work-package')) return envelope(packageData)
    if (route.endsWith('/reviews/current')) return envelope({ id: 'review-1', status: 'APPROVED', cycleNumber: 1, returnCount: 0 })
    if (route.endsWith('/reports')) return envelope(stage === 'approved' ? [] : [{ ...report, status: stage === 'draft' ? 'DRAFT' : 'OFFICIAL' }])
    if (route.endsWith('/closure')) { if (stage === 'closed') return envelope({ id: 'closure-1', closedAt: '2026-09-25T00:00:00Z' }); throw notFound() }
    if (route.endsWith('/reports/generate')) { generationIds.push(JSON.parse(String(init?.body)).operationId); if (generationIds.length === 1) throw new CoreApiError(503, 'REPORT_STORAGE_UNAVAILABLE', 'Almacenamiento no disponible'); stage = 'draft'; return envelope(report) }
    if (route.endsWith('/officialize')) { stage = 'official'; return envelope({ ...report, status: 'OFFICIAL' }) }
    if (route.endsWith('/close')) { stage = 'closed'; return envelope({ id: 'closure-1' }) }
    return envelope([])
  })
  window.history.replaceState({}, '', '/evaluaciones/inspection-1')
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Generar informe' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cerrar expediente' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Generar informe' }))
  await waitFor(() => expect(generationIds).toHaveLength(1))
  fireEvent.click(screen.getByRole('button', { name: 'Generar informe' }))
  await waitFor(() => expect(generationIds).toHaveLength(2))
  expect(generationIds[1]).toBe(generationIds[0])
  fireEvent.click(await screen.findByRole('button', { name: 'Oficializar informe' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Cerrar expediente' }))
  await waitFor(() => expect(vi.mocked(core.request).mock.calls.some(([path]) => String(path).endsWith('/close'))).toBe(true))
})

it('muestra al evaluador asignado solo el informe oficial de su inspección', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('EVALUATOR'))
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.mocked(core.request).mockImplementation(async (path) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    if (String(path).endsWith('/work-package')) return envelope(packageData)
    if (String(path).endsWith('/reports')) return envelope([{ id: 'report-draft', status: 'DRAFT' }, { id: 'report-official', status: 'OFFICIAL' }])
    if (String(path).endsWith('/reports/report-official/download-url')) return envelope({ signedUrl: 'https://signed.test/report', expiresInSeconds: 60 })
    return envelope([])
  })
  window.history.replaceState({}, '', '/campo/inspecciones/inspection-1')
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir informe oficial' }))
  await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/inspections/inspection-1/reports/report-official/download-url', expect.objectContaining({ method: 'POST' })))
  expect(vi.mocked(core.request).mock.calls.some(([path]) => String(path).includes('/v1/analytics/'))).toBe(false)
})
