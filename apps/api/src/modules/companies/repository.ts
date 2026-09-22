import type { QueryResult, QueryResultRow } from 'pg';
import type { CreateCompanyInput, ListCompaniesInput, PatchCompanyInput } from './schemas.js';

type Runner = { query: <T extends QueryResultRow>(text: string, values?: unknown[]) => Promise<QueryResult<T>> };

export type CompanyDto = {
  id: string;
  legalName: string;
  tradeName: string | null;
  rnc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  economicActivityCode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  establishmentCount: number;
  activeEstablishmentCount: number;
};

const projection = `
  SELECT c.id,
    c.legal_name AS "legalName", c.trade_name AS "tradeName", c.rnc,
    c.address_text AS address, c.phone, c.email,
    c.economic_activity_code AS "economicActivityCode", c.status::text AS status,
    c.version, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
    COUNT(e.id)::int AS "establishmentCount",
    COUNT(e.id) FILTER (WHERE e.status = 'ACTIVE')::int AS "activeEstablishmentCount"
  FROM companies c
  LEFT JOIN establishments e ON e.company_id = c.id`;

const groupBy = ` GROUP BY c.id`;

export async function findCompany(runner: Runner, companyId: string): Promise<CompanyDto | undefined> {
  const result = await runner.query<CompanyDto>(`${projection} WHERE c.id=$1${groupBy}`, [companyId]);
  return result.rows[0];
}

export async function listCompanies(runner: Runner, input: ListCompaniesInput, companyId?: string): Promise<{ rows: CompanyDto[]; total: number }> {
  const pattern = input.search ? `%${input.search.toLowerCase()}%` : null;
  const params: unknown[] = [pattern, input.status ?? null, companyId ?? null];
  const where = ` WHERE ($1::text IS NULL OR lower(c.legal_name) LIKE $1 OR lower(COALESCE(c.trade_name, '')) LIKE $1 OR c.rnc_normalized LIKE ('%' || normalize_identifier($1) || '%'))
    AND ($2::organization_status IS NULL OR c.status=$2)
    AND ($3::uuid IS NULL OR c.id=$3)`;
  const count = await runner.query<{ total: string }>(`SELECT count(*) AS total FROM companies c${where}`, params);
  params.push(input.limit, (input.page - 1) * input.limit);
  const listed = await runner.query<CompanyDto>(`${projection}${where}${groupBy} ORDER BY c.created_at DESC LIMIT $4 OFFSET $5`, params);
  return { rows: listed.rows, total: Number(count.rows[0]?.total ?? 0) };
}

export async function insertCompany(runner: Runner, input: CreateCompanyInput): Promise<string> {
  const result = await runner.query<{ id: string }>(
    `INSERT INTO companies(legal_name,trade_name,rnc,address_text,phone,email,economic_activity_code,status)
     VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE') RETURNING id`,
    [input.legalName, input.tradeName ?? null, input.rnc, input.address ?? null, input.phone ?? null, input.email ?? null, input.economicActivityCode ?? null],
  );
  return result.rows[0].id;
}

export async function lockCompany(runner: Runner, companyId: string): Promise<{ id: string; version: number; status: 'ACTIVE' | 'INACTIVE' } | undefined> {
  const result = await runner.query<{ id: string; version: number; status: 'ACTIVE' | 'INACTIVE' }>(
    `SELECT id,version,status::text AS status FROM companies WHERE id=$1 FOR UPDATE`, [companyId],
  );
  return result.rows[0];
}

export async function updateCompany(runner: Runner, companyId: string, input: PatchCompanyInput): Promise<boolean> {
  const result = await runner.query<QueryResultRow>(
    `UPDATE companies SET
       legal_name=COALESCE($1,legal_name),
       trade_name=CASE WHEN $2 THEN $3 ELSE trade_name END,
       rnc=COALESCE($4,rnc),
       address_text=CASE WHEN $5 THEN $6 ELSE address_text END,
       phone=CASE WHEN $7 THEN $8 ELSE phone END,
       email=CASE WHEN $9 THEN $10 ELSE email END,
       economic_activity_code=CASE WHEN $11 THEN $12 ELSE economic_activity_code END
     WHERE id=$13 AND version=$14`,
    [
      input.legalName ?? null,
      input.tradeName !== undefined, input.tradeName ?? null,
      input.rnc ?? null,
      input.address !== undefined, input.address ?? null,
      input.phone !== undefined, input.phone ?? null,
      input.email !== undefined, input.email ?? null,
      input.economicActivityCode !== undefined, input.economicActivityCode ?? null,
      companyId, input.version,
    ],
  );
  return Boolean(result.rowCount);
}

export async function deactivateActiveEstablishments(runner: Runner, companyId: string): Promise<number> {
  const result = await runner.query<QueryResultRow>(
    `UPDATE establishments SET status='INACTIVE' WHERE company_id=$1 AND status='ACTIVE'`, [companyId],
  );
  return result.rowCount ?? 0;
}

export async function deactivateCompany(runner: Runner, companyId: string): Promise<void> {
  await runner.query(`UPDATE companies SET status='INACTIVE' WHERE id=$1 AND status='ACTIVE'`, [companyId]);
}

export async function findActiveMembershipCompany(runner: Runner, userId: string): Promise<string | undefined> {
  const result = await runner.query<{ companyId: string }>(
    `SELECT m.company_id AS "companyId"
     FROM user_company_memberships m
     JOIN companies c ON c.id=m.company_id
     WHERE m.user_id=$1 AND m.effective_to IS NULL AND c.status='ACTIVE'`,
    [userId],
  );
  return result.rows[0]?.companyId;
}
