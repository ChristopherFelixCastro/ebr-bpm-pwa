import { describe, expect, it, vi } from 'vitest'
import { CoreClient } from '@ebr-bpm/core-client'

const envelope = (data: unknown) => new Response(JSON.stringify({ data, meta: { correlationId: 'test' } }), {
  status: 200, headers: { 'Content-Type': 'application/json' },
})

describe('restauración de sesión Core en el origen del portal', () => {
  it('renueva el token en /v1 y consulta /me sin persistir el token en storage', async () => {
    const fetcher = vi.fn(async (request: Request) => {
      if (request.url.endsWith('/v1/auth/refresh')) return envelope({ accessToken: 'access-test' })
      if (request.url.endsWith('/v1/auth/me')) {
        expect(request.headers.get('Authorization')).toBe('Bearer access-test')
        return envelope({ id: 'u1', fullName: 'Usuario', roleCode: 'ADMIN', status: 'APPROVED', companyId: null, authTime: 1 })
      }
      throw new Error('Ruta inesperada')
    })
    const client = new CoreClient({ baseUrl: 'http://localhost:5179', fetch: fetcher as typeof fetch })
    const restored = await client.restoreSession()
    expect(restored?.roleCode).toBe('ADMIN')
    expect(fetcher.mock.calls.map(([request]) => new URL(request.url).pathname)).toEqual(['/v1/auth/refresh', '/v1/auth/me'])
    expect(fetcher.mock.calls.every(([request]) => request.credentials === 'include')).toBe(true)
    expect(localStorage.length).toBe(0)
  })
})
