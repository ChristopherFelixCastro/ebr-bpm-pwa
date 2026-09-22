import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
}));

vi.mock('../../core/storage/storage.service.js', () => ({
  uploadPrivateObject: storage.upload,
  removePrivateObject: storage.remove,
  createShortLivedDownloadUrl: storage.sign,
}));

import { env } from '../../config/env.js';
import { query, withTransaction } from '../../db/client.js';
import * as service from '../../modules/inspection-execution/service.js';

const correlationId = '123e4567-e89b-42d3-a456-426614174000';
type Fixture = { evaluatorId: string; otherEvaluatorId: string; inspectionId: string; otherInspectionId: string; bpmItemId: string };
let fixture: Fixture;

async function createFixture(): Promise<Fixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  return withTransaction(async (client) => {
    await client.query(`
      INSERT INTO roles(code,name,is_universal) VALUES
        ('ADMIN','Administrator',false),('UNIVERSAL','Universal',true),('COORDINATOR','Coordinator',false),('EVALUATOR','Evaluator',false)
      ON CONFLICT(code) DO NOTHING
    `);
    const admin = (await client.query<{ id: string }>(`
      INSERT INTO users(role_id,full_name,email,password_hash,status)
      SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='ADMIN' RETURNING id
    `, [`Service Admin ${suffix}`, `service.admin.${suffix.toLowerCase()}@example.test`])).rows[0].id;
    const evaluatorId = (await client.query<{ id: string }>(`
      INSERT INTO users(role_id,full_name,email,password_hash,status)
      SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='EVALUATOR' RETURNING id
    `, [`Service Evaluator ${suffix}`, `service.evaluator.${suffix.toLowerCase()}@example.test`])).rows[0].id;
    const otherEvaluatorId = (await client.query<{ id: string }>(`
      INSERT INTO users(role_id,full_name,email,password_hash,status)
      SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='EVALUATOR' RETURNING id
    `, [`Service Other ${suffix}`, `service.other.${suffix.toLowerCase()}@example.test`])).rows[0].id;

    const templateId = (await client.query<{ id: string }>('INSERT INTO bpm_templates(code,name) VALUES($1,$2) RETURNING id', [`SVC_${suffix}`, `Service ${suffix}`])).rows[0].id;
    const templateVersionId = (await client.query<{ id: string }>('INSERT INTO bpm_template_versions(template_id,version_number) VALUES($1,1) RETURNING id', [templateId])).rows[0].id;
    const sectionId = (await client.query<{ id: string }>(`
      INSERT INTO bpm_template_items(template_version_id,item_kind,title,display_code,sort_order,is_evaluable)
      VALUES($1,'SECTION','Section','S1',1,false) RETURNING id
    `, [templateVersionId])).rows[0].id;
    const subsectionId = (await client.query<{ id: string }>(`
      INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order,is_evaluable)
      VALUES($1,$2,'SUBSECTION','Subsection','SS1',1,false) RETURNING id
    `, [templateVersionId, sectionId])).rows[0].id;
    const bpmItemId = (await client.query<{ id: string }>(`
      INSERT INTO bpm_template_items(template_version_id,parent_item_id,item_kind,title,display_code,sort_order,is_evaluable,default_criticality)
      VALUES($1,$2,'CRITERION','Criterion','C1',1,true,'MAYOR') RETURNING id
    `, [templateVersionId, subsectionId])).rows[0].id;
    await client.query("UPDATE bpm_template_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=$1 WHERE id=$2", [admin, templateVersionId]);

    const ruleSetId = (await client.query<{ id: string }>('INSERT INTO risk_rule_sets(code,name) VALUES($1,$2) RETURNING id', [`SVC_${suffix}`, `Service ${suffix}`])).rows[0].id;
    const ruleVersionId = (await client.query<{ id: string }>('INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) VALUES($1,1) RETURNING id', [ruleSetId])).rows[0].id;
    const codes = ['VOLUME', 'HACCP', 'BPM', 'INABIE', 'REJECTIONS', 'SAMPLING'];
    for (const [index, code] of codes.entries()) {
      const factorId = (await client.query<{ id: string }>(
        'INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES($1,$2,$2,$3,$4) RETURNING id',
        [ruleVersionId, code, index < 4 ? 0.17 : 0.16, index + 1],
      )).rows[0].id;
      await client.query(`
        INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES
          ($1,'LOW','Low',1,1),($1,'MEDIUM_LOW','Medium low',1.67,2),
          ($1,'MEDIUM_HIGH','Medium high',2.33,3),($1,'HIGH','High',3,4)
      `, [factorId]);
    }
    const foodCategoryId = (await client.query<{ id: string }>(
      'INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order) VALUES($1,$2,$3,1) RETURNING id',
      [ruleVersionId, `FOOD_${suffix}`, 'Food'],
    )).rows[0].id;
    await client.query(
      "INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order) VALUES($1,'Applicable','HIGH',3,1)",
      [foodCategoryId],
    );
    await client.query(`
      INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES
        ($1,1,3.6,true,true,'ANNUAL','Annual',1),
        ($1,3.6,6.3,false,true,'SEMIANNUAL','Semiannual',2),
        ($1,6.3,NULL,false,false,'QUARTERLY','Quarterly',3)
    `, [ruleVersionId]);
    await client.query("UPDATE risk_rule_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=$1 WHERE id=$2", [admin, ruleVersionId]);

    const makeInspection = async () => {
      const caseId = (await client.query<{ id: string }>("INSERT INTO cases(origin,status) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT') RETURNING id")).rows[0].id;
      await client.query('INSERT INTO institutional_program_cases(case_id,reason) VALUES($1,$2)', [caseId, `Service test ${suffix}`]);
      const assignmentId = (await client.query<{ id: string }>('INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES($1,$2,$3) RETURNING id', [caseId, evaluatorId, admin])).rows[0].id;
      return (await client.query<{ id: string }>(`
        INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id)
        VALUES($1,$2,$3,$4,$5,$3) RETURNING id
      `, [caseId, assignmentId, evaluatorId, templateVersionId, ruleVersionId])).rows[0].id;
    };
    const inspectionId = await makeInspection();
    const otherInspectionId = await makeInspection();
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    return { evaluatorId, otherEvaluatorId, inspectionId, otherInspectionId, bpmItemId };
  });
}

