import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ listEvaluations: vi.fn(), evaluationDetail: vi.fn(), summary: vi.fn() }));
vi.mock('../../modules/analytics/service.js', () => {
  class AnalyticsError extends Error { constructor(public code: string) { super(code); } }
  return { AnalyticsError, ...mocks };
});

import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import analyticsRoutes from '../../modules/analytics/routes.js';
import { openApiDocument } from '../../openapi.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const inspectionId = '22222222-2222-4222-8222-222222222222';
const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.context = { correlationId: '123e4567-e89b-42d3-a456-426614174000' }; res.locals.correlationId = req.context.correlationId; next(); });
  app.use('/v1/analytics', analyticsRoutes);
  return app;
};
const auth = async (role: any) => ({ Authorization: `Bearer ${await signAccessToken(actorId, role, Math.floor(Date.now() / 1000))}` });

describe('analytics HTTP contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes';
    mocks.summary.mockResolvedValue({ total: 1, readyForReview: 1, pendingReview: 0, returnedForCorrection: 0, approved: 0, officialReports: 0, closed: 0, byRisk: { LOW: 1, MEDIUM: 0, HIGH: 0 } });
    mocks.listEvaluations.mockResolvedValue({ rows: [{ id: inspectionId, lifecycleStatus: 'READY_FOR_REVIEW' }], total: 1 });
    mocks.evaluationDetail.mockResolvedValue({ id: inspectionId, lifecycleStatus: 'READY_FOR_REVIEW' });
  });

  it.each(['ADMIN', 'COORDINATOR', 'UNIVERSAL'])('allows the %s read-only analytical scope', async (role) => {
    const headers = await auth(role);
    expect((await request(makeApp()).get('/v1/analytics/summary').set(headers)).status).toBe(200);
    const list = await request(makeApp()).get('/v1/analytics/evaluations?page=2&limit=10&riskLevel=HIGH').set(headers);
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 2, limit: 10, total: 1 });
    expect((await request(makeApp()).get(`/v1/analytics/evaluations/${inspectionId}`).set(headers)).status).toBe(200);
  });

  it('rejects roles outside analytics and validates the paginated filters', async () => {
    mocks.summary.mockRejectedValueOnce(new (await import('../../modules/analytics/service.js')).AnalyticsError('FORBIDDEN'));
    expect((await request(makeApp()).get('/v1/analytics/summary').set(await auth('EVALUATOR'))).status).toBe(403);
    expect((await request(makeApp()).get('/v1/analytics/evaluations?page=0&unknown=true').set(await auth('ADMIN'))).status).toBe(400);
    expect((await request(makeApp()).get('/v1/analytics/evaluations/not-a-uuid').set(await auth('ADMIN'))).status).toBe(400);
  });

  it('documents the real summary, paginated history and detail contracts', () => {
    const paths: any = openApiDocument.paths;
    for (const path of ['/v1/analytics/summary', '/v1/analytics/evaluations', '/v1/analytics/evaluations/{inspectionId}']) {
      expect(paths[path].get.security).toBeTruthy();
      expect(paths[path].get.responses['403']).toBeTruthy();
    }
    expect(paths['/v1/analytics/evaluations'].get.parameters.map((parameter: any) => parameter.name)).toContain('lifecycleStatus');
  });
});
