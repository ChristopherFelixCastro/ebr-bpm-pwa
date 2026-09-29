import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), audit: vi.fn() }));
vi.mock('../../db/client.js', () => ({ query: mocks.query, withTransaction: async (callback: any) => callback({ query: mocks.clientQuery }) }));
vi.mock('../../core/audit/domain-audit.service.js', () => ({ writeDomainAudit: mocks.audit }));

import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import companyRoutes from '../../modules/companies/routes.js';
import { openApiDocument } from '../../openapi.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const otherCompanyId = '33333333-3333-4333-8333-333333333333';
const company = {
  id: companyId, legalName: 'Alimentos del Este, SRL', tradeName: 'Alimentos Este', rnc: '1-31-12345-6',
  address: 'Calle Uno 1', phone: '809-555-0100', email: 'contacto@example.test', economicActivityCode: 'C10',
  status: 'ACTIVE', version: 1, createdAt: new Date(), updatedAt: new Date(), establishmentCount: 2, activeEstablishmentCount: 2,
};
const createInput = { legalName: company.legalName, tradeName: company.tradeName, rnc: company.rnc, address: company.address, phone: company.phone, email: company.email, economicActivityCode: company.economicActivityCode };
const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.context = { correlationId: '123e4567-e89b-42d3-a456-426614174000' }; res.locals.correlationId = req.context.correlationId; next(); });
  app.use('/v1/companies', companyRoutes);
  return app;
};
const token = (role: 'ADMIN' | 'COMPANY_ADMIN' | 'DELEGATE' | 'UNIVERSAL', authTime = Math.floor(Date.now() / 1000)) => signAccessToken(actorId, role, authTime);

