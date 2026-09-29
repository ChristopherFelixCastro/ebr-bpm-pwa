import type { RoleCode } from '../api/auth'

export type RouteAccess = 'loading' | 'unauthenticated' | 'forbidden' | 'allowed'

export const portalRoles = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN', 'DELEGATE'] as const satisfies readonly RoleCode[]
export const operationalRoles = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN'] as const satisfies readonly RoleCode[]
export const userManagementRoles = ['ADMIN', 'UNIVERSAL'] as const satisfies readonly RoleCode[]

export const resolveRouteAccess = (
  isLoading: boolean,
  roleCode: RoleCode | null,
  allowedRoles: readonly RoleCode[],
): RouteAccess => {
  if (isLoading) return 'loading'
  if (!roleCode) return 'unauthenticated'
  return allowedRoles.includes(roleCode) ? 'allowed' : 'forbidden'
}
