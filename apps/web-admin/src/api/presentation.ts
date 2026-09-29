import { ApiError } from './http'

export const supportMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof ApiError)) return fallback
  const message = error.code === 'CONFLICT'
    ? 'No se cumplen las precondiciones funcionales de la operación.'
    : error.code === 'PAYLOAD_TOO_LARGE'
      ? 'El archivo supera el máximo permitido de 5 MiB.'
      : error.message
  return error.correlationId ? `${message} Referencia: ${error.correlationId}` : message
}

export const routeForError = (error: unknown): '/403' | '/404' | null => {
  if (!(error instanceof ApiError)) return null
  if (error.status === 403) return '/403'
  if (error.status === 404) return '/404'
  return null
}

export const isStaleVersion = (error: unknown) => error instanceof ApiError && error.code === 'STALE_VERSION'
