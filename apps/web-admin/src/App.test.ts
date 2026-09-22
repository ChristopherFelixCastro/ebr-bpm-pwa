import { describe, expect, it } from 'vitest'
import { operationalRoles, resolveRouteAccess } from './routes/access'

describe('guard de rutas', () => {
  const allowed = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN', 'DELEGATE'] as const

  it('permite una ruta habilitada para el rol autenticado', () => {
    expect(resolveRouteAccess(false, 'ADMIN', allowed)).toBe('allowed')
  })

  it('deniega una ruta del portal a un rol no habilitado sin cerrar su sesión', () => {
    expect(resolveRouteAccess(false, 'EVALUATOR', allowed)).toBe('forbidden')
  })

  it('habilita las rutas operativas solo para ADMIN, UNIVERSAL y COMPANY_ADMIN', () => {
    expect(resolveRouteAccess(false, 'ADMIN', operationalRoles)).toBe('allowed')
    expect(resolveRouteAccess(false, 'UNIVERSAL', operationalRoles)).toBe('allowed')
    expect(resolveRouteAccess(false, 'COMPANY_ADMIN', operationalRoles)).toBe('allowed')
    expect(resolveRouteAccess(false, 'DELEGATE', operationalRoles)).toBe('forbidden')
    expect(resolveRouteAccess(false, 'COORDINATOR', operationalRoles)).toBe('forbidden')
    expect(resolveRouteAccess(false, 'EVALUATOR', operationalRoles)).toBe('forbidden')
  })
})
