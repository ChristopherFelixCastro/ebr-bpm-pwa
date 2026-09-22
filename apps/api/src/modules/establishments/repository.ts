import type { QueryResult, QueryResultRow } from 'pg';
import type { CreateEstablishmentInput, CreateOperationalProfileInput, ListEstablishmentsInput, PatchEstablishmentInput } from './schemas.js';

type Runner = { query: <T extends QueryResultRow>(text: string, values?: unknown[]) => Promise<QueryResult<T>> };

export type OperationalProfileDto = {
  id: string; establishmentId: string; annualProduction: string | number | null; marketTarget: string | null; commercializationScope: string | null;
  employeeCount: number | null; maleEmployeeCount: number | null; femaleEmployeeCount: number | null; haccpStatus: string | null;
  haccpImplementationLevel: string | null; samplingPlanStatus: string | null; samplingPlanScope: string | null;
  inabieSupplierStatus: string | null; inabieDistributionScope: string | null; effectiveFrom: string; effectiveTo: string | null;
  version: number; createdAt: Date; updatedAt: Date;
};
export type EstablishmentDto = {
  id: string; companyId: string; companyLegalName: string; companyTradeName: string | null; name: string; establishmentTypeCode: string | null;
  address: string | null; provinceCode: string | null; municipalityCode: string | null; healthJurisdictionCode: string | null;
  sanitaryPermitNumber: string | null; sanitaryPermitExpiresAt: string | null; operationsStartedAt: string | null;
  status: 'ACTIVE' | 'INACTIVE'; version: number; createdAt: Date; updatedAt: Date; currentOperationalProfile: OperationalProfileDto | null;
};

const profileJson = `CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
  'id',p.id,'establishmentId',p.establishment_id,'annualProduction',p.annual_production,'marketTarget',p.market_target,
  'commercializationScope',p.commercialization_scope,'employeeCount',p.employee_count,'maleEmployeeCount',p.male_employee_count,
  'femaleEmployeeCount',p.female_employee_count,'haccpStatus',p.haccp_status,'haccpImplementationLevel',p.haccp_implementation_level,
  'samplingPlanStatus',p.sampling_plan_status,'samplingPlanScope',p.sampling_plan_scope,'inabieSupplierStatus',p.inabie_supplier_status,
  'inabieDistributionScope',p.inabie_distribution_scope,'effectiveFrom',p.effective_from,'effectiveTo',p.effective_to,
  'version',p.version,'createdAt',p.created_at,'updatedAt',p.updated_at) END`;
const establishmentProjection = `
  SELECT e.id,e.company_id AS "companyId",c.legal_name AS "companyLegalName",c.trade_name AS "companyTradeName",
    e.name,e.establishment_type_code AS "establishmentTypeCode",e.address_text AS address,e.province_code AS "provinceCode",
    e.municipality_code AS "municipalityCode",e.health_jurisdiction_code AS "healthJurisdictionCode",
    e.sanitary_permit_number AS "sanitaryPermitNumber",e.sanitary_permit_expires_at::text AS "sanitaryPermitExpiresAt",
    e.operations_started_at::text AS "operationsStartedAt",e.status::text AS status,e.version,e.created_at AS "createdAt",e.updated_at AS "updatedAt",
    ${profileJson} AS "currentOperationalProfile"
  FROM establishments e JOIN companies c ON c.id=e.company_id
  LEFT JOIN LATERAL (SELECT * FROM establishment_operational_profiles op WHERE op.establishment_id=e.id AND op.effective_to IS NULL) p ON true`;
const profileProjection = `SELECT id,establishment_id AS "establishmentId",annual_production AS "annualProduction",market_target AS "marketTarget",
  commercialization_scope AS "commercializationScope",employee_count AS "employeeCount",male_employee_count AS "maleEmployeeCount",
  female_employee_count AS "femaleEmployeeCount",haccp_status AS "haccpStatus",haccp_implementation_level AS "haccpImplementationLevel",
  sampling_plan_status AS "samplingPlanStatus",sampling_plan_scope AS "samplingPlanScope",inabie_supplier_status AS "inabieSupplierStatus",
  inabie_distribution_scope AS "inabieDistributionScope",effective_from::text AS "effectiveFrom",effective_to::text AS "effectiveTo",
  version,created_at AS "createdAt",updated_at AS "updatedAt" FROM establishment_operational_profiles`;

