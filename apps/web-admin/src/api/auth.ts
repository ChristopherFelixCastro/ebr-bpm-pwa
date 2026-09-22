import type { components } from './generated/schema'
import { apiClient, clearAccessToken, restoreAccessToken, setAccessToken, unwrap } from './http'

export type CurrentUser = components['schemas']['CurrentUser']
export type RoleCode = CurrentUser['roleCode']

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
