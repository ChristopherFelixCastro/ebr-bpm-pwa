import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), hash: vi.fn(), audit: vi.fn() }));
vi.mock('../../db/client.js', () => ({ query: mocks.query, withTransaction: async (callback: any) => callback({ query: mocks.clientQuery }) }));
vi.mock('../../core/auth/password.js', () => ({ hashPassword: mocks.hash, verifyPassword: vi.fn() }));
vi.mock('../../core/audit/domain-audit.service.js', () => ({ writeDomainAudit: mocks.audit }));

import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import userRoutes from '../../modules/users/routes.js';

const id = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.context = { correlationId: '123e4567-e89b-42d3-a456-426614174000' }; res.locals.correlationId = req.context.correlationId; next(); });
  app.use('/v1/users', userRoutes);
  return app;
};
const actorId = '33333333-3333-4333-8333-333333333333';
const token = () => signAccessToken(actorId, 'UNIVERSAL', Math.floor(Date.now() / 1000));

describe('user administration', () => {
  beforeEach(() => { vi.clearAllMocks(); env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes'; });

  it('lists safe paginated users with UNIVERSAL bypass', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [{ id, fullName: 'User', email: 'user@test.local', roleCode: 'ADMIN', version: 1 }] });
    const response = await request(makeApp()).get('/v1/users?page=1&limit=20').set('Authorization', `Bearer ${await token()}`);
    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(JSON.stringify(response.body)).not.toContain('password_hash');
  });

  it('creates a pending company user atomically', async () => {
    mocks.hash.mockResolvedValue('argon-hash');
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: 'role-id' }] }).mockResolvedValueOnce({ rows: [{ id }] }).mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({ rows: [{ id, status: 'PENDING_VALIDATION', roleCode: 'COMPANY_ADMIN', companyId, version: 1 }] });
    const response = await request(makeApp()).post('/v1/users').set('Authorization', `Bearer ${await token()}`).send({ fullName: 'Company User', email: 'company@test.local', password: 'LongPassword123!', roleCode: 'COMPANY_ADMIN', companyId });
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING_VALIDATION');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_CREATED' }));
    expect(JSON.stringify(response.body)).not.toContain('argon-hash');
  });

  it('rejects a stale update', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ roleCode: 'ADMIN', status: 'APPROVED', companyId: null }] }).mockResolvedValueOnce({ rows: [{ id: 'role-id' }] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const response = await request(makeApp()).patch(`/v1/users/${id}`).set('Authorization', `Bearer ${await token()}`).send({ version: 1, fullName: 'Changed' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STALE_VERSION');
  });

  it('deactivates a user and revokes refresh sessions', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ roleCode: 'ADMIN', status: 'APPROVED', companyId: null }] }).mockResolvedValueOnce({ rowCount: 1, rows: [{ id }] }).mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({ rows: [{ id, status: 'INACTIVE', version: 2 }] });
    const response = await request(makeApp()).post(`/v1/users/${id}/deactivate`).set('Authorization', `Bearer ${await token()}`).send({ version: 1 });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('INACTIVE');
    expect(mocks.clientQuery.mock.calls[2][0]).toContain('refresh_tokens');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_DEACTIVATED' }));
  });
});
