import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CoreUser } from '@ebr-bpm/core-client'
import App from '../App'
import { core } from '../api/core'
import { enrollOfflineIdentity, lockOfflineVault, saveOfflinePackage } from '../offline/vault'

afterEach(() => { cleanup(); lockOfflineVault(); vi.restoreAllMocks() })

it('abre desde la interfaz un paquete local después de recargar sin Core', async () => {
  const evaluator: CoreUser = { id: 'eval-ui', fullName: 'Evaluadora local', roleCode: 'EVALUATOR', status: 'APPROVED', companyId: null, authTime: Date.now() }
  await enrollOfflineIdentity(evaluator, 'clave-local')
  await saveOfflinePackage(evaluator.id, 'paquete-ui', { inspection: { id: 'paquete-ui' }, pending: ['respuesta local'] })
  lockOfflineVault() // La instancia App comienza sin ninguna clave en memoria.
  vi.spyOn(core, 'restoreSession').mockResolvedValue(null)
  vi.spyOn(core, 'request').mockRejectedValue(new Error('Core desconectado'))
  window.history.replaceState({}, '', '/acceso-sin-conexion')

  render(<App />)
  fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Cuenta evaluadora' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Evaluadora local' }))
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-local' } })
  fireEvent.click(screen.getByRole('button', { name: 'Desbloquear paquetes' }))
  expect(await screen.findByRole('heading', { name: 'Paquetes locales' })).toBeInTheDocument()
  fireEvent.click(await screen.findByText('paquete-ui'))
  expect(await screen.findByText(/respuesta local/)).toBeInTheDocument()
  expect(core.request).toHaveBeenCalledWith('/health/ready', expect.any(Object))
})
