import { CoreApiError } from '@ebr-bpm/core-client'

export const supportMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof CoreApiError)) return fallback
  const message = error.code === 'CONFLICT' ? 'No se cumplen las condiciones de la operación.' : error.message
  return error.correlationId ? `${message} Referencia: ${error.correlationId}` : message
}
export const routeForError = (error: unknown) => error instanceof CoreApiError && error.status === 403 ? '/denegado' : error instanceof CoreApiError && error.status === 404 ? '/no-encontrado' : null
export const isStaleVersion = (error: unknown) => error instanceof CoreApiError && error.code === 'STALE_VERSION'
