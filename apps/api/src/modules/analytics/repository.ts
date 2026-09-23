import { query } from '../../db/client.js';
import type { ListEvaluationsInput } from './schemas.js';

const lifecycleExpression = `CASE
  WHEN closure.id IS NOT NULL THEN 'CLOSED'
  WHEN review.status IS NOT NULL THEN review.status::text
  WHEN i.status='SUBMITTED' THEN 'READY_FOR_REVIEW'
  ELSE i.status::text
END`;

const riskExpression = `CASE calculation.frequency
  WHEN 'ANNUAL' THEN 'LOW'
  WHEN 'SEMIANNUAL' THEN 'MEDIUM'
  WHEN 'QUARTERLY' THEN 'HIGH'
  ELSE NULL
END`;

const joins = `
  FROM inspections i
  JOIN cases c ON c.id=i.case_id
  LEFT JOIN companies company ON company.id=c.company_id
  LEFT JOIN establishments establishment ON establishment.id=c.establishment_id
  JOIN users evaluator ON evaluator.id=i.evaluator_user_id
  LEFT JOIN LATERAL (
    SELECT id,calculation_number,bpm_percentage,product_risk_score,establishment_risk_score,total_risk_score,frequency,calculated_at
    FROM inspection_calculations WHERE inspection_id=i.id AND is_current LIMIT 1
  ) calculation ON true
  LEFT JOIN LATERAL (
    SELECT id,cycle_number,status,return_count,return_reason,resubmitted_at,approved_at,created_at
    FROM inspection_review_cycles WHERE inspection_id=i.id
    ORDER BY (status<>'APPROVED') DESC,cycle_number DESC LIMIT 1
  ) review ON true
  LEFT JOIN LATERAL (
    SELECT id,status,file_name,verification_id,generated_at,official_at
    FROM inspection_reports WHERE inspection_id=i.id AND archived_at IS NULL
    ORDER BY (status='OFFICIAL') DESC,generated_at DESC LIMIT 1
  ) report ON true
  LEFT JOIN inspection_closures closure ON closure.inspection_id=i.id`;

const projection = `SELECT
  i.id,i.case_id AS "caseId",c.origin::text,c.priority::text,i.status::text AS "inspectionStatus",
  i.created_at AS "createdAt",i.started_at AS "startedAt",i.submitted_at AS "submittedAt",
  company.id AS "companyId",company.legal_name AS "companyName",company.trade_name AS "companyTradeName",
  establishment.id AS "establishmentId",establishment.name AS "establishmentName",
  evaluator.id AS "evaluatorUserId",evaluator.full_name AS "evaluatorName",
  ${lifecycleExpression} AS "lifecycleStatus",${riskExpression} AS "riskLevel",
  CASE WHEN calculation.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id',calculation.id,'calculationNumber',calculation.calculation_number,'bpmPercentage',calculation.bpm_percentage,
    'productRiskScore',calculation.product_risk_score,'establishmentRiskScore',calculation.establishment_risk_score,
    'totalRiskScore',calculation.total_risk_score,'frequency',calculation.frequency::text,'calculatedAt',calculation.calculated_at
  ) END AS "currentCalculation",
  CASE WHEN review.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id',review.id,'cycleNumber',review.cycle_number,'status',review.status::text,'returnCount',review.return_count,
    'returnReason',review.return_reason,'resubmittedAt',review.resubmitted_at,'approvedAt',review.approved_at,'createdAt',review.created_at
  ) END AS "currentReview",
  CASE WHEN report.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id',report.id,'status',report.status::text,'fileName',report.file_name,'verificationId',report.verification_id,
    'generatedAt',report.generated_at,'officialAt',report.official_at
  ) END AS "latestReport",
  CASE WHEN closure.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id',closure.id,'reportId',closure.official_report_id,'closedAt',closure.closed_at,'reason',closure.closure_reason
  ) END AS closure`;