describe('company administration', () => {
  beforeEach(() => { vi.clearAllMocks(); env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes'; });

  it('creates an ACTIVE company as ADMIN with a safe DTO and audit allowlist event', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: companyId }] }).mockResolvedValueOnce({ rows: [company] });
    const response = await request(makeApp()).post('/v1/companies').set('Authorization', `Bearer ${await token('ADMIN')}`).send(createInput);
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('ACTIVE');
    expect(JSON.stringify(response.body)).not.toMatch(/normalized/i);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'COMPANY_CREATED', entityType: 'COMPANY', metadata: { status: 'ACTIVE' } }));
  });

  it('returns 409 CONFLICT for a duplicate normalized RNC', async () => {
    mocks.clientQuery.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    const response = await request(makeApp()).post('/v1/companies').set('Authorization', `Bearer ${await token('ADMIN')}`).send(createInput);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('lists the global, paginated scope for ADMIN', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [company] });
    const response = await request(makeApp()).get('/v1/companies?page=1&limit=20&status=ACTIVE&search=este').set('Authorization', `Bearer ${await token('ADMIN')}`);
    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(response.body.data).toHaveLength(1);
    expect(mocks.query.mock.calls[0][0]).toContain('rnc_normalized');
  });

  it('limits COMPANY_ADMIN listing to its server-resolved active membership', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [company] });
    const response = await request(makeApp()).get('/v1/companies').set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([expect.objectContaining({ id: companyId })]);
    expect(mocks.query.mock.calls[0][0]).toContain('user_company_memberships');
  });

  it('returns an empty list instead of global scope when COMPANY_ADMIN has no active membership', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(makeApp()).get('/v1/companies').set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it('lets COMPANY_ADMIN read its company but returns 403 for an existing foreign company', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [company] }).mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [company] });
    const own = await request(makeApp()).get(`/v1/companies/${companyId}`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`);
    expect(own.status).toBe(200);
    mocks.query.mockReset().mockResolvedValueOnce({ rows: [{ ...company, id: otherCompanyId }] }).mockResolvedValueOnce({ rows: [{ companyId }] });
    const foreign = await request(makeApp()).get(`/v1/companies/${otherCompanyId}`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`);
    expect(foreign.status).toBe(403);
    expect(foreign.body.error.code).toBe('FORBIDDEN');
  });

  it('updates the own company but rejects a foreign COMPANY_ADMIN update', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [company] }).mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [{ id: companyId, version: 1, status: 'ACTIVE' }] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rows: [{ ...company, legalName: 'Nombre actualizado', version: 2 }] });
    const own = await request(makeApp()).patch(`/v1/companies/${companyId}`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send({ version: 1, legalName: 'Nombre actualizado' });
    expect(own.status).toBe(200);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'COMPANY_UPDATED', metadata: { status: 'ACTIVE' } }));
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [{ ...company, id: otherCompanyId }] }).mockResolvedValueOnce({ rows: [{ companyId }] });
    const foreign = await request(makeApp()).patch(`/v1/companies/${otherCompanyId}`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send({ version: 1, legalName: 'No permitido' });
    expect(foreign.status).toBe(403);
  });

  it('returns STALE_VERSION and denies COMPANY_ADMIN creation and deactivation', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: companyId, version: 2, status: 'ACTIVE' }] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const stale = await request(makeApp()).patch(`/v1/companies/${companyId}`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ version: 1, legalName: 'Cambio' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
    const createDenied = await request(makeApp()).post('/v1/companies').set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send(createInput);
    const deactivateDenied = await request(makeApp()).post(`/v1/companies/${companyId}/deactivate`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send({ version: 1 });
    expect(createDenied.status).toBe(403);
    expect(deactivateDenied.status).toBe(403);
  });

  it('requires recent reauthentication before deactivation', async () => {
    const oldAuthTime = Math.floor(Date.now() / 1000) - ((env.JWT_REAUTH_MAX_AGE_MINUTES + 1) * 60);
    const response = await request(makeApp()).post(`/v1/companies/${companyId}/deactivate`).set('Authorization', `Bearer ${await token('ADMIN', oldAuthTime)}`).send({ version: 1 });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('REAUTHENTICATION_REQUIRED');
    expect(mocks.clientQuery).not.toHaveBeenCalled();
  });

  it('deactivates active establishments and company atomically and writes safe audit metadata', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [{ id: companyId, version: 1, status: 'ACTIVE' }] }).mockResolvedValueOnce({ rowCount: 2, rows: [] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rows: [{ ...company, status: 'INACTIVE', version: 2, activeEstablishmentCount: 0 }] });
    const response = await request(makeApp()).post(`/v1/companies/${companyId}/deactivate`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ version: 1 });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'INACTIVE', activeEstablishmentCount: 0 });
    expect(mocks.clientQuery.mock.calls[1][0]).toContain("UPDATE establishments SET status='INACTIVE'");
    expect(mocks.clientQuery.mock.calls[2][0]).toContain("UPDATE companies SET status='INACTIVE'");
    const audit = mocks.audit.mock.calls[0][0];
    expect(audit).toMatchObject({ action: 'COMPANY_DEACTIVATED', entityType: 'COMPANY', metadata: { status: 'INACTIVE', deactivatedEstablishmentCount: 2 } });
    expect(JSON.stringify(audit.metadata)).not.toMatch(/rnc|email|phone|address/i);
  });

  it('documents all five company routes in OpenAPI', () => {
    expect(openApiDocument.paths).toHaveProperty('/v1/companies');
    expect(openApiDocument.paths).toHaveProperty('/v1/companies/{id}');
    expect(openApiDocument.paths).toHaveProperty('/v1/companies/{id}/deactivate');
    expect((openApiDocument.paths['/v1/companies'] as any).get).toBeTruthy();
    expect((openApiDocument.paths['/v1/companies'] as any).post).toBeTruthy();
    expect((openApiDocument.paths['/v1/companies/{id}'] as any).get).toBeTruthy();
    expect((openApiDocument.paths['/v1/companies/{id}'] as any).patch).toBeTruthy();
    expect((openApiDocument.paths['/v1/companies/{id}/deactivate'] as any).post).toBeTruthy();
  });
});
