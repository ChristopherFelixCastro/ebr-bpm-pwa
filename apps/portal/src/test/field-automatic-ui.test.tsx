import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { CoreUser } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { OfflinePackageMissingError, enrollOfflineIdentity, lockOfflineVault, saveOfflinePackage } from '../offline/vault'
import { downloadFieldPackage, finalizeLocal, inspectStoredFieldState, syncFieldState, type FieldState } from '../field/model'
import { BackgroundFieldSync } from '../field/BackgroundFieldSync'
import { FieldInspectionPage } from '../pages/field/FieldInspectionPage'

const user: CoreUser = { id: 'auto-eval', fullName: 'Evaluadora', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
vi.mock('../session/SessionContext', () => ({ useSession: () => ({ user, offlineUser: null }) }))
vi.mock('../field/model', async (original) => ({
  ...await original<typeof import('../field/model')>(),
  inspectStoredFieldState: vi.fn(), downloadFieldPackage: vi.fn(), finalizeLocal: vi.fn(), syncFieldState: vi.fn(),
}))

const inspection = { id: 'auto-inspection', caseId: 'case', assignmentId: 'assignment', evaluatorUserId: user.id,
  status: 'IN_PROGRESS' as const, version: 2, contentRevision: 2, establishmentName: 'Planta de prueba' }
const state = (pending: boolean): FieldState => ({
  inspection: inspection as FieldState['inspection'], permit: null, downloadedAt: '', localFinalized: false,
  signedPackage: { inspection: inspection as FieldState['inspection'], bpmTemplate: { versionId: 'bpm', items: [] },
    responses: [], riskRule: { versionId: 'risk', factors: [], foodCatalog: [] }, factorSelections: [], foodSnapshots: [], evidence: [], generatedAt: '' },
  responses: [], factorSelections: [], foodSnapshots: [], evidence: [],
  queue: pending ? [{ operationId: 'op-1', type: 'UPSERT_BPM_RESPONSE', payload: {}, status: 'PENDING', attempts: 0, createdAt: '' }] : [],
})
const renderInspection = () => render(<MemoryRouter initialEntries={['/campo/inspecciones/auto-inspection']}><Routes>
  <Route path="/campo/inspecciones/:id" element={<FieldInspectionPage />} />
</Routes></MemoryRouter>)

afterEach(() => { cleanup(); lockOfflineVault(); vi.restoreAllMocks(); vi.clearAllMocks() })

it('abrir prepara automáticamente la inspección si aún no existe copia local', async () => {
  vi.spyOn(core, 'request').mockResolvedValue({ data: inspection, meta: { correlationId: 'test' } } as never)
  vi.mocked(inspectStoredFieldState).mockRejectedValue(new OfflinePackageMissingError())
  vi.mocked(downloadFieldPackage).mockResolvedValue(state(false))
  renderInspection()
  expect(await screen.findByText('Respuestas BPM')).toBeInTheDocument()
  expect(downloadFieldPackage).toHaveBeenCalledWith(user.id, inspection.id)
  expect(screen.queryByRole('button', { name: /Descargar paquete/ })).not.toBeInTheDocument()
})

it('abre una inspección ya enviada en solo lectura sin solicitar permiso offline nuevo', async () => {
  const submitted = { ...inspection, status: 'SUBMITTED' as const }
  const workPackage = { ...state(false).signedPackage, inspection: submitted as FieldState['inspection'] }
  vi.spyOn(core, 'request').mockImplementation(async (path) => ({
    data: String(path).endsWith('/work-package') ? workPackage : submitted, meta: { correlationId: 'test' },
  }) as never)
  vi.mocked(inspectStoredFieldState).mockRejectedValue(new OfflinePackageMissingError())
  renderInspection()
  expect(await screen.findByText('Inspección enviada correctamente.')).toBeInTheDocument()
  expect(downloadFieldPackage).not.toHaveBeenCalled()
})

it('envía automáticamente operaciones guardadas al abrir con Core disponible', async () => {
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  vi.spyOn(core, 'request').mockResolvedValue({ data: inspection, meta: { correlationId: 'test' } } as never)
  vi.mocked(inspectStoredFieldState).mockResolvedValue({ status: 'READY', state: state(true) })
  vi.mocked(syncFieldState).mockResolvedValue({ ...state(false), queue: [{ ...state(true).queue[0], status: 'APPLIED' }] })
  renderInspection()
  await waitFor(() => expect(syncFieldState).toHaveBeenCalledWith(user.id, inspection.id))
  expect(screen.queryByRole('button', { name: 'Sincronizar con Core' })).not.toBeInTheDocument()
})

it('finalizar agrega el cierre a la cola y lo envía sin un segundo botón', async () => {
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  vi.spyOn(core, 'request').mockResolvedValue({ data: inspection, meta: { correlationId: 'test' } } as never)
  vi.mocked(inspectStoredFieldState).mockResolvedValue({ status: 'READY', state: state(false) })
  const finalized: FieldState = { ...state(false), localFinalized: true, queue: [
    { operationId: 'finalize', type: 'FINALIZE', payload: {}, status: 'PENDING', attempts: 0, createdAt: '' },
    { operationId: 'submit', type: 'SUBMIT', payload: {}, status: 'PENDING', attempts: 0, createdAt: '' },
  ] }
  vi.mocked(finalizeLocal).mockResolvedValue(finalized)
  vi.mocked(syncFieldState).mockResolvedValue({ ...finalized, queue: finalized.queue.map((item) => ({ ...item, status: 'APPLIED' })) })
  renderInspection()
  fireEvent.click(await screen.findByRole('button', { name: 'Finalizar inspección' }))
  await waitFor(() => expect(syncFieldState).toHaveBeenCalledWith(user.id, inspection.id))
  expect(finalizeLocal).toHaveBeenCalledWith(user.id, inspection.id)
  expect(screen.queryByRole('button', { name: 'Sincronizar con Core' })).not.toBeInTheDocument()
})

it('espera sin red y envía la cola automáticamente al reconectar', async () => {
  let connected = false
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => connected)
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  vi.spyOn(core, 'request').mockResolvedValue({ data: inspection, meta: { correlationId: 'test' } } as never)
  vi.mocked(inspectStoredFieldState).mockResolvedValue({ status: 'READY', state: state(true) })
  vi.mocked(syncFieldState).mockResolvedValue({ ...state(false), queue: [{ ...state(true).queue[0], status: 'APPLIED' }] })
  renderInspection()
  expect(await screen.findByText(/Se enviarán cuando vuelva la conexión/)).toBeInTheDocument()
  expect(syncFieldState).not.toHaveBeenCalled()
  connected = true
  window.dispatchEvent(new Event('online'))
  await waitFor(() => expect(syncFieldState).toHaveBeenCalledWith(user.id, inspection.id))
})

it('revisa pendientes cifrados al navegar por otra pantalla con la sesión desbloqueada', async () => {
  await enrollOfflineIdentity(user, 'clave-de-prueba')
  await saveOfflinePackage(user.id, inspection.id, { test: true })
  vi.spyOn(core, 'authenticated', 'get').mockReturnValue(true)
  vi.spyOn(core, 'request').mockResolvedValue({ data: inspection, meta: { correlationId: 'test' } } as never)
  vi.mocked(inspectStoredFieldState).mockResolvedValue({ status: 'READY', state: state(true) })
  vi.mocked(syncFieldState).mockResolvedValue(state(false))
  render(<MemoryRouter initialEntries={['/inicio']}><BackgroundFieldSync /></MemoryRouter>)
  await waitFor(() => expect(syncFieldState).toHaveBeenCalledWith(user.id, inspection.id))
})
