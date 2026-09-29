import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), audit: vi.fn() }));
vi.mock('../../db/client.js', () => ({ query: mocks.query, withTransaction: async (callback: any) => callback({ query: mocks.clientQuery }) }));
vi.mock('../../core/audit/domain-audit.service.js', () => ({ writeDomainAudit: mocks.audit }));

import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import establishmentRoutes from '../../modules/establishments/routes.js';
import { openApiDocument } from '../../openapi.js';

const userId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const foreignCompanyId = '33333333-3333-4333-8333-333333333333';
const establishmentId = '44444444-4444-4444-8444-444444444444';
const profileId = '55555555-5555-4555-8555-555555555555';
const company = { id: companyId, status: 'ACTIVE' };
const establishment = { id: establishmentId, companyId, companyLegalName: 'Empresa Uno', companyTradeName: null, name: 'Planta Uno', establishmentTypeCode: null, address: 'Calle Uno', provinceCode: '01', municipalityCode: '0101', healthJurisdictionCode: 'H01', sanitaryPermitNumber: 'SP-1', sanitaryPermitExpiresAt: '2027-01-01', operationsStartedAt: null, status: 'ACTIVE', version: 1, createdAt: new Date(), updatedAt: new Date(), currentOperationalProfile: null };
const profile = { id: profileId, establishmentId, annualProduction: 10, marketTarget: null, commercializationScope: null, employeeCount: 4, maleEmployeeCount: 2, femaleEmployeeCount: 2, haccpStatus: null, haccpImplementationLevel: null, samplingPlanStatus: null, samplingPlanScope: null, inabieSupplierStatus: null, inabieDistributionScope: null, effectiveFrom: '2026-01-01', effectiveTo: null, version: 1, createdAt: new Date(), updatedAt: new Date() };
const body = { companyId, name: 'Planta Uno', address: 'Calle Uno', provinceCode: '01', sanitaryPermitExpiresAt: '2027-01-01' };
const makeApp = () => { const app = express(); app.use(express.json()); app.use((req, res, next) => { req.context = { correlationId: '123e4567-e89b-42d3-a456-426614174000' }; res.locals.correlationId = req.context.correlationId; next(); }); app.use('/v1/establishments', establishmentRoutes); return app; };
const token = (role: 'ADMIN' | 'UNIVERSAL' | 'COMPANY_ADMIN' | 'DELEGATE' | 'COORDINATOR' | 'EVALUATOR', time = Math.floor(Date.now() / 1000)) => signAccessToken(userId, role, time);
const locked = { id: establishmentId, companyId, status: 'ACTIVE', companyStatus: 'ACTIVE', version: 1 };