const filters = (input: ListEvaluationsInput) => {
  const search = input.search ? `%${input.search.toLowerCase()}%` : null;
  const values: unknown[] = [
    search,
    input.companyId ?? null,
    input.establishmentId ?? null,
    input.lifecycleStatus ?? null,
    input.riskLevel ?? null,
    input.createdFrom ?? null,
    input.createdTo ?? null,
    input.reportStatus ?? null,
  ];
  const where = ` WHERE
    ($1::text IS NULL OR lower(COALESCE(company.legal_name,'')) LIKE $1 OR lower(COALESCE(company.trade_name,'')) LIKE $1
      OR lower(COALESCE(establishment.name,'')) LIKE $1 OR lower(evaluator.full_name) LIKE $1
      OR lower(i.id::text) LIKE $1 OR lower(i.case_id::text) LIKE $1)
    AND ($2::uuid IS NULL OR company.id=$2)
    AND ($3::uuid IS NULL OR establishment.id=$3)
    AND ($4::text IS NULL OR ${lifecycleExpression}=$4)
    AND ($5::text IS NULL OR ${riskExpression}=$5)
    AND ($6::timestamptz IS NULL OR i.created_at >= $6)
    AND ($7::timestamptz IS NULL OR i.created_at <= $7)
    AND ($8::text IS NULL OR report.status::text=$8)`;
  return { values, where };
};

export async function listEvaluations(input: ListEvaluationsInput) {
  const { values, where } = filters(input);
  const count = await query<{ total: string }>(`SELECT count(*)::text total${joins}${where}`, values);
  const result = await query<any>(`${projection}${joins}${where}
    ORDER BY COALESCE(closure.closed_at,report.official_at,review.approved_at,review.resubmitted_at,review.created_at,i.submitted_at,i.created_at) DESC,i.id DESC
    LIMIT $9 OFFSET $10`, [...values, input.limit, (input.page - 1) * input.limit]);
  return { rows: result.rows, total: Number(count.rows[0]?.total ?? 0) };
}

export async function evaluationDetail(id: string) {
  const result = await query<any>(`${projection}${joins} WHERE i.id=$1`, [id]);
  return result.rows[0];
}

export async function summary() {
  const result = await query<any>(`WITH analytics AS (
    SELECT ${lifecycleExpression} AS lifecycle_status,${riskExpression} AS risk_level,report.status::text AS report_status
    ${joins}
  ) SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE lifecycle_status='READY_FOR_REVIEW')::int AS "readyForReview",
    count(*) FILTER (WHERE lifecycle_status IN('PENDING_REVIEW','RESUBMITTED'))::int AS "pendingReview",
    count(*) FILTER (WHERE lifecycle_status='RETURNED_FOR_CORRECTION')::int AS "returnedForCorrection",
    count(*) FILTER (WHERE lifecycle_status='APPROVED')::int AS approved,
    count(*) FILTER (WHERE report_status='OFFICIAL')::int AS "officialReports",
    count(*) FILTER (WHERE lifecycle_status='CLOSED')::int AS closed,
    count(*) FILTER (WHERE risk_level='LOW')::int AS "lowRisk",
    count(*) FILTER (WHERE risk_level='MEDIUM')::int AS "mediumRisk",
    count(*) FILTER (WHERE risk_level='HIGH')::int AS "highRisk"
  FROM analytics`);
  const row = result.rows[0] ?? {};
  return {
    total: row.total ?? 0,
    readyForReview: row.readyForReview ?? 0,
    pendingReview: row.pendingReview ?? 0,
    returnedForCorrection: row.returnedForCorrection ?? 0,
    approved: row.approved ?? 0,
    officialReports: row.officialReports ?? 0,
    closed: row.closed ?? 0,
    byRisk: { LOW: row.lowRisk ?? 0, MEDIUM: row.mediumRisk ?? 0, HIGH: row.highRisk ?? 0 },
  };
}
