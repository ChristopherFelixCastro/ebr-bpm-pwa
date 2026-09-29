import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreApiError, CoreClient } from './index.js';

const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ data, meta: { correlationId: 'corr-1' } }), { status, headers: { 'content-type': 'application/json' } });
const failure = (code: string, status = 401) => new Response(JSON.stringify({ error: { code, message: code }, meta: { correlationId: 'corr-1' } }), { status, headers: { 'content-type': 'application/json' } });

describe('CoreClient', () => {
  const fetcher = vi.fn<typeof fetch>();
  beforeEach(() => fetcher.mockReset());

  it('uses the HttpOnly refresh-cookie contract and the real roleCode user shape', async () => {
    fetcher.mockResolvedValueOnce(envelope({ accessToken: 'access-1' })).mockResolvedValueOnce(envelope({ id: 'user-1', fullName: 'Ana', roleCode: 'COORDINATOR', status: 'APPROVED', companyId: null, authTime: 1 }));
    const client = new CoreClient({ baseUrl: 'http://localhost:3000', fetch: fetcher });
    const user = await client.login('ana@example.test', 'secret');
    expect(user.roleCode).toBe('COORDINATOR');
    expect((fetcher.mock.calls[0][0] as Request).credentials).toBe('include');
    expect((fetcher.mock.calls[1][0] as Request).headers.get('authorization')).toBe('Bearer access-1');
  });

  it('shares one refresh rotation across simultaneous 401 responses and retries with the new token', async () => {
    let protectedCalls = 0;
    const requests: Request[] = [];
    const concurrentFetch: typeof fetch = async (input) => {
      const request = input as Request;
      requests.push(request);
      if (new URL(request.url).pathname === '/v1/auth/refresh') return envelope({ accessToken: 'access-2' });
      protectedCalls += 1;
      return request.headers.get('authorization') === 'Bearer access-2' ? envelope({ total: 0 }) : failure('UNAUTHENTICATED');
    };
    const client = new CoreClient({ baseUrl: 'http://localhost:3000', fetch: concurrentFetch });
    await Promise.all([client.analyticsSummary(), client.analyticsSummary()]);
    expect(requests.filter((request) => new URL(request.url).pathname === '/v1/auth/refresh')).toHaveLength(1);
    expect(protectedCalls).toBe(4);
  });

  it('does not hide the recent-reauthentication contract behind an automatic refresh', async () => {
    fetcher.mockResolvedValueOnce(failure('REAUTHENTICATION_REQUIRED'));
    const client = new CoreClient({ baseUrl: 'http://localhost:3000', fetch: fetcher });
    await expect(client.closeInspection('inspection-1', 'report-1')).rejects.toMatchObject<Partial<CoreApiError>>({ status: 401, code: 'REAUTHENTICATION_REQUIRED', correlationId: 'corr-1' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('encodes analytical filters and exposes Core pagination metadata', async () => {
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], meta: { correlationId: 'corr-1', page: 2, limit: 10, total: 21 } }), { status: 200 }));
    const client = new CoreClient({ baseUrl: 'http://localhost:3000', fetch: fetcher });
    const result = await client.analyticsEvaluations({ page: 2, limit: 10, search: 'Planta Norte', lifecycleStatus: 'CLOSED' });
    const url = new URL((fetcher.mock.calls[0][0] as Request).url);
    expect(url.searchParams.get('search')).toBe('Planta Norte');
    expect(url.searchParams.get('lifecycleStatus')).toBe('CLOSED');
    expect(result.meta.total).toBe(21);
  });
  it('lets the browser set the multipart boundary for private evidence', async () => {
    fetcher.mockResolvedValueOnce(envelope({ evidenceId: 'evidence-1', version: 2 }, 201));
    const client = new CoreClient({ baseUrl: 'http://localhost:3000', fetch: fetcher });
    const body = new FormData();
    body.set('file', new Blob(['%PDF-1.0'], { type: 'application/pdf' }), 'evidence.pdf');
    await client.request('/v1/inspections/inspection-1/evidence', { method: 'POST', body });
    const sent = fetcher.mock.calls[0][0] as Request;
    expect(sent.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
  });
});
