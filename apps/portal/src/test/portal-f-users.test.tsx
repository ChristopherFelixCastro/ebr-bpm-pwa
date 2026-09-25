import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'
import type { AuthorizationLetter, PortalUser } from '../api/users'

const account = (roleCode: CoreUser['roleCode']): CoreUser => ({ id: `actor-${roleCode}`, fullName: roleCode, roleCode, status: 'APPROVED', companyId: null, authTime: Date.now() })
const envelope = (data: unknown, total = 0) => ({ data, meta: { correlationId: 'test', total } }) as never
const target = (overrides: Partial<PortalUser> = {}): PortalUser => ({ id: 'user-1', fullName: 'Ana Pérez', email: 'ana@example.test', phone: null, status: 'PENDING_VALIDATION', version: 3,
  roleCode: 'EVALUATOR', companyId: null, companyName: null, createdAt: '2026-09-20T12:00:00.000Z', updatedAt: '2026-09-20T12:00:00.000Z', authorizationLetterStatus: 'PENDING', ...overrides })
const letter = (overrides: Partial<AuthorizationLetter> = {}): AuthorizationLetter => ({ id: 'letter-1', userId: 'user-1', status: 'PENDING', fileName: 'carta.pdf', mimeType: 'application/pdf', sizeBytes: 2048,
  sha256: 'a'.repeat(64), uploadedByUserId: 'user-1', uploadedAt: '2026-09-20T12:00:00.000Z', reviewedByUserId: null, reviewedAt: null, rejectionReason: null, archivedAt: null, version: 1, ...overrides })

type Handler = (path: string, init?: RequestInit) => unknown
let handler: Handler
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); core.disconnect()
  handler = () => envelope([])
  vi.spyOn(core, 'request').mockImplementation(async (path, init) => {
    if (path === '/health/ready') return envelope({ status: 'ready' })
    return handler(String(path), init) as never
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); core.disconnect() })
const openAs = (role: CoreUser['roleCode'], url: string) => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(account(role))
  window.history.replaceState({}, '', url)
  render(<App />)
}
const calls = () => vi.mocked(core.request).mock.calls.map(([path, init]) => ({ path: String(path), method: init?.method ?? 'GET', body: init?.body }))

it('habilita Usuarios solo para ADMIN y UNIVERSAL y protege la URL directa', async () => {
  for (const role of ['ADMIN', 'UNIVERSAL'] as const) expect(visibleSections(account(role)).find((section) => section.name === 'Configuración')?.pages.some((page) => page.id === 'users')).toBe(true)
  for (const role of ['COORDINATOR', 'EVALUATOR', 'COMPANY_ADMIN', 'DELEGATE'] as const) expect(visibleSections(account(role)).some((section) => section.pages.some((page) => page.id === 'users'))).toBe(false)
  openAs('COORDINATOR', '/configuracion/usuarios/user-1')
  expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
  expect(calls().some(({ path }) => path.startsWith('/v1/users'))).toBe(false)
})

it('pagina en Core con el total del servidor y no ofrece el rol UNIVERSAL a ADMIN', async () => {
  handler = (path) => path.startsWith('/v1/users?') ? envelope([target()], 45) : envelope([])
  openAs('ADMIN', '/configuracion/usuarios')
  expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
  expect(screen.getByText('1–20 de 45')).toBeInTheDocument()
  expect(screen.queryByText('ana@example.test')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /siguiente|next/i }))
  await waitFor(() => expect(calls().some(({ path }) => path.includes('page=2') && path.includes('limit=20'))).toBe(true))
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
  fireEvent.mouseDown(within(await screen.findByRole('dialog')).getByRole('combobox', { name: 'Rol' }))
  const options = (await screen.findAllByRole('option')).map((option) => option.textContent)
  expect(options).toContain('Administrador')
  expect(options).not.toContain('Universal')
})

