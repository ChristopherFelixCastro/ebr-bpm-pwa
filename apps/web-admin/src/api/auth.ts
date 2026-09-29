import type { components } from './generated/schema'
import { apiClient, clearAccessToken, parseResponse, restoreAccessToken, setAccessToken, unwrap } from './http'

export type CurrentUser = components['schemas']['CurrentUser']
export type RoleCode = CurrentUser['roleCode']
export type RegisterRequest = { fullName: string; email: string; phone?: string; password: string; roleCode: 'COMPANY_ADMIN' | 'DELEGATE'; authorizationLetter: File }
export type User = components['schemas']['User']

const currentUser = async () => unwrap<CurrentUser>(await apiClient.GET('/v1/auth/me'))

export const authApi = {
  async login(email: string, password: string): Promise<CurrentUser> {
    const token = unwrap<components['schemas']['AccessToken']>(await apiClient.POST('/v1/auth/login', { body: { email, password } }))
    setAccessToken(token.accessToken)
    try {
      return await currentUser()
    } catch (error) {
      clearAccessToken()
      throw error
    }
  },

  async register(body: RegisterRequest): Promise<User> {
    const form = new FormData()
    form.set('fullName', body.fullName)
    form.set('email', body.email)
    if (body.phone) form.set('phone', body.phone)
    form.set('password', body.password)
    form.set('roleCode', body.roleCode)
    form.set('authorizationLetter', body.authorizationLetter)
    const base = (import.meta.env.VITE_API_BASE_URL || globalThis.location?.origin || 'http://localhost').replace(/\/$/, '')
    return parseResponse<User>(await globalThis.fetch(`${base}/v1/auth/register`, { method: 'POST', body: form, credentials: 'include' }))
  },

  async forgotPassword(email: string): Promise<{ requested: boolean }> {
    return unwrap<{ requested: boolean }>(await apiClient.POST('/v1/auth/forgot-password', { body: { email } }))
  },

  async restore(): Promise<CurrentUser | null> {
    const token = await restoreAccessToken()
    if (!token) return null
    try {
      return await currentUser()
    } catch {
      clearAccessToken()
      return null
    }
  },

  async logout(): Promise<void> {
    try {
      unwrap<{ loggedOut?: boolean }>(await apiClient.POST('/v1/auth/logout'))
    } finally {
      clearAccessToken()
    }
  },

  async reauthenticate(password: string): Promise<void> {
    const token = unwrap<components['schemas']['AccessToken']>(await apiClient.POST('/v1/auth/reauthenticate', { body: { password } }))
    setAccessToken(token.accessToken)
  },
}
