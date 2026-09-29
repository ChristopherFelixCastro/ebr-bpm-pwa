import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { CoreInspection } from '@ebr-bpm/core-client'
import { core } from '../api/core'
import { inspectStoredFieldState, syncFieldState } from './model'
import { listOfflinePackages } from '../offline/vault'
import { useSession } from '../session/SessionContext'

// Mantiene la cola en movimiento al reconectar aunque el usuario esté en otra pantalla.
// Nunca renueva permisos ni resuelve conflictos sin intervención de la persona.
export function BackgroundFieldSync() {
  const { user } = useSession()
  const { pathname } = useLocation()
  const [reconnected, setReconnected] = useState(0)
  const running = useRef(false)

  useEffect(() => {
    const retry = () => setReconnected((value) => value + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  useEffect(() => {
    if (!user || !['EVALUATOR', 'UNIVERSAL'].includes(user.roleCode) ||
      !navigator.onLine || !core.authenticated || pathname.startsWith('/campo/inspecciones/') || running.current) return
    running.current = true
    let cancelled = false
    void (async () => {
      let ids: string[]
      try { ids = await listOfflinePackages(user.id) } catch { return } // Vault bloqueado.
      for (const id of ids) {
        if (cancelled || !navigator.onLine || !core.authenticated) break
        try {
          const stored = await inspectStoredFieldState(user.id, id)
          if (stored.status !== 'READY' || stored.state.renewalConflict ||
            stored.state.queue.some((item) => item.status === 'CONFLICT' || item.status === 'REJECTED') ||
            !stored.state.queue.some((item) => item.status === 'PENDING' || item.status === 'SENDING')) continue
          const fresh = (await core.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`, { cache: 'no-store' })).data
          if (fresh.version !== stored.state.inspection.version || fresh.assignmentId !== stored.state.inspection.assignmentId ||
            fresh.status !== stored.state.inspection.status) continue
          await syncFieldState(user.id, id)
        } catch { /* La cola cifrada se conserva para el siguiente intento o revisión. */ }
      }
    })().finally(() => { running.current = false })
    return () => { cancelled = true }
  }, [pathname, reconnected, user])

  return null
}
