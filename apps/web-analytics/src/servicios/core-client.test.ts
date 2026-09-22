import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreApiError, CoreClient } from '@ebr-bpm/core-client';

afterEach(() => vi.unstubAllGlobals());

describe('contrato HTTP del Core', () => {
  it('verifica que la API y la base de datos estén listas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { status: 'ready' },
      meta: { correlationId: 'ready' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new CoreClient('http://127.0.0.1:3000');
    await expect(client.health()).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/health/ready');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
  });

  it('envía el JWT al consultar inspecciones y conserva los metadatos de paginación', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { accessToken: 'token-de-prueba' },
        meta: { correlationId: 'a' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { id: 'usuario', role: 'COORDINATOR', authTime: 1 },
        meta: { correlationId: 'b' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [],
        meta: { correlationId: 'c', page: 1, limit: 100, total: 0 },
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new CoreClient('http://127.0.0.1:3000');
    await client.login('coordinador@example.test', 'clave');
    const result = await client.inspections();

    expect(result.meta.total).toBe(0);
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:3000/v1/inspections?page=1&limit=100');
    const options = fetchMock.mock.calls[2][1] as RequestInit;
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token-de-prueba');
  });

  it('muestra el código de error que entrega el Core', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'FORBIDDEN', message: 'Operación no permitida.' },
      meta: { correlationId: 'd' },
    }), { status: 403 })));
    const client = new CoreClient('http://127.0.0.1:3000');
    await expect(client.cases()).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Operación no permitida.',
    } satisfies Partial<CoreApiError>);
  });
});
