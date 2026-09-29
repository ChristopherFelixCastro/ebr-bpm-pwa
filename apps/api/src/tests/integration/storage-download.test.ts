import express from 'express';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sign: vi.fn(), query: vi.fn(), audit: vi.fn() }));
vi.mock('../../core/storage/supabase-storage.client.js', () => ({
  getSupabaseStorageClient: () => ({ storage: { from: () => ({ createSignedUrl: mocks.sign }) } }),
}));
vi.mock('../../db/client.js', () => ({ query: mocks.query }));
vi.mock('../../core/audit/domain-audit.service.js', () => ({ writeDomainAudit: mocks.audit }));

import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import routes from '../../modules/company-requests/routes.js';

const actor = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const documentId = '33333333-3333-4333-8333-333333333333';
const objectPath = `request-document/${requestId}/${documentId}.pdf`;
const endpoint = `/v1/company-requests/${requestId}/documents/${documentId}/download-url`;

const app = () => {
  const server = express();
  server.use((req, res, next) => { req.context = { correlationId: '44444444-4444-4444-8444-444444444444' }; res.locals.correlationId = req.context.correlationId; next(); });
  server.use('/v1/company-requests', routes);
  server.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: { code: 'INTERNAL_ERROR' } }));
  return server;
};
const auth = async () => ({ Authorization: `Bearer ${await signAccessToken(actor, 'COORDINATOR', 123)}` });
const documentInCore = () => {
  mocks.query.mockResolvedValueOnce({ rows: [{ id: requestId, companyId: '55555555-5555-4555-8555-555555555555' }] });
  mocks.query.mockResolvedValueOnce({ rows: [{ id: documentId, documentType: 'SUPPORTING_DOCUMENT', status: 'PENDING', archivedAt: null, deletedAt: null, storagePath: objectPath }] });
};

beforeEach(() => {
  vi.clearAllMocks();
  env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes';
  env.SUPABASE_STORAGE_BUCKET_PRIVATE = 'ebr-bpm-private';
  mocks.audit.mockResolvedValue(undefined);
});

it('devuelve 404 si Storage informa que el objeto no existe', async () => {
  documentInCore();
  mocks.sign.mockResolvedValue({ data: null, error: { statusCode: '404' } });
  const response = await request(app()).post(endpoint).set(await auth());
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('NOT_FOUND');
  expect(mocks.audit).not.toHaveBeenCalled();
});

it('devuelve 200 y una URL de 60 segundos para un objeto válido', async () => {
  documentInCore();
  mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://signed.test/temporary' }, error: null });
  const response = await request(app()).post(endpoint).set(await auth());
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({ signedUrl: 'https://signed.test/temporary', expiresInSeconds: 60 });
  expect(mocks.sign).toHaveBeenCalledWith(objectPath, 60);
});

it('devuelve 503 si createSignedUrl rechaza por EACCES', async () => {
  documentInCore();
  mocks.sign.mockRejectedValue(Object.assign(new Error('fetch failed'), { cause: Object.assign(new Error('network denied'), { code: 'EACCES' }) }));
  const response = await request(app()).post(endpoint).set(await auth());
  expect(response.status).toBe(503);
  expect(response.body.error.code).toBe('STORAGE_UNAVAILABLE');
  expect(JSON.stringify(response.body)).not.toContain(objectPath);
  expect(mocks.audit).not.toHaveBeenCalled();
});

it('devuelve 503 cuando falta la configuración de Storage', async () => {
  documentInCore();
  env.SUPABASE_STORAGE_BUCKET_PRIVATE = undefined;
  const response = await request(app()).post(endpoint).set(await auth());
  expect(response.status).toBe(503);
  expect(response.body.error.code).toBe('STORAGE_UNAVAILABLE');
});

it('no clasifica un error de programación ajeno como indisponibilidad de Storage', async () => {
  documentInCore();
  mocks.sign.mockRejectedValue(new TypeError('programming bug'));
  const response = await request(app()).post(endpoint).set(await auth());
  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe('INTERNAL_ERROR');
});
