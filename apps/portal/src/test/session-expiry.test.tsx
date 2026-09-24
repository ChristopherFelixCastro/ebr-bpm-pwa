import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import { core, SESSION_EXPIRED_EVENT } from '../api/core'
import { listOfflinePackages, lockOfflineVault, saveOfflinePackage } from '../offline/vault'
import { SessionProvider, useSession } from '../session/SessionContext'

const evaluator: CoreUser = { id: 'expiry-evaluator', fullName: 'Evaluadora', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }

afterEach(() => { cleanup(); lockOfflineVault(); vi.restoreAllMocks(); localStorage.clear() })

it('caducidad de sesión bloquea trabajo local y rechaza la reautenticación pendiente', async () => {
  localStorage.clear()
  vi.spyOn(core, 'request').mockRejectedValue(new Error('Core no disponible para health'))
  vi.spyOn(core, 'restoreSession').mockResolvedValue(null)
  vi.spyOn(core, 'login').mockResolvedValue(evaluator)

  function Probe() {
    const { user, offlineUser, login, unlockOffline, runWithReauthentication } = useSession()
    const [outcome, setOutcome] = useState('')
    const [loginDone, setLoginDone] = useState(false)
    return <>
      <span data-testid="user">{user?.id ?? 'none'}</span>
      <span data-testid="offline-user">{offlineUser?.id ?? 'none'}</span>
      <span data-testid="outcome">{outcome}</span>
      <span data-testid="login-done">{String(loginDone)}</span>
      <button onClick={() => void login('eval@example.test', 'clave-local').then(() => setLoginDone(true))}>Login</button>
      <button onClick={() => void unlockOffline(evaluator.id, 'clave-local')}>Desbloquear</button>
      <button onClick={() => void runWithReauthentication(async () => { throw new CoreApiError(401, 'REAUTHENTICATION_REQUIRED', 'Confirme identidad') }).catch((error: Error) => setOutcome(error.message))}>Acción</button>
    </>
  }

  render(<SessionProvider><Probe /></SessionProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Login' }))
  await waitFor(() => expect(screen.getByTestId('login-done')).toHaveTextContent('true'))
  expect(screen.getByTestId('user')).toHaveTextContent(evaluator.id)
  await saveOfflinePackage(evaluator.id, 'pendiente-1', { pending: true })
  fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
  await waitFor(() => expect(screen.getByTestId('offline-user')).toHaveTextContent(evaluator.id))
  fireEvent.click(screen.getByRole('button', { name: 'Acción' }))
  expect(await screen.findByRole('dialog', { name: 'Confirmar identidad' })).toBeInTheDocument()

  act(() => { window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)) })
  await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('La sesión terminó'))
  expect(screen.getByTestId('user')).toHaveTextContent('none')
  expect(screen.getByTestId('offline-user')).toHaveTextContent('none')
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirmar identidad' })).not.toBeInTheDocument())
  await expect(listOfflinePackages(evaluator.id)).rejects.toThrow('bloqueado')
})
