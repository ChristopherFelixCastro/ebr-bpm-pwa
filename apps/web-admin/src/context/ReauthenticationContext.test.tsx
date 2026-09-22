import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/http'

const mocks = vi.hoisted(() => ({ reauthenticate: vi.fn(), action: vi.fn() }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ reauthenticate: mocks.reauthenticate }) }))

import { ReauthenticationProvider, useReauthentication } from './ReauthenticationContext'

const Harness = () => {
  const { runWithReauthentication } = useReauthentication()
  const [result, setResult] = useState('idle')
  return <><button onClick={() => void runWithReauthentication(mocks.action).then(() => setResult('done')).catch(() => setResult('cancelled'))}>Ejecutar</button><span>{result}</span></>
}

describe('reautenticación de acciones sensibles', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => cleanup())

  it('conserva la acción, reemplaza el token mediante AuthContext y reintenta una sola vez', async () => {
    mocks.action.mockRejectedValueOnce(new ApiError('Reautenticación', 401, 'REAUTHENTICATION_REQUIRED')).mockResolvedValueOnce({ ok: true })
    mocks.reauthenticate.mockResolvedValue(undefined)
    render(<ReauthenticationProvider><Harness /></ReauthenticationProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }))
    fireEvent.change(await screen.findByLabelText('Contraseña'), { target: { value: 'Segura123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(screen.getByText('done')).toBeInTheDocument())
    expect(mocks.reauthenticate).toHaveBeenCalledWith('Segura123!')
    expect(mocks.action).toHaveBeenCalledTimes(2)
  })

  it('cancela sin reintentar ni solicitar contraseña al Core', async () => {
    mocks.action.mockRejectedValueOnce(new ApiError('Reautenticación', 401, 'REAUTHENTICATION_REQUIRED'))
    render(<ReauthenticationProvider><Harness /></ReauthenticationProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.getByText('cancelled')).toBeInTheDocument())
    expect(mocks.reauthenticate).not.toHaveBeenCalled()
    expect(mocks.action).toHaveBeenCalledTimes(1)
  })
})
