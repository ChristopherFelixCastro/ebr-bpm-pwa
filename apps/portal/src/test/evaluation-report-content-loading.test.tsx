import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CoreApiError } from '@ebr-bpm/core-client'

vi.mock('../session/SessionContext', () => ({
  useSession: () => ({ user: { id: 'coordinator-1', roleCode: 'COORDINATOR' }, runWithReauthentication: (action: () => Promise<unknown>) => action() }),
}))
vi.mock('../api/evaluation', () => ({
  evaluationDetail: vi.fn(), getReportContent: vi.fn(), saveReportContent: vi.fn(), recalculate: vi.fn(),
}))

import { evaluationDetail, getReportContent } from '../api/evaluation'
import { EvaluationDetailPage } from '../pages/evaluations/EvaluationDetailPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('keeps an approved evaluation open when its report-content endpoint returns 404', async () => {
  vi.mocked(evaluationDetail).mockResolvedValue({
    evaluation: { lifecycleStatus: 'APPROVED', inspectionStatus: 'SUBMITTED', companyName: 'Planeta Azul', establishmentName: 'Planta Planeta Azul' },
    workPackage: { responses: [], bpmTemplate: { items: [] } },
    calculation: null, review: null, reports: [], closure: null,
  } as unknown as Awaited<ReturnType<typeof evaluationDetail>>)
  vi.mocked(getReportContent).mockRejectedValue(new CoreApiError(404, 'NOT_FOUND', 'No encontrado'))
  render(<MemoryRouter initialEntries={['/evaluaciones/12345678-1234-4234-8234-123456789abc']}><Routes>
    <Route path="/evaluaciones/:id" element={<EvaluationDetailPage />} />
    <Route path="/no-encontrado" element={<h1>Recurso no encontrado</h1>} />
  </Routes></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Evaluación 12345678' })).toBeInTheDocument()
  expect(await screen.findByText(/No se pudo cargar la preparación del informe/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Recurso no encontrado' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Generar informe' })).toBeDisabled()
})
