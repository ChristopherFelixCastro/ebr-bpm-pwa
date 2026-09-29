import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { operationApi, type Schedule } from '../api/operation'
import { todayInDominicanRepublic } from '../pages/field/calendarDates'

afterEach(() => { cleanup(); vi.restoreAllMocks(); core.disconnect(); localStorage.clear() })

it('muestra al evaluador una visita con establecimiento, dirección y vistas de calendario', async () => {
  const evaluator: CoreUser = { id: '55555555-5555-4555-8555-555555555555', fullName: 'Juan Pérez', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
  const day = todayInDominicanRepublic()
  const schedule: Schedule = { id: '77777777-7777-4777-8777-777777777777', caseId: '22222222-2222-4222-8222-222222222222', assignmentId: '33333333-3333-4333-8333-333333333333', evaluator: { id: evaluator.id, fullName: evaluator.fullName }, scheduledStartAt: `${day}T14:00:00Z`, scheduledEndAt: `${day}T16:00:00Z`, timezone: 'America/Santo_Domingo', status: 'SCHEDULED', notes: null, cancellationReason: null, cancelledAt: null, rescheduledFromScheduleId: null, version: 1, companyName: 'Planeta Azul SRL', companyTradeName: 'Planeta Azul', establishmentName: 'Planta Planeta Azul', establishmentAddress: 'Santo Domingo' }
  vi.spyOn(core, 'restoreSession').mockResolvedValue(evaluator)
  vi.spyOn(core, 'request').mockResolvedValue({ data: { status: 'ready' }, meta: { correlationId: 'test' } } as never)
  const schedules = vi.spyOn(operationApi, 'schedules').mockResolvedValue({ data: [schedule], meta: { correlationId: 'test', total: 1 } } as never)
  window.history.replaceState({}, '', '/campo/calendario')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Mi calendario' })).toBeInTheDocument()
  expect(await screen.findByText('Planta Planeta Azul')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Día' }))
  expect(await screen.findByText('Santo Domingo')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Abrir inspección' })).toBeInTheDocument()
  expect(schedules.mock.calls.every(([filters]) => filters.startFrom && filters.startTo)).toBe(true)
})
