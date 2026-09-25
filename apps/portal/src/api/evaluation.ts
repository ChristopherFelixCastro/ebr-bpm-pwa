import { CoreApiError, type AnalyticsEvaluation, type CoreCalculation, type CoreClosure, type CoreReport, type CoreReview, type CoreWorkPackage } from '@ebr-bpm/core-client'
import { core } from './core'

export type EvaluationDetail = {
  evaluation: AnalyticsEvaluation; workPackage: CoreWorkPackage; calculation: CoreCalculation | null
  review: CoreReview | null; reports: CoreReport[]; closure: CoreClosure | null
}
export type CorrectionInboxItem = {
  inspectionId: string; inspectionVersion: number; reviewId: string; returnCount: number
  returnReason: string; returnedAt: string; companyName: string | null; establishmentName: string | null
}
const optional = async <T,>(action: Promise<{ data: T }>): Promise<T | null> => {
  try { return (await action).data }
  catch (error) { if (error instanceof CoreApiError && error.code === 'NOT_FOUND') return null; throw error }
}
export async function evaluationDetail(id: string): Promise<EvaluationDetail> {
  const [evaluation, workPackage, review, reports, closure] = await Promise.all([
    core.analyticsEvaluation(id).then((result) => result.data), core.workPackage(id).then((result) => result.data),
    optional(core.currentReview(id)), core.reports(id).then((result) => result.data), optional(core.closure(id)),
  ])
  const calculation = evaluation.currentCalculation ? (await core.calculation(id, evaluation.currentCalculation.id)).data : null
  return { evaluation, workPackage, review, reports, closure, calculation }
}
export const correctionInbox = (page: number, limit: number) =>
  core.request<CorrectionInboxItem[]>(`/v1/review-corrections?page=${page}&limit=${limit}`)
export const saveCorrection = (id: string, reviewId: string, itemId: string, input: { baseVersion: number; responseValue: 'C' | 'CP' | 'IT' | 'NA'; observations: string | null }) =>
  core.request<{ version: number }>(`/v1/inspections/${encodeURIComponent(id)}/reviews/${encodeURIComponent(reviewId)}/corrections/${encodeURIComponent(itemId)}`, { method: 'PUT', body: JSON.stringify(input) })
export const resubmitCorrection = (id: string, reviewId: string) =>
  core.request<{ reviewId: string; calculationId: string; status: string }>(`/v1/inspections/${encodeURIComponent(id)}/reviews/${encodeURIComponent(reviewId)}/resubmit`, { method: 'POST', body: '{}' })
export const recalculate = (id: string, reason: string) =>
  core.request<CoreCalculation>(`/v1/inspections/${encodeURIComponent(id)}/calculations/recalculate`, { method: 'POST', body: JSON.stringify({ reason }) })
