import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreApiError } from '@ebr-bpm/core-client';

const mocks = vi.hoisted(() => ({
  analyticsSummary: vi.fn(), analyticsEvaluations: vi.fn(), analyticsEvaluation: vi.fn(),
  workPackage: vi.fn(), currentReview: vi.fn(), reports: vi.fn(), closure: vi.fn(), calculation: vi.fn(),
}));
vi.mock('../api/core', () => ({ core: mocks }));
import { servicioAnalitica } from './analitica';

describe('portal analytics service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes pagination and server filters through without local slicing', async () => {
    mocks.analyticsEvaluations.mockResolvedValue({ data: [{ id: 'inspection-2' }], meta: { page: 2, limit: 10, total: 37 } });
    const result = await servicioAnalitica.listarEvaluaciones({ page: 2, limit: 10, lifecycleStatus: 'CLOSED' });
    expect(mocks.analyticsEvaluations).toHaveBeenCalledWith({ page: 2, limit: 10, lifecycleStatus: 'CLOSED' });
    expect(result.meta.total).toBe(37);
    expect(result.data).toHaveLength(1);
  });

  it('loads current calculation snapshots and allows a missing review or closure', async () => {
    mocks.analyticsEvaluation.mockResolvedValue({ data: { id: 'inspection-1', currentCalculation: { id: 'calculation-1' } } });
    mocks.workPackage.mockResolvedValue({ data: { inspection: { id: 'inspection-1' } } });
    mocks.currentReview.mockRejectedValue(new CoreApiError(404, 'NOT_FOUND', 'No review'));
    mocks.reports.mockResolvedValue({ data: [] });
    mocks.closure.mockRejectedValue(new CoreApiError(404, 'NOT_FOUND', 'No closure'));
    mocks.calculation.mockResolvedValue({ data: { id: 'calculation-1', snapshots: { factors: [] } } });
    const detail = await servicioAnalitica.obtenerDetalle('inspection-1');
    expect(detail.review).toBeNull();
    expect(detail.closure).toBeNull();
    expect(detail.calculation?.id).toBe('calculation-1');
    expect(mocks.calculation).toHaveBeenCalledWith('inspection-1', 'calculation-1');
  });

  it('preserves non-404 failures instead of presenting a partial official record', async () => {
    mocks.analyticsEvaluation.mockResolvedValue({ data: { id: 'inspection-1', currentCalculation: null } });
    mocks.workPackage.mockResolvedValue({ data: {} });
    mocks.currentReview.mockRejectedValue(new CoreApiError(403, 'FORBIDDEN', 'Denied'));
    mocks.reports.mockResolvedValue({ data: [] });
    mocks.closure.mockResolvedValue({ data: null });
    await expect(servicioAnalitica.obtenerDetalle('inspection-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