const actor = (userId: string, role: service.Actor['role'] = 'EVALUATOR', ageSeconds = 0): service.Actor => ({
  userId,
  role,
  authTime: Math.floor(Date.now() / 1000) - ageSeconds,
});

const pdfFile = (content = '%PDF-service-test', name = 'proof.pdf'): Express.Multer.File => {
  const buffer = Buffer.from(content);
  return { fieldname: 'file', originalname: name, encoding: '7bit', mimetype: 'application/pdf', size: buffer.length, buffer, destination: '', filename: '', path: '', stream: undefined as never };
};

describe('inspection execution service idempotency', () => {
  beforeAll(async () => { fixture = await createFixture(); });
  beforeEach(() => {
    vi.clearAllMocks();
    storage.upload.mockResolvedValue({ storagePath: 'private' });
    storage.remove.mockResolvedValue(undefined);
    storage.sign.mockResolvedValue({ signedUrl: 'https://signed.test/private', expiresInSeconds: 60 });
  });

  it('serializes concurrent retries, returns an identical contract and applies the domain effect once', async () => {
    const payload = { bpmItemId: fixture.bpmItemId, responseValue: 'C' };
    const operation = {
      operationId: randomUUID(), operationType: 'UPSERT_BPM_RESPONSE' as const, baseVersion: 1,
      payload, payloadHash: service.hashOfflinePayload(payload), createdAt: new Date().toISOString(),
    };
    const evaluator = actor(fixture.evaluatorId);
    const [first, concurrent] = await Promise.all([
      service.offlineBatch(fixture.inspectionId, [operation], evaluator, correlationId),
      service.offlineBatch(fixture.inspectionId, [operation], evaluator, correlationId),
    ]);
    const retry = await service.offlineBatch(fixture.inspectionId, [operation], evaluator, correlationId);
    expect(concurrent).toEqual(first);
    expect(retry).toEqual(first);
    expect(first[0]).toMatchObject({ operationId: operation.operationId, status: 'APPLIED', currentVersion: 2, resultingVersion: 2, contentRevision: 2 });
    const state = await query<{ version: number; contentRevision: number; responses: string; operations: string }>(`
      SELECT i.version,i.content_revision AS "contentRevision",
        (SELECT count(*)::text FROM inspection_bpm_responses r WHERE r.inspection_id=i.id) responses,
        (SELECT count(*)::text FROM inspection_operations o WHERE o.operation_id=$2) operations
      FROM inspections i WHERE i.id=$1
    `, [fixture.inspectionId, operation.operationId]);
    expect(state.rows[0]).toMatchObject({ version: 2, contentRevision: 2, responses: '1', operations: '1' });
    expect((await query('SELECT 1 AS healthy')).rowCount).toBe(1);

    const incompatible = [
      () => service.offlineBatch(fixture.otherInspectionId, [operation], evaluator, correlationId),
      () => service.offlineBatch(fixture.inspectionId, [{ ...operation, operationType: 'DELETE_BPM_RESPONSE' as const }], evaluator, correlationId),
      () => service.offlineBatch(fixture.inspectionId, [{ ...operation, baseVersion: 2 }], evaluator, correlationId),
      () => service.offlineBatch(fixture.inspectionId, [operation], actor(fixture.otherEvaluatorId), correlationId),
    ];
    for (const attempt of incompatible) await expect(attempt()).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('verifies the canonical multipart hash, reuses one evidence and compensates Storage on rollback', async () => {
    const file = pdfFile();
    const operationId = randomUUID();
    const payloadHash = service.hashEvidenceUpload(file, 1);
    const evaluator = actor(fixture.evaluatorId);
    const options = { operationId, baseVersion: 1, payloadHash };
    const first = await service.uploadEvidence(fixture.otherInspectionId, file, evaluator, correlationId, options);
    const retry = await service.uploadEvidence(fixture.otherInspectionId, file, evaluator, correlationId, options);
    expect(retry).toEqual(first);
    expect(storage.upload).toHaveBeenCalledTimes(1);
    const persisted = await query<{ evidence: string; operations: string; version: number; contentRevision: number }>(`
      SELECT (SELECT count(*)::text FROM inspection_evidence e WHERE e.inspection_id=i.id) evidence,
        (SELECT count(*)::text FROM inspection_operations o WHERE o.operation_id=$2) operations,
        i.version,i.content_revision AS "contentRevision" FROM inspections i WHERE i.id=$1
    `, [fixture.otherInspectionId, operationId]);
    expect(persisted.rows[0]).toMatchObject({ evidence: '1', operations: '1', version: 2, contentRevision: 1 });

    await expect(service.uploadEvidence(fixture.otherInspectionId, pdfFile('%PDF-different'), evaluator, correlationId, options)).rejects.toMatchObject({ code: 'PAYLOAD_HASH_MISMATCH' });
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const jpeg = { ...pdfFile(), originalname: 'proof.jpg', mimetype: 'image/jpeg', size: jpegBuffer.length, buffer: jpegBuffer };
    await expect(service.uploadEvidence(fixture.otherInspectionId, jpeg, evaluator, correlationId, options)).rejects.toMatchObject({ code: 'PAYLOAD_HASH_MISMATCH' });
    await expect(service.uploadEvidence(fixture.otherInspectionId, pdfFile('%PDF-service-test-extra'), evaluator, correlationId, options)).rejects.toMatchObject({ code: 'PAYLOAD_HASH_MISMATCH' });
    await expect(service.uploadEvidence(fixture.inspectionId, file, evaluator, correlationId, options)).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(service.uploadEvidence(fixture.otherInspectionId, file, actor(fixture.otherEvaluatorId), correlationId, options)).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    const baseTwo = { ...options, baseVersion: 2, payloadHash: service.hashEvidenceUpload(file, 2) };
    await expect(service.uploadEvidence(fixture.otherInspectionId, file, evaluator, correlationId, baseTwo)).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    const foreignPayload = { bpmItemId: fixture.bpmItemId, responseValue: 'C' };
    await expect(service.offlineBatch(fixture.otherInspectionId, [{
      operationId, operationType: 'UPSERT_BPM_RESPONSE', baseVersion: 1, payload: foreignPayload,
      payloadHash: service.hashOfflinePayload(foreignPayload), createdAt: new Date().toISOString(),
    }], evaluator, correlationId)).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });

    const compensationId = randomUUID();
    const compensation = { operationId: compensationId, baseVersion: 2, payloadHash: service.hashEvidenceUpload(file, 2) };
    await expect(service.uploadEvidence(fixture.otherInspectionId, file, evaluator, 'invalid-correlation-id', compensation)).rejects.toBeTruthy();
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect((await query<{ count: string }>('SELECT count(*)::text count FROM inspection_operations WHERE operation_id=$1', [compensationId])).rows[0].count).toBe('0');
    expect((await query<{ count: string }>('SELECT count(*)::text count FROM inspection_evidence WHERE inspection_id=$1', [fixture.otherInspectionId])).rows[0].count).toBe('1');
  });

  it('requires recent authentication from ADMIN, UNIVERSAL and COORDINATOR', () => {
    env.JWT_REAUTH_MAX_AGE_MINUTES = 15;
    for (const role of ['ADMIN', 'UNIVERSAL', 'COORDINATOR'] as const) {
      expect(() => service.assertUnlockAuthorization(actor(fixture.evaluatorId, role, 60))).not.toThrow();
      expect(() => service.assertUnlockAuthorization(actor(fixture.evaluatorId, role, 16 * 60))).toThrowError(expect.objectContaining({ code: 'REAUTHENTICATION_REQUIRED' }));
    }
    expect(() => service.assertUnlockAuthorization(actor(fixture.evaluatorId, 'EVALUATOR'))).toThrowError(expect.objectContaining({ code: 'FORBIDDEN' }));
  });
});
