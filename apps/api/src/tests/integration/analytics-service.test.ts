import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../db/client.js', () => ({ query: mocks.query }));

import * as service from '../../modules/analytics/service.js';

const actor = (role: service.Actor['role']): service.Actor => ({ userId: '11111111-1111-4111-8111-111111111111', role, authTime: 1 });

describe('analytics Core projections', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries the filtered history with total count before the page and no local calculation', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: '7' }] }).mockResolvedValueOnce({ rows: [{ id: 'inspection-1', lifecycleStatus: 'CLOSED' }] });
    const result = await service.listEvaluations({ page: 2, limit: 3, lifecycleStatus: 'CLOSED', reportStatus: 'OFFICIAL' }, actor('ADMIN'));
    expect(result.total).toBe(7);
    expect(mocks.query.mock.calls[0][0]).toContain('inspection_closures');
    expect(mocks.query.mock.calls[1][0]).toContain('LIMIT $9 OFFSET $10');
    expect(mocks.query.mock.calls[1][1]).toEqual([null, null, null, 'CLOSED', null, null, null, 'OFFICIAL', 3, 3]);
  });

  it('derives the summary from stored current calculations and workflow tables', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ total: 3, readyForReview: 1, pendingReview: 1, returnedForCorrection: 0, approved: 0, officialReports: 1, closed: 1, lowRisk: 1, mediumRisk: 1, highRisk: 1 }] });
    const result = await service.summary(actor('COORDINATOR'));
    expect(result.byRisk).toEqual({ LOW: 1, MEDIUM: 1, HIGH: 1 });
    expect(mocks.query.mock.calls[0][0]).toContain('is_current');
    expect(mocks.query.mock.calls[0][0]).toContain('archived_at IS NULL');
  });

  it('rejects evaluator and enterprise roles before any global query', async () => {
    await expect(service.summary(actor('EVALUATOR'))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.listEvaluations({ page: 1, limit: 20 }, actor('COMPANY_ADMIN'))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
