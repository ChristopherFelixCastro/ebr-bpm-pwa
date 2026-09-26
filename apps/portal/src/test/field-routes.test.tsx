import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'

const account = (roleCode: CoreUser['roleCode']): CoreUser => ({ id: roleCode, fullName: roleCode, roleCode, status: 'APPROVED', companyId: null, authTime: Date.now() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); core.disconnect(); localStorage.clear() })

it('muestra campo solo a EVALUATOR y UNIVERSAL, y protege ambas URL directas', async () => {
  // Correcciones es exclusiva del EVALUATOR asignado; UNIVERSAL no es autor de correcciones.
  const fieldPages = (role: 'EVALUATOR' | 'UNIVERSAL') => visibleSections(account(role)).find((section) => section.name === 'Inspecciones de campo')?.pages.map((page) => page.id)
  expect(fieldPages('EVALUATOR')).toEqual(['field', 'corrections'])
  expect(fieldPages('UNIVERSAL')).toEqual(['field'])
  for (const role of ['ADMIN', 'COORDINATOR', 'COMPANY_ADMIN', 'DELEGATE'] as const)
    expect(visibleSections(account(role)).some((section) => section.name === 'Inspecciones de campo')).toBe(false)
  vi.spyOn(core, 'request').mockResolvedValue({ data: { status: 'ready' }, meta: { correlationId: 'test' } } as never)
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('COMPANY_ADMIN'))
  window.history.replaceState({}, '', '/campo/asignadas')
  const view = render(<App />)
  expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  expect(vi.mocked(core.request).mock.calls.some(([url]) => String(url).startsWith('/v1/inspections'))).toBe(false)
  view.unmount()
  window.history.replaceState({}, '', '/campo/inspecciones/44444444-4444-4444-8444-444444444444')
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
})

it('oculta descarga y edición si Core responde 403 a un evaluador fuera de alcance', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account('EVALUATOR'))
  vi.spyOn(core, 'request').mockImplementation(async (url) => {
    if (url === '/health/ready') return { data: { status: 'ready' }, meta: { correlationId: 'test' } } as never
    throw new CoreApiError(403, 'FORBIDDEN', 'Fuera de alcance')
  })
  window.history.replaceState({}, '', '/campo/inspecciones/44444444-4444-4444-8444-444444444444')
  render(<App />)
  expect(await screen.findByText('Core denegó el acceso a esta inspección.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Descargar o renovar paquete' })).not.toBeInTheDocument()
})
