import createClient from 'openapi-fetch'
import type { components, paths } from './generated/schema'

type ErrorPayload = components['schemas']['ErrorResponse']

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL
  || globalThis.location?.origin
  || 'http://localhost'
).replace(/\/$/, '')
let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null
let sessionExpiredHandler: (() => void) | null = null

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string

  constructor(
    message: string,
    status: number,
    code: string,
    correlationId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.correlationId = correlationId
  }
}

const apiUrl = (path: string) => `${apiBaseUrl}${path}`

const readError = async (response: Response): Promise<ErrorPayload | null> => {
  try {
    return await response.clone().json() as ErrorPayload
  } catch {
    return null
  }
}

const expireSession = () => {
  accessToken = null
  sessionExpiredHandler?.()
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await globalThis.fetch(apiUrl('/v1/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        expireSession()
        return null
      }
      const payload = await response.json() as { data: components['schemas']['AccessToken'] }
      accessToken = payload.data.accessToken
      return accessToken
    } catch {
      expireSession()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export const authenticatedFetch: typeof fetch = async (input, init) => {
  const resolvedInput = typeof input === 'string' && input.startsWith('/')
    ? new URL(input, globalThis.location?.origin ?? 'http://localhost').toString()
    : input
  const request = new Request(resolvedInput, { ...init, credentials: 'include' })
  const retrySource = request.clone()
  const headers = new Headers(request.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await globalThis.fetch(new Request(request, { headers }))
  if (response.status !== 401) return response

  const failure = await readError(response)
  if (failure?.error.code === 'REAUTHENTICATION_REQUIRED') return response

  const path = new URL(request.url, globalThis.location?.origin ?? 'http://localhost').pathname
  if (path === '/v1/auth/login' || path === '/v1/auth/refresh' || path === '/v1/auth/reauthenticate') {
    return response
  }

  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) return response

  const retryHeaders = new Headers(retrySource.headers)
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
  const retryResponse = await globalThis.fetch(new Request(retrySource, { headers: retryHeaders, credentials: 'include' }))
  if (retryResponse.status === 401) {
    const retryFailure = await readError(retryResponse)
    if (retryFailure?.error.code !== 'REAUTHENTICATION_REQUIRED') expireSession()
  }
  return retryResponse
}

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
  credentials: 'include',
  fetch: authenticatedFetch,
})

export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  sessionExpiredHandler = handler
}

export const clearAccessToken = () => {
  accessToken = null
}

export const setAccessToken = (token: string) => {
  accessToken = token
}

export const restoreAccessToken = () => refreshAccessToken()

export const unwrap = <T>(result: { data?: { data: T }; error?: unknown; response: Response }): T => {
  if (result.data !== undefined) return result.data.data
  const payload = result.error as Partial<ErrorPayload> | undefined
  throw new ApiError(
    payload?.error?.message ?? 'No fue posible completar la solicitud.',
    result.response.status,
    payload?.error?.code ?? 'REQUEST_FAILED',
    payload?.meta?.correlationId,
  )
}

export const httpTesting = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string | null) => { accessToken = token },
  reset: () => {
    accessToken = null
    refreshPromise = null
    sessionExpiredHandler = null
  },
}