export async function findEstablishment(runner: Runner, id: string): Promise<EstablishmentDto | undefined> {
  const result = await runner.query<EstablishmentDto>(`${establishmentProjection} WHERE e.id=$1`, [id]);
  return result.rows[0];
}
export async function findCompanyStatus(runner: Runner, id: string): Promise<{ id: string; status: 'ACTIVE' | 'INACTIVE' } | undefined> {
  const result = await runner.query<{ id: string; status: 'ACTIVE' | 'INACTIVE' }>(`SELECT id,status::text AS status FROM companies WHERE id=$1`, [id]);
  return result.rows[0];
}
export async function findActiveMembershipCompany(runner: Runner, userId: string): Promise<string | undefined> {
  const result = await runner.query<{ companyId: string }>(`SELECT m.company_id AS "companyId" FROM user_company_memberships m JOIN companies c ON c.id=m.company_id WHERE m.user_id=$1 AND m.effective_to IS NULL AND c.status='ACTIVE'`, [userId]);
  return result.rows[0]?.companyId;
}
export async function listEstablishments(runner: Runner, input: ListEstablishmentsInput, scopedCompanyId?: string): Promise<{ rows: EstablishmentDto[]; total: number }> {
  const pattern = input.search ? `%${input.search.toLowerCase()}%` : null;
  const where = ` WHERE ($1::uuid IS NULL OR e.company_id=$1) AND ($2::uuid IS NULL OR e.company_id=$2)
    AND ($3::text IS NULL OR lower(e.name) LIKE $3 OR lower(COALESCE(e.sanitary_permit_number,'')) LIKE $3 OR lower(c.legal_name) LIKE $3 OR lower(COALESCE(c.trade_name,'')) LIKE $3)
    AND ($4::organization_status IS NULL OR e.status=$4) AND ($5::text IS NULL OR e.province_code=$5)
    AND ($6::text IS NULL OR e.municipality_code=$6) AND ($7::text IS NULL OR e.health_jurisdiction_code=$7)
    AND ($8::date IS NULL OR e.sanitary_permit_expires_at < $8)`;
  const params: unknown[] = [scopedCompanyId ?? null, input.companyId ?? null, pattern, input.status ?? null, input.provinceCode ?? null, input.municipalityCode ?? null, input.healthJurisdictionCode ?? null, input.sanitaryPermitExpiresBefore ?? null];
  const count = await runner.query<{ total: string }>(`SELECT count(*) AS total FROM establishments e JOIN companies c ON c.id=e.company_id${where}`, params);
  params.push(input.limit, (input.page - 1) * input.limit);
  const rows = await runner.query<EstablishmentDto>(`${establishmentProjection}${where} ORDER BY e.created_at DESC LIMIT $9 OFFSET $10`, params);
  return { rows: rows.rows, total: Number(count.rows[0]?.total ?? 0) };
}
export async function insertEstablishment(runner: Runner, input: CreateEstablishmentInput): Promise<string> {
  const result = await runner.query<{ id: string }>(`INSERT INTO establishments(company_id,name,establishment_type_code,address_text,province_code,municipality_code,health_jurisdiction_code,sanitary_permit_number,sanitary_permit_expires_at,operations_started_at,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE') RETURNING id`, [input.companyId,input.name,input.establishmentTypeCode ?? null,input.address ?? null,input.provinceCode ?? null,input.municipalityCode ?? null,input.healthJurisdictionCode ?? null,input.sanitaryPermitNumber ?? null,input.sanitaryPermitExpiresAt ?? null,input.operationsStartedAt ?? null]);
  return result.rows[0].id;
}
export async function lockEstablishment(runner: Runner, id: string): Promise<{ id: string; companyId: string; status: 'ACTIVE' | 'INACTIVE'; companyStatus: 'ACTIVE' | 'INACTIVE'; version: number } | undefined> {
  const result = await runner.query<{ id: string; companyId: string; status: 'ACTIVE' | 'INACTIVE'; companyStatus: 'ACTIVE' | 'INACTIVE'; version: number }>(`SELECT e.id,e.company_id AS "companyId",e.status::text AS status,c.status::text AS "companyStatus",e.version FROM establishments e JOIN companies c ON c.id=e.company_id WHERE e.id=$1 FOR UPDATE OF e,c`, [id]);
  return result.rows[0];
}
export async function updateEstablishment(runner: Runner, id: string, input: PatchEstablishmentInput): Promise<boolean> {
  const result = await runner.query<QueryResultRow>(`UPDATE establishments SET name=COALESCE($1,name),establishment_type_code=CASE WHEN $2 THEN $3 ELSE establishment_type_code END,address_text=CASE WHEN $4 THEN $5 ELSE address_text END,province_code=CASE WHEN $6 THEN $7 ELSE province_code END,municipality_code=CASE WHEN $8 THEN $9 ELSE municipality_code END,health_jurisdiction_code=CASE WHEN $10 THEN $11 ELSE health_jurisdiction_code END,sanitary_permit_number=CASE WHEN $12 THEN $13 ELSE sanitary_permit_number END,sanitary_permit_expires_at=CASE WHEN $14 THEN $15 ELSE sanitary_permit_expires_at END,operations_started_at=CASE WHEN $16 THEN $17 ELSE operations_started_at END WHERE id=$18 AND version=$19`, [input.name ?? null,input.establishmentTypeCode !== undefined,input.establishmentTypeCode ?? null,input.address !== undefined,input.address ?? null,input.provinceCode !== undefined,input.provinceCode ?? null,input.municipalityCode !== undefined,input.municipalityCode ?? null,input.healthJurisdictionCode !== undefined,input.healthJurisdictionCode ?? null,input.sanitaryPermitNumber !== undefined,input.sanitaryPermitNumber ?? null,input.sanitaryPermitExpiresAt !== undefined,input.sanitaryPermitExpiresAt ?? null,input.operationsStartedAt !== undefined,input.operationsStartedAt ?? null,id,input.version]);
  return Boolean(result.rowCount);
}
export async function deactivateEstablishment(runner: Runner, id: string): Promise<void> { await runner.query(`UPDATE establishments SET status='INACTIVE' WHERE id=$1 AND status='ACTIVE'`, [id]); }
export async function findCurrentProfile(runner: Runner, establishmentId: string, lock = false): Promise<OperationalProfileDto | undefined> {
  const result = await runner.query<OperationalProfileDto>(`${profileProjection} WHERE establishment_id=$1 AND effective_to IS NULL${lock ? ' FOR UPDATE' : ''}`, [establishmentId]);
  return result.rows[0];
}
export async function listProfiles(runner: Runner, establishmentId: string): Promise<OperationalProfileDto[]> {
  const result = await runner.query<OperationalProfileDto>(`${profileProjection} WHERE establishment_id=$1 ORDER BY effective_from DESC`, [establishmentId]);
  return result.rows;
}
export async function closeCurrentProfile(runner: Runner, id: string, effectiveTo: string): Promise<void> { await runner.query(`UPDATE establishment_operational_profiles SET effective_to=$1 WHERE id=$2 AND effective_to IS NULL`, [effectiveTo, id]); }
export async function insertProfile(runner: Runner, establishmentId: string, input: CreateOperationalProfileInput): Promise<string> {
  const result = await runner.query<{ id: string }>(`INSERT INTO establishment_operational_profiles(establishment_id,annual_production,market_target,commercialization_scope,employee_count,male_employee_count,female_employee_count,haccp_status,haccp_implementation_level,sampling_plan_status,sampling_plan_scope,inabie_supplier_status,inabie_distribution_scope,effective_from) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`, [establishmentId,input.annualProduction ?? null,input.marketTarget ?? null,input.commercializationScope ?? null,input.employeeCount ?? null,input.maleEmployeeCount ?? null,input.femaleEmployeeCount ?? null,input.haccpStatus ?? null,input.haccpImplementationLevel ?? null,input.samplingPlanStatus ?? null,input.samplingPlanScope ?? null,input.inabieSupplierStatus ?? null,input.inabieDistributionScope ?? null,input.effectiveFrom]);
  return result.rows[0].id;
}
export async function findProfile(runner: Runner, id: string): Promise<OperationalProfileDto | undefined> { const result = await runner.query<OperationalProfileDto>(`${profileProjection} WHERE id=$1`, [id]); return result.rows[0]; }
