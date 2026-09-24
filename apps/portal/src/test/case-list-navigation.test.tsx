import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'

const universal: CoreUser = { id: 'universal', fullName: 'Universal', roleCode: 'UNIVERSAL', status: 'APPROVED', companyId: null, authTime: Date.now() }
beforeEach(() => { localStorage.clear(); core.disconnect() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('reinicia página, estado y búsqueda al navegar entre las cuatro bandejas', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(universal)
  const requests = vi.spyOn(core, 'request').mockImplementation(async (path) => ({ data: String(path).startsWith('/v1/cases?') ? [] : { status: 'ready' }, meta: { correlationId: 'test', total: 25 } } as never))
  window.history.replaceState({}, '', '/operacion/programas')
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Programa institucional' })).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: 'Referencia' }), { target: { value: 'PLAN-1' } })
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Estado' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Pendiente de asignación' }))
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(requests).toHaveBeenCalledWith('/v1/cases?page=1&limit=10&origin=INSTITUTIONAL_PROGRAM&status=PENDING_ASSIGNMENT&search=PLAN-1', expect.anything()))
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  await waitFor(() => expect(requests).toHaveBeenCalledWith('/v1/cases?page=2&limit=10&origin=INSTITUTIONAL_PROGRAM&status=PENDING_ASSIGNMENT&search=PLAN-1', expect.anything()))

  const destinations = [
    { link: 'Alertas sanitarias', heading: 'Alerta sanitaria', query: '/v1/cases?page=1&limit=10&origin=HEALTH_ALERT' },
    { link: 'Denuncias', heading: 'Denuncia', query: '/v1/cases?page=1&limit=10&origin=COMPLAINT' },
    { link: 'Casos', heading: 'Casos de operación sanitaria', query: '/v1/cases?page=1&limit=10' },
  ]
  for (const destination of destinations) {
    const previousCalls = requests.mock.calls.length
    fireEvent.click(screen.getByRole('link', { name: destination.link }))
    expect(await screen.findByRole('heading', { name: destination.heading })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Referencia' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Estado' })).not.toHaveTextContent('Pendiente de asignación')
    await waitFor(() => expect(requests.mock.calls.slice(previousCalls).some(([path]) => path === destination.query)).toBe(true))
    expect(requests.mock.calls.slice(previousCalls).filter(([path]) => String(path).startsWith('/v1/cases?')).every(([path]) => path === destination.query)).toBe(true)
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument()
  }
})
