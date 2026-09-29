import { createContext, useContext, useState, type ReactNode } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { ApiError } from '../api/http'
import { useAuth } from './AuthContext'

type PendingAction = {
  run: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

type ReauthenticationContextValue = {
  runWithReauthentication: <T>(action: () => Promise<T>) => Promise<T>
}

export class ReauthenticationCancelledError extends Error {}

const ReauthenticationContext = createContext<ReauthenticationContextValue | null>(null)

export const ReauthenticationProvider = ({ children }: { children: ReactNode }) => {
  const { reauthenticate } = useAuth()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const runWithReauthentication = async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action()
    } catch (caught) {
      if (!(caught instanceof ApiError) || caught.code !== 'REAUTHENTICATION_REQUIRED') throw caught
      return new Promise<T>((resolve, reject) => {
        setPassword('')
        setError(null)
        setPending({ run: action, resolve: resolve as (value: unknown) => void, reject })
      })
    }
  }

  const close = () => {
    if (loading || !pending) return
    pending.reject(new ReauthenticationCancelledError('Reautenticación cancelada.'))
    setPending(null)
    setPassword('')
    setError(null)
  }

  const confirm = async () => {
    if (!pending || !password) return
    setLoading(true)
    setError(null)
    try {
      await reauthenticate(password)
      const result = await pending.run()
      pending.resolve(result)
      setPending(null)
      setPassword('')
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHENTICATED') {
        setError('La contraseña no es válida.')
      } else {
        pending.reject(caught)
        setPending(null)
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ReauthenticationContext.Provider value={{ runWithReauthentication }}>
      {children}
      <Dialog open={Boolean(pending)} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar identidad</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void confirm() }}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={loading}>Cancelar</Button>
          <Button variant="contained" onClick={() => void confirm()} disabled={loading || !password}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </ReauthenticationContext.Provider>
  )
}

export const useReauthentication = () => {
  const value = useContext(ReauthenticationContext)
  if (!value) throw new Error('useReauthentication debe usarse dentro de ReauthenticationProvider')
  return value
}
