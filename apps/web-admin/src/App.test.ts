import { describe, expect, it } from 'vitest'
import { resolveRouteAccess } from './routes/access'

describe('guard de rutas', () => {
  const allowed = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN', 'DELEGATE'] as const

  it('permite una ruta habilitada para el rol autenticado', () => {
    expect(resolveRouteAccess(false, 'ADMIN', allowed)).toBe('allowed')
  })

  it('deniega una ruta del portal a un rol no habilitado sin cerrar su sesión', () => {
    expect(resolveRouteAccess(false, 'EVALUATOR', allowed)).toBe('forbidden')
  })
})
