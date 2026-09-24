import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { visibleSections } from '../access/capabilities'
import { SessionProvider, useSession } from '../session/SessionContext'

const user = (roleCode: CoreUser['roleCode'] = 'COMPANY_ADMIN'): CoreUser => ({
  id: 'user-1', fullName: 'María Pérez', roleCode, status: 'APPROVED', companyId: 'company-1', authTime: Date.now(),
})
const at = (path: string) => window.history.replaceState({}, '', path)

beforeEach(() => {
  localStorage.clear()
  core.disconnect()
  at('/login')
  vi.spyOn(core, 'request').mockResolvedValue({ data: { status: 'ready' }, meta: { correlationId: 'test' } })
  vi.spyOn(core, 'restoreSession').mockResolvedValue(null)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('portal A', () => {
  it('usa el login único y navega a una página autorizada', async () => {
    const login = vi.spyOn(core, 'login').mockResolvedValue(user())
    render(<App />)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'Maria@Example.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acceder al sistema' }))
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith('maria@example.com', 'secreto')
    fireEvent.click(screen.getAllByText('Mi cuenta')[0])
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument()
  })

  it('restaura una cuenta aprobada y muestra solo secciones funcionales autorizadas', async () => {
    vi.mocked(core.restoreSession).mockResolvedValue(user('DELEGATE'))
    at('/inicio')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getAllByText('Solicitudes').length).toBeGreaterThan(0)
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument()
    expect(visibleSections(user('DELEGATE')).map((item) => item.name)).toEqual(['Inicio', 'Directorio empresarial', 'Solicitudes'])
    expect(core.restoreSession).toHaveBeenCalledTimes(1)
  })

  it('bloquea la URL directa de configuración para un delegado', async () => {
    vi.mocked(core.restoreSession).mockResolvedValue(user('DELEGATE'))
    at('/configuracion/usuarios')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument()
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument()
  })

  it('exige sesión incluso para una URL de negocio reservada', async () => {
    at('/solicitudes')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('reauthentica en la sesión compartida', async () => {
    vi.mocked(core.restoreSession).mockResolvedValue(user('ADMIN'))
    const reauthenticate = vi.spyOn(core, 'reauthenticate').mockResolvedValue(user('ADMIN'))
    at('/cuenta')
    render(<App />)
    fireEvent.change(await screen.findByLabelText('Contraseña actual'), { target: { value: 'clave actual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar identidad' }))
    await waitFor(() => expect(reauthenticate).toHaveBeenCalledWith('clave actual'))
    expect(await screen.findByText('Identidad confirmada.')).toBeInTheDocument()
  })

  it('reintenta una acción solo después de la reautenticación exigida por Core', async () => {
    vi.mocked(core.restoreSession).mockResolvedValue(user('ADMIN'))
    const reauthenticate = vi.spyOn(core, 'reauthenticate').mockResolvedValue(user('ADMIN'))
    const action = vi.fn().mockRejectedValueOnce(new CoreApiError(401, 'REAUTHENTICATION_REQUIRED', 'Confirme su identidad.')).mockResolvedValueOnce('completada')
    function ProtectedAction() {
      const { runWithReauthentication } = useSession()
      const [result, setResult] = useState('')
      return <><button onClick={() => void runWithReauthentication<string>(action).then(setResult)}>Acción protegida</button><span>{result}</span></>
    }
    render(<SessionProvider><ProtectedAction /></SessionProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Acción protegida' }))
    fireEvent.change(await screen.findByLabelText('Contraseña'), { target: { value: 'clave actual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('completada')).toBeInTheDocument()
    expect(reauthenticate).toHaveBeenCalledWith('clave actual')
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('cierra la sesión y retira la navegación protegida', async () => {
    vi.mocked(core.restoreSession).mockResolvedValue(user())
    const logout = vi.spyOn(core, 'logout').mockResolvedValue()
    at('/inicio')
    render(<App />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Cerrar sesión' }))[0])
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(localStorage.getItem('ebr-bpm-portal-logout-pending')).toBeNull()
  })
})