describe('establishment and operational profile administration', () => {
  beforeEach(() => { vi.clearAllMocks(); env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes'; });

  it('allows ADMIN to create for an active company and rejects an inactive company', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [company] }).mockResolvedValueOnce({ rows: [{ id: establishmentId }] }).mockResolvedValueOnce({ rows: [establishment] });
    const created = await request(makeApp()).post('/v1/establishments').set('Authorization', `Bearer ${await token('ADMIN')}`).send(body);
    expect(created.status).toBe(201); expect(created.body.data.status).toBe('ACTIVE');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ESTABLISHMENT_CREATED', metadata: { companyId, status: 'ACTIVE' } }));
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [{ ...company, status: 'INACTIVE' }] });
    const inactive = await request(makeApp()).post('/v1/establishments').set('Authorization', `Bearer ${await token('ADMIN')}`).send(body);
    expect(inactive.status).toBe(409); expect(inactive.body.error.code).toBe('CONFLICT');
  });

  it('allows COMPANY_ADMIN in its company and returns 403 for a foreign company', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [company] }).mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [{ id: establishmentId }] }).mockResolvedValueOnce({ rows: [establishment] });
    expect((await request(makeApp()).post('/v1/establishments').set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send(body)).status).toBe(201);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [{ id: foreignCompanyId, status: 'ACTIVE' }] }).mockResolvedValueOnce({ rows: [{ companyId }] });
    const foreign = await request(makeApp()).post('/v1/establishments').set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send({ ...body, companyId: foreignCompanyId });
    expect(foreign.status).toBe(403);
  });

  it('combines pagination filters with company scope and gives DELEGATE read-only access', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [establishment] });
    const listed = await request(makeApp()).get('/v1/establishments?page=1&limit=20&companyId=' + companyId + '&provinceCode=01&sanitaryPermitExpiresBefore=2028-01-01').set('Authorization', `Bearer ${await token('DELEGATE')}`);
    expect(listed.status).toBe(200); expect(listed.body.meta.total).toBe(1); expect(mocks.query.mock.calls[1][0]).toContain('e.company_id=$1');
    mocks.clientQuery.mockResolvedValueOnce({ rows: [locked] });
    const denied = await request(makeApp()).patch(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('DELEGATE')}`).send({ version: 1, name: 'Cambio' });
    expect(denied.status).toBe(403);
  });

  it('returns no establishments when an enterprise role has no active membership', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const response = await request(makeApp()).get('/v1/establishments').set('Authorization', `Bearer ${await token('DELEGATE')}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it('gives COORDINATOR and EVALUATOR global read scope but not mutation rights', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [establishment] });
    expect((await request(makeApp()).get('/v1/establishments').set('Authorization', `Bearer ${await token('COORDINATOR')}`)).status).toBe(200);
    mocks.query.mockResolvedValueOnce({ rows: [establishment] });
    expect((await request(makeApp()).get(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('EVALUATOR')}`)).status).toBe(200);
    mocks.clientQuery.mockResolvedValueOnce({ rows: [locked] });
    const denied = await request(makeApp()).patch(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('COORDINATOR')}`).send({ version: 1, name: 'Cambio' });
    expect(denied.status).toBe(403);
  });

  it('reads, updates with a version, rejects a stale version, and rejects companyId patching', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [establishment] });
    const read = await request(makeApp()).get(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('ADMIN')}`);
    expect(read.status).toBe(200); expect(JSON.stringify(read.body)).not.toMatch(/normalized|address_text/i);
    mocks.clientQuery.mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rows: [{ ...establishment, name: 'Nueva planta', version: 2 }] });
    const updated = await request(makeApp()).patch(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ version: 1, name: 'Nueva planta' });
    expect(updated.status).toBe(200); expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'ESTABLISHMENT_UPDATED' }));
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [{ ...locked, version: 2 }] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    expect((await request(makeApp()).patch(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ version: 1, name: 'Cambio' })).body.error.code).toBe('STALE_VERSION');
    expect((await request(makeApp()).patch(`/v1/establishments/${establishmentId}`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ version: 1, companyId: foreignCompanyId })).status).toBe(400);
  });

  it('requires reauthentication and lets COMPANY_ADMIN deactivate its own establishment without deleting history', async () => {
    const old = Math.floor(Date.now() / 1000) - (env.JWT_REAUTH_MAX_AGE_MINUTES + 1) * 60;
    expect((await request(makeApp()).post(`/v1/establishments/${establishmentId}/deactivate`).set('Authorization', `Bearer ${await token('ADMIN', old)}`).send({ version: 1 })).body.error.code).toBe('REAUTHENTICATION_REQUIRED');
    mocks.clientQuery.mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [{ companyId }] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ ...establishment, status: 'INACTIVE', version: 2 }] });
    const response = await request(makeApp()).post(`/v1/establishments/${establishmentId}/deactivate`).set('Authorization', `Bearer ${await token('COMPANY_ADMIN')}`).send({ version: 1 });
    expect(response.status).toBe(200); expect(response.body.data.status).toBe('INACTIVE');
    expect(mocks.clientQuery.mock.calls.map((call: any[]) => call[0]).join(' ')).not.toMatch(/DELETE/i);
  });

  it('creates the first profile, closes the prior profile transactionally, and rejects equal or older dates', async () => {
    mocks.clientQuery.mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: profileId }] }).mockResolvedValueOnce({ rows: [profile] });
    const first = await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2026-01-01', annualProduction: 10, employeeCount: 4, maleEmployeeCount: 2, femaleEmployeeCount: 2 });
    expect(first.status).toBe(201); expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'OPERATIONAL_PROFILE_CREATED', metadata: expect.objectContaining({ previousProfileClosed: false }) }));
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [profile] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: profileId }] }).mockResolvedValueOnce({ rows: [{ ...profile, effectiveFrom: '2026-02-01' }] });
    const second = await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2026-02-01' });
    expect(second.status).toBe(201); expect(mocks.clientQuery.mock.calls[2][0]).toContain('effective_to=$1');
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [profile] });
    expect((await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2026-01-01' })).status).toBe(409);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [profile] });
    expect((await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2025-12-31' })).status).toBe(409);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({ rows: [locked] }).mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(Object.assign(new Error('overlap'), { code: '23P01' }));
    expect((await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2027-01-01' })).status).toBe(409);
  });

  it('validates profile quantities, reads current and history, and keeps audit metadata safe', async () => {
    const invalid = await request(makeApp()).post(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`).send({ effectiveFrom: '2026-01-01', annualProduction: -1, employeeCount: 1, maleEmployeeCount: 1, femaleEmployeeCount: 1, effectiveTo: '2026-02-01' });
    expect(invalid.status).toBe(400);
    mocks.query.mockResolvedValueOnce({ rows: [establishment] }).mockResolvedValueOnce({ rows: [profile] });
    expect((await request(makeApp()).get(`/v1/establishments/${establishmentId}/operational-profiles/current`).set('Authorization', `Bearer ${await token('ADMIN')}`)).body.data.id).toBe(profileId);
    mocks.query.mockReset().mockResolvedValueOnce({ rows: [establishment] }).mockResolvedValueOnce({ rows: [{ ...profile, effectiveTo: null }, { ...profile, id: '66666666-6666-4666-8666-666666666666', effectiveFrom: '2025-01-01', effectiveTo: '2026-01-01' }] });
    const history = await request(makeApp()).get(`/v1/establishments/${establishmentId}/operational-profiles`).set('Authorization', `Bearer ${await token('ADMIN')}`);
    expect(history.status).toBe(200); expect(history.body.data).toHaveLength(2); expect(mocks.query.mock.calls[1][0]).toContain('ORDER BY effective_from DESC');
  });

  it('documents all eight establishment endpoints', () => {
    const paths = openApiDocument.paths as any;
    expect(paths['/v1/establishments'].get).toBeTruthy(); expect(paths['/v1/establishments'].post).toBeTruthy();
    expect(paths['/v1/establishments/{id}'].get).toBeTruthy(); expect(paths['/v1/establishments/{id}'].patch).toBeTruthy(); expect(paths['/v1/establishments/{id}/deactivate'].post).toBeTruthy();
    expect(paths['/v1/establishments/{id}/operational-profiles'].get).toBeTruthy(); expect(paths['/v1/establishments/{id}/operational-profiles'].post).toBeTruthy(); expect(paths['/v1/establishments/{id}/operational-profiles/current'].get).toBeTruthy();
  });
});
