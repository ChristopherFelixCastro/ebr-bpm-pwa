import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import { core, coreAvailable, SESSION_EXPIRED_EVENT } from '../api/core'
import { enrollOfflineIdentity, lockOfflineVault, type OfflineIdentity, unlockOfflineIdentity } from '../offline/vault'

const LOGOUT_PENDING = 'ebr-bpm-portal-logout-pending'
type PendingAction = { run: () => Promise<unknown>; resolve: (result: unknown) => void; reject: (reason: unknown) => void }
export class ReauthenticationCancelledError extends Error { constructor() { super('Reautenticación cancelada.') } }
type SessionValue = {
  user: CoreUser | null
  offlineUser: OfflineIdentity | null
  offlineEnrollmentError: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<CoreUser>
  logout: () => Promise<void>
  lockOffline: () => void
  unlockOffline: (userId: string, password: string) => Promise<void>
  reauthenticate: (password: string) => Promise<void>
  runWithReauthentication: <T,>(action: () => Promise<T>) => Promise<T>
}

const Context = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CoreUser | null>(null)
  const [offlineUser, setOfflineUser] = useState<OfflineIdentity | null>(null)
  const [offlineEnrollmentError, setOfflineEnrollmentError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [password, setPassword] = useState('')
  const [reauthError, setReauthError] = useState('')
  const [reauthLoading, setReauthLoading] = useState(false)
  const boot = useRef<Promise<CoreUser | null> | null>(null)
  const pendingRef = useRef<PendingAction | null>(null)
  const sessionEpoch = useRef(0)

  const cancelPending = useCallback((message: string) => {
    const action = pendingRef.current
    pendingRef.current = null
    action?.reject(message === 'Reautenticación cancelada.' ? new ReauthenticationCancelledError() : new Error(message))
    setPending(null)
    setPassword('')
    setReauthError('')
    setReauthLoading(false)
  }, [])

  const clearSession = useCallback(() => {
    sessionEpoch.current += 1
    core.disconnect()
    setUser(null)
    setOfflineUser(null)
    setOfflineEnrollmentError(false)
    lockOfflineVault()
    cancelPending('La sesión terminó antes de confirmar la identidad.')
  }, [cancelPending])

  useEffect(() => {
    let active = true
    const expired = () => { if (active) clearSession() }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired)
    const bootEpoch = sessionEpoch.current
    boot.current ??= (async () => {
      if (localStorage.getItem(LOGOUT_PENDING)) {
        try {
          await core.logout()
          localStorage.removeItem(LOGOUT_PENDING)
        } catch { /* Permanecer desconectado y reintentar al abrir de nuevo. */ }
        return null
      }
      if (!navigator.onLine || !await coreAvailable()) return null
      return core.restoreSession()
    })()
    void boot.current.then((restored) => {
      if (active && bootEpoch === sessionEpoch.current) setUser(restored?.status === 'APPROVED' ? restored : null)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; window.removeEventListener(SESSION_EXPIRED_EVENT, expired) }
  }, [clearSession])

  const value = useMemo<SessionValue>(() => ({
    user, offlineUser, offlineEnrollmentError, loading,
    login: async (email, nextPassword) => {
      const epoch = sessionEpoch.current
      const authenticated = await core.login(email.trim().toLowerCase(), nextPassword)
      if (epoch !== sessionEpoch.current) { core.disconnect(); throw new Error('La sesión terminó durante el inicio de sesión.') }
      if (authenticated.status !== 'APPROVED') {
        core.disconnect()
        throw new CoreApiError(403, 'FORBIDDEN', 'La cuenta aún no está aprobada.')
      }
      sessionEpoch.current += 1
      localStorage.removeItem(LOGOUT_PENDING)
      lockOfflineVault()
      setOfflineUser(null)
      setOfflineEnrollmentError(false)
      setUser(authenticated)
      if (authenticated.roleCode === 'EVALUATOR') {
        // El enrolamiento local protege futuros paquetes; un fallo no altera el login Core.
        try { await enrollOfflineIdentity(authenticated, nextPassword) } catch { setOfflineEnrollmentError(true) }
      }
      return authenticated
    },
    logout: async () => {
      localStorage.setItem(LOGOUT_PENDING, '1')
      clearSession()
      try {
        await core.logout()
        localStorage.removeItem(LOGOUT_PENDING)
      } catch { /* El marcador evita restaurar hasta revocar el refresh pendiente. */ }
    },
    lockOffline: () => { lockOfflineVault(); setOfflineUser(null) },
    unlockOffline: async (userId, nextPassword) => {
      if (await coreAvailable()) throw new Error('Use el inicio de sesión normal cuando Core esté disponible.')
      const identity = await unlockOfflineIdentity(userId, nextPassword)
      setOfflineUser(identity)
    },
    reauthenticate: async (nextPassword) => {
      const epoch = sessionEpoch.current
      const authenticated = await core.reauthenticate(nextPassword)
      if (epoch !== sessionEpoch.current) throw new Error('La sesión terminó antes de confirmar la identidad.')
      setUser(authenticated)
    },
    runWithReauthentication: async <T,>(action: () => Promise<T>): Promise<T> => {
      const epoch = sessionEpoch.current
      try { return await action() }
      catch (error) {
        if (epoch !== sessionEpoch.current) throw new Error('La sesión terminó antes de confirmar la identidad.')
        if (!(error instanceof CoreApiError) || error.code !== 'REAUTHENTICATION_REQUIRED') throw error
        if (pendingRef.current) throw new Error('Ya hay una confirmación de identidad pendiente.')
        return new Promise<T>((resolve, reject) => {
          setPassword('')
          setReauthError('')
          const next = { run: action, resolve: resolve as (result: unknown) => void, reject }
          pendingRef.current = next
          setPending(next)
        })
      }
    },
  }), [user, offlineUser, offlineEnrollmentError, loading, clearSession])

  const cancel = () => {
    if (!pending || reauthLoading) return
    cancelPending('Reautenticación cancelada.')
  }
  const confirm = async () => {
    if (!pending || !password) return
    const epoch = sessionEpoch.current
    setReauthLoading(true)
    setReauthError('')
    try {
      const authenticated = await core.reauthenticate(password)
      if (epoch !== sessionEpoch.current || pendingRef.current !== pending) return
      setUser(authenticated)
      const result = await pending.run()
      if (epoch !== sessionEpoch.current || pendingRef.current !== pending) return
      pendingRef.current = null
      pending.resolve(result)
      setPending(null)
      setPassword('')
    } catch (error) {
      if (epoch !== sessionEpoch.current || pendingRef.current !== pending) return
      if (error instanceof CoreApiError && error.code === 'UNAUTHENTICATED') setReauthError('Contraseña incorrecta.')
      else { pendingRef.current = null; pending.reject(error); setPending(null); setPassword('') }
    } finally { setReauthLoading(false) }
  }

  return <Context.Provider value={value}>
    {children}
    <Dialog open={Boolean(pending)} onClose={cancel} fullWidth maxWidth="xs">
      <DialogTitle>Confirmar identidad</DialogTitle>
      <DialogContent>
        {reauthError && <Alert severity="error" sx={{ mb: 2 }}>{reauthError}</Alert>}
        <TextField autoFocus fullWidth label="Contraseña" type="password" value={password}
          onChange={(event) => setPassword(event.target.value)} disabled={reauthLoading} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={reauthLoading}>Cancelar</Button>
        <Button variant="contained" onClick={() => void confirm()} disabled={!password || reauthLoading}>Confirmar</Button>
      </DialogActions>
    </Dialog>
  </Context.Provider>
}

export function useSession() {
  const value = useContext(Context)
  if (!value) throw new Error('SessionProvider no disponible.')
  return value
}