it('mantiene la aprobación deshabilitada hasta que Core confirme una carta válida', async () => {
  handler = (path) => path === '/v1/users/user-1' ? envelope(target()) : path === '/v1/users/user-1/authorization-letters' ? envelope([letter()]) : envelope([])
  openAs('ADMIN', '/configuracion/usuarios/user-1')
  expect(await screen.findByText('La aprobación estará disponible cuando Core confirme una carta de autorización válida.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Marcar como válida' })).toBeEnabled()
  expect(screen.getAllByText('Pendiente de revisión').length).toBeGreaterThan(0)
})

it('aprueba con la versión vigente tras confirmar identidad cuando Core lo exige', async () => {
  let approveAttempts = 0
  handler = (path, init) => {
    if (path === '/v1/users/user-1/approve') {
      approveAttempts += 1
      if (approveAttempts === 1) throw new CoreApiError(401, 'REAUTHENTICATION_REQUIRED', 'Se requiere autenticación reciente.')
      return envelope(target({ status: 'APPROVED', version: 4, authorizationLetterStatus: 'VALID' }))
    }
    if (path === '/v1/users/user-1') return envelope(target({ authorizationLetterStatus: 'VALID' }))
    if (path === '/v1/users/user-1/authorization-letters') return envelope([letter({ status: 'VALID', reviewedAt: '2026-09-21T12:00:00.000Z' })])
    return envelope(init?.method === 'POST' ? {} : [])
  }
  vi.spyOn(core, 'reauthenticate').mockResolvedValue(account('ADMIN'))
  openAs('ADMIN', '/configuracion/usuarios/user-1')
  fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Aprobar' }))
  const password = await screen.findByLabelText('Contraseña')
  fireEvent.change(password, { target: { value: 'Clave-Segura-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByText('Cuenta aprobada.')).toBeInTheDocument()
  const approve = calls().filter(({ path }) => path === '/v1/users/user-1/approve')
  expect(approve).toHaveLength(2)
  expect(JSON.parse(String(approve[1].body))).toEqual({ version: 3 })
})

it('ante STALE_VERSION conserva lo escrito y ofrece recargar para comparar', async () => {
  handler = (path, init) => {
    if (path === '/v1/users/user-1' && init?.method === 'PATCH') throw new CoreApiError(409, 'STALE_VERSION', 'El registro fue modificado por otra operación.')
    if (path === '/v1/users/user-1') return envelope(target())
    return envelope([])
  }
  openAs('ADMIN', '/configuracion/usuarios/user-1')
  const name = await screen.findByLabelText('Nombre completo')
  fireEvent.change(name, { target: { value: 'Ana María Pérez' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByRole('button', { name: 'Recargar para comparar' })).toBeInTheDocument()
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana María Pérez')
})

it('registra la cuenta pública con la carta y sin abrir sesión', async () => {
  vi.spyOn(core, 'restoreSession').mockResolvedValue(null as never)
  handler = (path) => path === '/v1/auth/register' ? envelope(target({ authorizationLetterStatus: 'PENDING' })) : envelope([])
  window.history.replaceState({}, '', '/registro')
  render(<App />)
  fireEvent.change(await screen.findByLabelText(/Nombre completo/), { target: { value: 'Carmen Rosario' } })
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'Carmen@Empresa.test' } })
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Clave-Segura-123' } })
  fireEvent.change(screen.getByLabelText(/Confirmar contraseña/), { target: { value: 'Clave-Segura-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
  expect(await screen.findByText('Adjunte la carta de autorización de la cuenta.')).toBeInTheDocument()
  const file = new File(['%PDF-1.4'], 'carta.pdf', { type: 'application/pdf' })
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
  expect(await screen.findByText('Solicitud de cuenta registrada.')).toBeInTheDocument()
  const register = calls().find(({ path }) => path === '/v1/auth/register')!
  expect(register.method).toBe('POST')
  const form = register.body as FormData
  expect(form.get('email')).toBe('carmen@empresa.test')
  expect(form.get('roleCode')).toBe('COMPANY_ADMIN')
  expect((form.get('authorizationLetter') as File).name).toBe('carta.pdf')
  expect(calls().some(({ path }) => path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/me'))).toBe(false)
})
