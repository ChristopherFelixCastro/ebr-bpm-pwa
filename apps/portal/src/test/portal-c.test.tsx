import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'
import { canAssign, canDecide, canReassign, canSchedule } from '../access/operationRules'
import { operationApi, type OperationalCase } from '../api/operation'

const account = (roleCode: CoreUser['roleCode']): CoreUser => ({ id: roleCode, fullName: roleCode, roleCode, status: 'APPROVED', companyId: null, authTime: Date.now() })
const alertCase: OperationalCase = { id: 'case-1', origin: 'HEALTH_ALERT', status: 'PENDING_REVIEW', priority: 'HIGH', companyId: null, establishmentId: null, version: 1, createdAt: '2026-09-20T12:00:00Z', updatedAt: '2026-09-20T12:00:00Z', source: { version: 3, alertNumber: 'AL-1', alertDate: '2026-09-20', productDescription: 'Producto', description: 'Descripción', decision: 'PENDING' } }
const envelope = (data: unknown, total = 0) => ({ data, meta: { correlationId: 'test', total } }) as never
beforeEach(() => { localStorage.clear(); core.disconnect(); vi.spyOn(core, 'request').mockResolvedValue(envelope({ status: 'ready' })) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('entrega C: operación sanitaria', () => {
  it('muestra sus seis entradas solo a roles de coordinación', () => {
    for (const role of ['ADMIN', 'UNIVERSAL', 'COORDINATOR'] as const) expect(visibleSections(account(role)).find((section) => section.name === 'Operación sanitaria')?.pages.map((page) => page.id)).toEqual(['cases', 'programs', 'alerts', 'complaints', 'assignments', 'scheduling'])
    for (const role of ['COMPANY_ADMIN', 'DELEGATE', 'EVALUATOR'] as const) expect(visibleSections(account(role)).some((section) => section.name === 'Operación sanitaria')).toBe(false)
  })
  it('bloquea la URL directa antes de consultar casos', async () => {
    vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COMPANY_ADMIN'))
    window.history.replaceState({}, '', '/operacion/casos')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
    expect(vi.mocked(core.request).mock.calls.some(([path]) => String(path).startsWith('/v1/cases'))).toBe(false)
  })
  it('consulta el cuarto origen real en la bandeja de casos', async () => {
    vi.spyOn(core, 'restoreSession').mockResolvedValue(account('UNIVERSAL'))
    const companyCase: OperationalCase = { ...alertCase, origin: 'COMPANY_REQUEST', status: 'PENDING_ASSIGNMENT', source: { version: 2, requestId: 'request-1', requestType: 'REGISTRATION', establishmentName: 'Planta' } }
    vi.mocked(core.request).mockImplementation(async (path) => envelope(String(path).startsWith('/v1/cases') ? [companyCase] : { status: 'ready' }, 1))
    window.history.replaceState({}, '', '/operacion/casos')
    render(<App />)
    expect(await screen.findByText('Solicitud BPM')).toBeInTheDocument()
    expect(screen.getByText('REGISTRATION')).toBeInTheDocument()
    expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/cases?page=1&limit=10', expect.objectContaining({ cache: 'no-store' }))
  })
  it('condiciona decisión, asignación, reasignación y agenda al estado', () => {
    const user = account('COORDINATOR')
    const assignment = { id: 'assignment-1', caseId: 'case-1', evaluator: { id: 'eval-1', fullName: 'Eva' }, assignedBy: { id: 'admin', fullName: 'Admin' }, assignedAt: '2026-09-20T12:00:00Z', unassignedAt: null, isActive: true, hasEditableInspection: false, reason: null, version: 4, case: { origin: 'HEALTH_ALERT' as const, status: 'ASSIGNED' as const, priority: 'HIGH', companyId: null, establishmentId: null } }
    expect(canDecide(user, alertCase)).toBe(true)
    expect(canAssign(user, alertCase)).toBe(false)
    const pending = { ...alertCase, status: 'PENDING_ASSIGNMENT' as const, source: { ...alertCase.source, decision: 'PROCEEDS' } }
    expect(canDecide(user, pending)).toBe(false)
    expect(canAssign(user, pending)).toBe(true)
    const assigned = { ...pending, status: 'ASSIGNED' as const }
    expect(canReassign(user, assigned, assignment)).toBe(true)
    expect(canReassign(user, assigned, { ...assignment, hasEditableInspection: true })).toBe(false)
    expect(canSchedule(user, assigned, assignment)).toBe(true)
    expect(canSchedule(user, assigned, assignment, { status: 'SCHEDULED' } as never)).toBe(false)
    expect(canReassign(account('COMPANY_ADMIN'), assigned, assignment)).toBe(false)
  })
  it('usa el directorio acotado y transporta las versiones en mutaciones', async () => {
    const spy = vi.mocked(core.request)
    spy.mockResolvedValue(envelope([]))
    await operationApi.evaluators({ page: 2, limit: 10, search: 'Eva' })
    await operationApi.decideAlert('case-1', { version: 3, decision: 'PROCEEDS' })
    await operationApi.decideComplaint('case-2', { version: 2, decision: 'REFERRED', referralReason: 'Jurisdicción', referralDestination: 'Ministerio' })
    await operationApi.assign('case-1', { evaluatorUserId: 'eval-1' })
    await operationApi.reassign('case-1', { newEvaluatorUserId: 'eval-2', currentAssignmentVersion: 4, reason: 'Carga' })
    await operationApi.schedule('case-1', { scheduledStartAt: '2099-01-10T14:00:00Z', scheduledEndAt: '2099-01-10T16:00:00Z' })
    await operationApi.reschedule('case-1', 'schedule-1', { version: 2, scheduledStartAt: '2099-01-11T14:00:00Z', scheduledEndAt: '2099-01-11T16:00:00Z', reason: 'Cambio' })
    expect(spy.mock.calls.map(([path]) => path)).toEqual(['/v1/assignable-evaluators?page=2&limit=10&search=Eva', '/v1/health-alerts/case-1/decide', '/v1/complaints/case-2/decide', '/v1/cases/case-1/assignments', '/v1/cases/case-1/reassign', '/v1/cases/case-1/schedules', '/v1/cases/case-1/schedules/schedule-1/reschedule'])
    expect(JSON.parse(String(spy.mock.calls[4][1]?.body))).toMatchObject({ currentAssignmentVersion: 4, reason: 'Carga' })
    expect(JSON.parse(String(spy.mock.calls[6][1]?.body))).toMatchObject({ version: 2, reason: 'Cambio' })
  })
  it('muestra decisión de alerta y oculta asignación antes de decidir', async () => {
    vi.spyOn(core, 'restoreSession').mockResolvedValue(account('UNIVERSAL'))
    vi.mocked(core.request).mockImplementation(async (path) => envelope(String(path) === '/v1/cases/case-1' ? alertCase : String(path).startsWith('/v1/cases/case-1/') ? [] : { status: 'ready' }))
    window.history.replaceState({}, '', '/operacion/casos/case-1')
    render(<App />)
    expect(await screen.findByText('Decisión previa a la asignación')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar decisión' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asignar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar caso' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión' }))
    await waitFor(() => expect(vi.mocked(core.request)).toHaveBeenCalledWith('/v1/health-alerts/case-1/decide', expect.objectContaining({ body: JSON.stringify({ version: 3, decision: 'PROCEEDS' }) })))
  })
  it('recupera el enlace estable al caso BPM al abrir una solicitud enviada', async () => {
    vi.spyOn(core, 'restoreSession').mockResolvedValue(account('UNIVERSAL'))
    const linkedCase: OperationalCase = { ...alertCase, origin: 'COMPANY_REQUEST', status: 'PENDING_ASSIGNMENT', source: { version: 2, requestId: 'request-1', requestType: 'REGISTRATION', establishmentName: 'Planta' } }
    vi.mocked(core.request).mockImplementation(async (path) => envelope(String(path) === '/v1/company-requests/request-1' ? { id: 'request-1', caseId: 'case-1', companyId: 'company-1', establishmentId: 'est-1', establishmentName: 'Planta', requestType: 'REGISTRATION', reason: 'Registro', status: 'PENDING_ASSIGNMENT', version: 2, contacts: [], documentSummary: { total: 0, pending: 0, valid: 0, rejected: 0, archived: 0 } } : String(path) === '/v1/company-requests/request-1/documents' ? [] : String(path) === '/v1/cases/case-1' ? linkedCase : String(path).startsWith('/v1/cases/case-1/') ? [] : { status: 'ready' }))
    window.history.replaceState({}, '', '/solicitudes/request-1')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver caso operativo' }))
    expect(await screen.findByRole('heading', { name: /Solicitud BPM/ })).toBeInTheDocument()
  })
})
