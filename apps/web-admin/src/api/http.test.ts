import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './auth'
import { authenticatedFetch, httpTesting, setSessionExpiredHandler } from './http'

const correlationId = '123e4567-e89b-42d3-a456-426614174000'
const ok = (data: unknown) => new Response(JSON.stringify({ data, meta: { correlationId } }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})
const failure = (status: number, code: string) => new Response(JSON.stringify({
  error: { code, message: code },
  meta: { correlationId },
}), { status, headers: { 'Content-Type': 'application/json' } })

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Ana Empresa',
  roleCode: 'COMPANY_ADMIN' as const,
  status: 'APPROVED' as const,
  companyId: '22222222-2222-4222-8222-222222222222',
  authTime: 123,
}

describe('cliente HTTP y sesión', () => {
  beforeEach(() => httpTesting.reset())
  afterEach(() => vi.unstubAllGlobals())

  it('envía correo y contraseña, guarda el access token solo en memoria y consulta /me', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ accessToken: 'access-login' }))
      .mockResolvedValueOnce(ok(profile))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.login('ana@example.test', 'Segura123!')).resolves.toEqual(profile)
    const loginRequest = fetchMock.mock.calls[0][0] as Request
    await expect(loginRequest.clone().json()).resolves.toEqual({ email: 'ana@example.test', password: 'Segura123!' })
    expect(httpTesting.getAccessToken()).toBe('access-login')
    expect(localStorage.length).toBe(0)
  })

  it('restaura la sesión exclusivamente mediante refresh y luego /me', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ accessToken: 'access-refreshed' }))
      .mockResolvedValueOnce(ok(profile))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.restore()).resolves.toEqual(profile)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/auth/refresh')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: 'include', method: 'POST' }))
    expect(httpTesting.getAccessToken()).toBe('access-refreshed')
  })

  it('comparte una sola renovación entre 401 concurrentes y reintenta una vez', async () => {
    httpTesting.setAccessToken('expired')
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input)
      if (request.url.endsWith('/v1/auth/refresh')) {
        refreshCalls += 1
        await Promise.resolve()
        return ok({ accessToken: 'fresh' })
      }
      return request.headers.get('Authorization') === 'Bearer fresh'
        ? ok({ protected: true })
        : failure(401, 'UNAUTHENTICATED')
    })
    vi.stubGlobal('fetch', fetchMock)

    const responses = await Promise.all([
      authenticatedFetch('/v1/protected'),
      authenticatedFetch('/v1/protected'),
    ])

    expect(responses.every((response) => response.ok)).toBe(true)
    expect(refreshCalls).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('no trata REAUTHENTICATION_REQUIRED como refresh ni elimina la sesión ante 403', async () => {
    httpTesting.setAccessToken('current')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(401, 'REAUTHENTICATION_REQUIRED'))
      .mockResolvedValueOnce(failure(403, 'FORBIDDEN'))
    vi.stubGlobal('fetch', fetchMock)

    expect((await authenticatedFetch('/v1/sensitive')).status).toBe(401)
    expect((await authenticatedFetch('/v1/forbidden')).status).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(httpTesting.getAccessToken()).toBe('current')
  })

  it('conserva la sesión si el único reintento exige reautenticación después del refresh', async () => {
    httpTesting.setAccessToken('expired')
    const expiredHandler = vi.fn()
    setSessionExpiredHandler(expiredHandler)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(401, 'UNAUTHENTICATED'))
      .mockResolvedValueOnce(ok({ accessToken: 'fresh' }))
      .mockResolvedValueOnce(failure(401, 'REAUTHENTICATION_REQUIRED'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await authenticatedFetch('/v1/sensitive')

    expect(response.status).toBe(401)
    await expect(response.clone().json()).resolves.toEqual(expect.objectContaining({ error: expect.objectContaining({ code: 'REAUTHENTICATION_REQUIRED' }) }))
    expect(httpTesting.getAccessToken()).toBe('fresh')
    expect(expiredHandler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('reauthentica con contraseña y reemplaza el access token en memoria', async () => {
    httpTesting.setAccessToken('current')
    const fetchMock = vi.fn().mockResolvedValue(ok({ accessToken: 'reauthenticated' }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.reauthenticate('Segura123!')

    const request = fetchMock.mock.calls[0][0] as Request
    await expect(request.clone().json()).resolves.toEqual({ password: 'Segura123!' })
    expect(httpTesting.getAccessToken()).toBe('reauthenticated')
  })

  it('limpia el estado local al cerrar sesión aunque falle la red', async () => {
    httpTesting.setAccessToken('current')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(authApi.logout()).rejects.toThrow('network down')
    expect(httpTesting.getAccessToken()).toBeNull()
  })
})
