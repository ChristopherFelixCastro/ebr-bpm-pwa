import express from 'express';
import request from 'supertest';
import { generateKeyPairSync, verify } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), workPackage: vi.fn() }));
vi.mock('../../db/client.js', () => ({ query: mocks.query }));
vi.mock('../../modules/inspection-execution/service.js', () => {
  class InspectionError extends Error { constructor(public code: string) { super(code); } }
  return { InspectionError, workPackage: mocks.workPackage };
});
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import routes from '../../modules/inspection-execution/routes.js';
import { canonical } from '../../modules/inspection-execution/offline-permit.js';

const inspectionId = '44444444-4444-4444-8444-444444444444';
const userId = '22222222-2222-4222-8222-222222222222';
const pair = generateKeyPairSync('ed25519');
const app = () => {
  const server = express(); server.use(express.json());
  server.use((req, res, next) => { req.context = { correlationId: '123e4567-e89b-42d3-a456-426614174000' }; res.locals.correlationId = req.context.correlationId; next(); });
  server.use('/v1', routes); return server;
};
const auth = async (role: string) => ({ Authorization: `Bearer ${await signAccessToken(userId, role as never, Math.floor(Date.now() / 1000))}` });

beforeEach(() => {
  vi.clearAllMocks(); env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes';
  env.OFFLINE_PERMIT_PRIVATE_KEY_BASE64 = pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
  mocks.query.mockResolvedValue({ rows: [{ status: 'APPROVED', roleCode: 'EVALUATOR' }] });
  mocks.workPackage.mockResolvedValue({ inspection: { id: inspectionId, status: 'IN_PROGRESS', version: 2 }, bpmTemplate: { items: [] }, generatedAt: new Date().toISOString() });
});

it('emite solo para cuenta aprobada con acceso, firma verificable y vigencia máxima 72h', async () => {
  const response = await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('EVALUATOR')).send({});
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  const { claims, signature } = response.body.data.permit;
  expect(claims).toMatchObject({ userId, roleCode: 'EVALUATOR', inspectionId });
  expect(Date.parse(claims.expiresAt) - Date.parse(claims.issuedAt)).toBeLessThanOrEqual(72 * 60 * 60 * 1000);
  expect(verify(null, Buffer.from(canonical(claims)), pair.publicKey, Buffer.from(signature, 'base64'))).toBe(true);
  expect(mocks.workPackage).toHaveBeenCalledWith(inspectionId, expect.objectContaining({ userId, role: 'EVALUATOR' }));
});
it('deniega rol, cuenta no aprobada, falta de acceso y estado no editable', async () => {
  expect((await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('COORDINATOR')).send({})).status).toBe(403);
  mocks.query.mockResolvedValueOnce({ rows: [{ status: 'PENDING', roleCode: 'EVALUATOR' }] });
  expect((await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('EVALUATOR')).send({})).status).toBe(403);
  const { InspectionError } = await import('../../modules/inspection-execution/service.js');
  mocks.workPackage.mockRejectedValueOnce(new InspectionError('FORBIDDEN'));
  expect((await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('EVALUATOR')).send({})).status).toBe(403);
  mocks.workPackage.mockResolvedValueOnce({ inspection: { id: inspectionId, status: 'SUBMITTED' } });
  expect((await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('EVALUATOR')).send({})).status).toBe(409);
});
it('responde 503 si la firma de Core no está configurada', async () => {
  env.OFFLINE_PERMIT_PRIVATE_KEY_BASE64 = undefined;
  const response = await request(app()).post(`/v1/inspections/${inspectionId}/offline-package`).set(await auth('EVALUATOR')).send({});
  expect(response.status).toBe(503);
  expect(response.body.error.code).toBe('OFFLINE_PERMIT_UNAVAILABLE');
});
