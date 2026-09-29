import { CoreApiError, type AnalyticsFilters, type CoreCalculation, type CoreClosure, type CoreReport, type CoreReview, type CoreWorkPackage, type AnalyticsEvaluation } from '@ebr-bpm/core-client';
import { core } from '../api/core';

export interface DetalleAnalitico {
  evaluation: AnalyticsEvaluation;
  workPackage: CoreWorkPackage;
  calculation: CoreCalculation | null;
  review: CoreReview | null;
  reports: CoreReport[];
  closure: CoreClosure | null;
}
const optional = async <T,>(request: Promise<{ data: T }>) => {
  try { return (await request).data; }
  catch (error) { if (error instanceof CoreApiError && error.code === 'NOT_FOUND') return null; throw error; }
};

export const servicioAnalitica = {
  async obtenerResumen() { return (await core.analyticsSummary()).data; },
  async listarEvaluaciones(filters: AnalyticsFilters = {}) { return core.analyticsEvaluations(filters); },
  async obtenerDetalle(id: string): Promise<DetalleAnalitico> {
    const [evaluation, workPackage, review, reports, closure] = await Promise.all([
      core.analyticsEvaluation(id).then((result) => result.data),
      core.workPackage(id).then((result) => result.data),
      optional(core.currentReview(id)),
      core.reports(id).then((result) => result.data),
      optional(core.closure(id)),
    ]);
    const calculation = evaluation.currentCalculation ? (await core.calculation(id, evaluation.currentCalculation.id)).data : null;
    return { evaluation, workPackage, calculation, review, reports, closure };
  },
};
