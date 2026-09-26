import type { CoreRole } from '@ebr-bpm/core-client'
import { core } from './core'

export type UserStatus = 'PENDING_VALIDATION' | 'APPROVED' | 'REJECTED' | 'INACTIVE'
export type LetterStatus = 'PENDING' | 'VALID' | 'REJECTED' | 'ARCHIVED'
export type PortalUser = {
  id: string; fullName: string; email: string; phone: string | null; status: UserStatus; version: number; roleCode: CoreRole
  companyId: string | null; companyName: string | null; createdAt: string; updatedAt: string; authorizationLetterStatus: Exclude<LetterStatus, 'ARCHIVED'> | null
}
export type UserCreate = { fullName: string; email: string; phone?: string; password: string; roleCode: CoreRole; companyId?: string }
export type UserPatch = { version: number; fullName?: string; phone?: string | null; roleCode?: CoreRole; companyId?: string | null }
export type AuthorizationLetter = {
  id: string; userId: string; status: LetterStatus; fileName: string; mimeType: string; sizeBytes: number; sha256: string
  uploadedByUserId: string; uploadedAt: string; reviewedByUserId: string | null; reviewedAt: string | null
  rejectionReason: string | null; archivedAt: string | null; version: number
}
export type UserQuery = { page: number; limit: number; search?: string; status?: UserStatus; roleCode?: CoreRole }
export type RegistrationInput = { fullName: string; email: string; phone?: string; password: string; roleCode: 'COMPANY_ADMIN' | 'DELEGATE'; authorizationLetter: File }

export const roleLabels: Record<CoreRole, string> = {
  ADMIN: 'Administrador', UNIVERSAL: 'Universal', COORDINATOR: 'Coordinador', EVALUATOR: 'Evaluador',
  COMPANY_ADMIN: 'Administrador de empresa', DELEGATE: 'Delegado de empresa',
}
export const statusLabels: Record<UserStatus, string> = { PENDING_VALIDATION: 'Pendiente de validación', APPROVED: 'Aprobada', REJECTED: 'Rechazada', INACTIVE: 'Inactiva' }
export const letterLabels: Record<LetterStatus, string> = { PENDING: 'Pendiente de revisión', VALID: 'Válida', REJECTED: 'Rechazada', ARCHIVED: 'Archivada' }
export const statusColor = (status: UserStatus) => status === 'APPROVED' ? 'success' : status === 'PENDING_VALIDATION' ? 'warning' : status === 'REJECTED' ? 'error' : 'default'
export const letterColor = (status: LetterStatus | null) => status === 'VALID' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'error' : 'default'
export const companyRoles: readonly CoreRole[] = ['COMPANY_ADMIN', 'DELEGATE']
// Solo mientras la cuenta espera aprobación o reactivación se adjunta o revisa su carta.
export const awaitingApproval = (status: UserStatus) => status === 'PENDING_VALIDATION' || status === 'INACTIVE'
export const validateLetterFile = (file: File) => !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
  ? 'La carta debe ser PDF, JPG o PNG.' : file.size > 5 * 1024 * 1024 ? 'La carta supera el máximo de 5 MB.' : null

const query = (values: UserQuery) => { const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) }); return `?${params}` }
const id = (value: string) => encodeURIComponent(value)
const post = async <T,>(url: string, body?: unknown) => (await core.request<T>(url, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).data

export const usersApi = {
  list: (values: UserQuery) => core.request<PortalUser[]>(`/v1/users${query(values)}`, { cache: 'no-store' }),
  get: async (userId: string) => (await core.request<PortalUser>(`/v1/users/${id(userId)}`, { cache: 'no-store' })).data,
  create: (body: UserCreate) => post<PortalUser>('/v1/users', body),
  update: async (userId: string, body: UserPatch) => (await core.request<PortalUser>(`/v1/users/${id(userId)}`, { method: 'PATCH', body: JSON.stringify(body) })).data,
  approve: (userId: string, version: number) => post<PortalUser>(`/v1/users/${id(userId)}/approve`, { version }),
  reject: (userId: string, version: number) => post<PortalUser>(`/v1/users/${id(userId)}/reject`, { version }),
  deactivate: (userId: string, version: number) => post<PortalUser>(`/v1/users/${id(userId)}/deactivate`, { version }),
  letters: async (userId: string) => (await core.request<AuthorizationLetter[]>(`/v1/users/${id(userId)}/authorization-letters`, { cache: 'no-store' })).data,
  uploadLetter: async (userId: string, file: File) => {
    const form = new FormData(); form.append('file', file)
    return (await core.request<AuthorizationLetter>(`/v1/users/${id(userId)}/authorization-letters`, { method: 'POST', body: form })).data
  },
  validateLetter: (userId: string, letterId: string, version: number) => post<AuthorizationLetter>(`/v1/users/${id(userId)}/authorization-letters/${id(letterId)}/validate`, { version }),
  rejectLetter: (userId: string, letterId: string, version: number, reason: string) => post<AuthorizationLetter>(`/v1/users/${id(userId)}/authorization-letters/${id(letterId)}/reject`, { version, reason }),
  letterDownloadUrl: (userId: string, letterId: string) => post<{ signedUrl: string; expiresInSeconds: number }>(`/v1/users/${id(userId)}/authorization-letters/${id(letterId)}/download-url`),
}

/** Registro público con la carta de autorización de la cuenta. Core no crea sesión. */
export async function registerAccount(input: RegistrationInput) {
  const form = new FormData()
  form.append('fullName', input.fullName.trim()); form.append('email', input.email.trim().toLowerCase())
  if (input.phone?.trim()) form.append('phone', input.phone.trim())
  form.append('password', input.password); form.append('roleCode', input.roleCode)
  form.append('authorizationLetter', input.authorizationLetter)
  return (await core.request<PortalUser>('/v1/auth/register', { method: 'POST', body: form })).data
}

/**
 * Opens a temporary download. The tab is opened synchronously within the click so popup blockers allow it,
 * then pointed at the signed URL once Core issues it. The URL is never stored.
 */
export async function openSignedDownload(issue: () => Promise<{ signedUrl: string }>) {
  const tab = window.open('about:blank', '_blank')
  try {
    const { signedUrl } = await issue()
    if (tab) { tab.opener = null; tab.location.href = signedUrl } else window.location.assign(signedUrl)
  } catch (error) { tab?.close(); throw error }
}
