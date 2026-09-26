import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { query, withTransaction } from '../../db/client.js';
import { docAction } from '../../modules/company-requests/service.js';

// Runs against the migrated database in DATABASE_URL: the status parameter must be typed consistently in PostgreSQL.
const correlationId = '123e4567-e89b-42d3-a456-426614174000';
type Fixture = { coordinatorId: string; companyAdminId: string; requestId: string };
let fixture: Fixture;

async function createFixture(): Promise<Fixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toLowerCase();
  return withTransaction(async (client) => {
    await client.query(`INSERT INTO roles(code,name,is_universal) VALUES('COORDINATOR','Coordinator',false),('COMPANY_ADMIN','Company administrator',false) ON CONFLICT(code) DO NOTHING`);
    const companyId = (await client.query<{ id: string }>('INSERT INTO companies(legal_name,rnc) VALUES($1,$2) RETURNING id', [`Docs ${suffix}`, `DOC-${suffix}`])).rows[0].id;
    const establishmentId = (await client.query<{ id: string }>('INSERT INTO establishments(company_id,name) VALUES($1,$2) RETURNING id', [companyId, `Plant ${suffix}`])).rows[0].id;
    const coordinatorId = (await client.query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='COORDINATOR' RETURNING id`, [`Coordinator ${suffix}`, `docs.coordinator.${suffix}@example.test`])).rows[0].id;
    const companyAdminId = (await client.query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='COMPANY_ADMIN' RETURNING id`, [`Company ${suffix}`, `docs.company.${suffix}@example.test`])).rows[0].id;
    await client.query('INSERT INTO user_company_memberships(user_id,company_id) VALUES($1,$2)', [companyAdminId, companyId]);
    const requestId = (await client.query<{ id: string }>('INSERT INTO company_requests(company_id,establishment_id,request_type,reason) VALUES($1,$2,$3,$4) RETURNING id', [companyId, establishmentId, 'CERTIFICACION_BPM', 'Document status regression'])).rows[0].id;
    return { coordinatorId, companyAdminId, requestId };
  });
}

async function addDocument(type: 'AUTHORIZATION_LETTER' | 'SUPPORTING_DOCUMENT') {
  return (await query<{ id: string; version: number }>(`INSERT INTO request_documents(request_id,document_type,storage_path,file_name,mime_type,size_bytes,status)
    VALUES($1,$2,$3,'letter.pdf','application/pdf',100,'PENDING') RETURNING id,version`, [fixture.requestId, type, `request-document/${fixture.requestId}/${randomUUID()}.pdf`])).rows[0];
}

describe('company request document status transitions', () => {
  beforeAll(async () => { fixture = await createFixture(); });

  it('validates a pending document and records the reviewer', async () => {
    const document = await addDocument('AUTHORIZATION_LETTER');
    const result = await docAction(fixture.requestId, document.id, document.version, 'VALID', undefined, { userId: fixture.coordinatorId, role: 'COORDINATOR' }, correlationId);
    expect(result).toMatchObject({ id: document.id, status: 'VALID' });
    const row = (await query<{ status: string; validatedBy: string; validatedAt: Date | null }>('SELECT status::text,validated_by_user_id AS "validatedBy",validated_at AS "validatedAt" FROM request_documents WHERE id=$1', [document.id])).rows[0];
    expect(row).toMatchObject({ status: 'VALID', validatedBy: fixture.coordinatorId });
    expect(row.validatedAt).not.toBeNull();
  });

  it('rejects with a reason and lets the company archive the rejected document', async () => {
    const document = await addDocument('SUPPORTING_DOCUMENT');
    await docAction(fixture.requestId, document.id, document.version, 'REJECTED', 'Documento ilegible', { userId: fixture.coordinatorId, role: 'COORDINATOR' }, correlationId);
    const rejected = (await query<{ status: string; reason: string; version: number }>('SELECT status::text,rejection_reason AS reason,version FROM request_documents WHERE id=$1', [document.id])).rows[0];
    expect(rejected).toMatchObject({ status: 'REJECTED', reason: 'Documento ilegible' });
    await docAction(fixture.requestId, document.id, rejected.version, 'ARCHIVED', undefined, { userId: fixture.companyAdminId, role: 'COMPANY_ADMIN' }, correlationId);
    const archived = (await query<{ status: string; archivedBy: string; deletedAt: Date | null }>('SELECT status::text,archived_by_user_id AS "archivedBy",deleted_at AS "deletedAt" FROM request_documents WHERE id=$1', [document.id])).rows[0];
    expect(archived).toMatchObject({ status: 'ARCHIVED', archivedBy: fixture.companyAdminId });
    expect(archived.deletedAt).not.toBeNull();
  });

  it('keeps optimistic concurrency on a stale version', async () => {
    const document = await addDocument('SUPPORTING_DOCUMENT');
    await expect(docAction(fixture.requestId, document.id, document.version + 1, 'VALID', undefined, { userId: fixture.coordinatorId, role: 'COORDINATOR' }, correlationId))
      .rejects.toMatchObject({ code: 'STALE_VERSION' });
  });
});
