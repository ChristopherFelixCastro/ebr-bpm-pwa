import { CoreClient } from '@ebr-bpm/core-client'

export const SESSION_EXPIRED_EVENT = 'portal-session-expired'

// Única instancia: el token de acceso y la renovación concurrente viven aquí.
export const core = new CoreClient({
  onSessionExpired: () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)),
})

export async function coreAvailable(): Promise<boolean> {
  try {
    const health = await core.request<{ status: string }>('/health/ready', { signal: AbortSignal.timeout(3000), cache: 'no-store' })
    return health.data.status === 'ready'
  } catch { return false }
}
