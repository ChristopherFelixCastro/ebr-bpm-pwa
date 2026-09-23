import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { beforeAll,beforeEach,describe,expect,it,vi } from 'vitest';

const dependencies=vi.hoisted(()=>({render:vi.fn(),upload:vi.fn(),remove:vi.fn(),sign:vi.fn(),read:vi.fn()}));
vi.mock('../../modules/inspection-reviews/report-renderer.js',()=>({renderPdf:dependencies.render}));
vi.mock('../../core/storage/storage.service.js',()=>({uploadPrivateObject:dependencies.upload,removePrivateObject:dependencies.remove,createShortLivedDownloadUrl:dependencies.sign,readPrivateObject:dependencies.read}));

import { env } from '../../config/env.js';
import { query,withTransaction } from '../../db/client.js';
import * as service from '../../modules/inspection-reviews/service.js';

const correlationId='123e4567-e89b-42d3-a456-426614174000';
let fixture:{inspectionId:string;evaluatorId:string;coordinatorId:string;adminId:string;itemId:string};
const actor=(userId:string,role:service.Actor['role'],age=0):service.Actor=>({userId,role,authTime:Math.floor(Date.now()/1000)-age});

async function setup(){
  const token=randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
  const op1=randomUUID(),op2=randomUUID();
  let sql=await readFile(new URL('../../../db/tests/0026_inspections_offline_calculations_api_guards.sql',import.meta.url),'utf8');
  sql=sql.replaceAll('0026',token)
    .replaceAll(`admin.${token}@example.test`,`admin.${token.toLowerCase()}@example.test`)
    .replaceAll(`evaluator.${token}@example.test`,`evaluator.${token.toLowerCase()}@example.test`)
    .replaceAll('26000000-0000-4000-8000-000000000001',op1).replaceAll('26000000-0000-4000-8000-000000000002',op2);
  await query(sql);
  const adminId=(await query<{id:string}>('SELECT id FROM users WHERE email_normalized=$1',[`admin.${token.toLowerCase()}@example.test`])).rows[0].id;
  const evaluatorId=(await query<{id:string}>('SELECT id FROM users WHERE email_normalized=$1',[`evaluator.${token.toLowerCase()}@example.test`])).rows[0].id;
  const coordinatorId=(await query<{id:string}>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code='COORDINATOR' RETURNING id`,[`Coordinator ${token}`,`coordinator.${token}@example.test`])).rows[0].id;
  const inspections=await query<any>(`SELECT i.id,i.status::text FROM inspections i JOIN bpm_template_versions v ON v.id=i.bpm_template_version_id JOIN bpm_templates t ON t.id=v.template_id WHERE t.code=$1 ORDER BY i.created_at`,[`EXECUTION_${token}`]);
  const inspectionId=inspections.rows.find(row=>row.status==='SUBMITTED').id;
  const auxiliary=inspections.rows.find(row=>row.status==='IN_PROGRESS').id;
  await withTransaction(async client=>{
    await client.query(`INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) SELECT $1,s.id,c.code,c.name,s.name,s.microbiological_risk,s.risk_score FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE c.risk_rule_version_id=(SELECT risk_rule_version_id FROM inspections WHERE id=$1) AND s.microbiological_risk IS NOT NULL ORDER BY s.risk_score DESC LIMIT 1`,[auxiliary]);
    await client.query("UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=$1",[auxiliary]);
    await client.query('SELECT recalculate_inspection($1,$2,$3)',[auxiliary,adminId,'Complete service fixture']);
    await client.query("UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=$1",[auxiliary]);
  });
  const itemId=(await query<{id:string}>(`SELECT b.id FROM bpm_template_items b JOIN inspections i ON i.bpm_template_version_id=b.template_version_id WHERE i.id=$1 AND b.display_code='C1'`,[inspectionId])).rows[0].id;
  return{inspectionId,evaluatorId,coordinatorId,adminId,itemId};
}

async function createApprovedInspection(){
  const inspectionId=await withTransaction(async client=>{
    const source=(await client.query<any>('SELECT evaluator_user_id,bpm_template_version_id,risk_rule_version_id FROM inspections WHERE id=$1',[fixture.inspectionId])).rows[0];
    const caseId=(await client.query<{id:string}>("INSERT INTO cases(origin,status) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT') RETURNING id")).rows[0].id;
    await client.query('INSERT INTO institutional_program_cases(case_id,reason,created_by_user_id) VALUES($1,$2,$3)',[caseId,'Report generation regression fixture',fixture.adminId]);
    const assignmentId=(await client.query<{id:string}>('INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES($1,$2,$3) RETURNING id',[caseId,source.evaluator_user_id,fixture.coordinatorId])).rows[0].id;
    const created=(await client.query<{id:string}>('INSERT INTO inspections(case_id,case_assignment_id,evaluator_user_id,bpm_template_version_id,risk_rule_version_id,created_by_user_id) VALUES($1,$2,$3,$4,$5,$3) RETURNING id',[caseId,assignmentId,source.evaluator_user_id,source.bpm_template_version_id,source.risk_rule_version_id])).rows[0].id;
    await client.query("UPDATE inspections SET status='IN_PROGRESS',started_at=clock_timestamp() WHERE id=$1",[created]);
    await client.query('INSERT INTO inspection_bpm_responses(inspection_id,bpm_item_id,response_value,observations) SELECT $1,bpm_item_id,response_value,observations FROM inspection_bpm_responses WHERE inspection_id=$2',[created,fixture.inspectionId]);
    await client.query('INSERT INTO inspection_risk_factor_selections(inspection_id,risk_factor_id,risk_factor_option_id) SELECT $1,risk_factor_id,risk_factor_option_id FROM inspection_risk_factor_selections WHERE inspection_id=$2',[created,fixture.inspectionId]);
    await client.query('INSERT INTO inspection_food_snapshots(inspection_id,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot) SELECT $1,food_risk_subcategory_id,category_code_snapshot,category_name_snapshot,subcategory_name_snapshot,microbiological_risk_snapshot,risk_score_snapshot FROM inspection_food_snapshots WHERE inspection_id=$2',[created,fixture.inspectionId]);
    await client.query("UPDATE inspections SET status='PENDING_SUBMISSION',finalized_at=clock_timestamp() WHERE id=$1",[created]);
    await client.query('SELECT recalculate_inspection($1,$2,$3)',[created,fixture.adminId,'Report generation regression fixture']);
    await client.query("UPDATE inspections SET status='SUBMITTED',submitted_at=clock_timestamp() WHERE id=$1",[created]);
    return created;
  });
  const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
  const review=await service.openReview(inspectionId,coordinator,correlationId);
  await service.approveReview(inspectionId,review.id,'Approved regression fixture',coordinator,correlationId);
  return inspectionId;
}

describe('review, official report and closure service with PostgreSQL',()=>{
  beforeAll(async()=>{fixture=await setup()});
  beforeEach(()=>{vi.clearAllMocks();const pdf=Buffer.from('%PDF-1.7\ncontrolled\n%%EOF');dependencies.render.mockResolvedValue(pdf);dependencies.read.mockResolvedValue(pdf);dependencies.upload.mockResolvedValue({storagePath:'private'});dependencies.remove.mockResolvedValue(undefined);dependencies.sign.mockResolvedValue({signedUrl:'https://signed.test/report',expiresInSeconds:60})});

  it('retains the prior active draft and object when regeneration rolls back after archival',async()=>{
    const inspectionId=await createApprovedInspection();
    const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    const prior=await service.generateReport(inspectionId,randomUUID(),coordinator,correlationId);
    const priorPath=dependencies.upload.mock.calls.at(-1)?.[0].storagePath as string;
    dependencies.remove.mockClear();

    await expect(service.generateReport(inspectionId,randomUUID(),coordinator,'invalid-correlation-id')).rejects.toBeTruthy();
    const newPath=dependencies.upload.mock.calls.at(-1)?.[0].storagePath as string;
    const reports=await query<any>('SELECT id,storage_path AS "storagePath",archived_at AS "archivedAt" FROM inspection_reports WHERE inspection_id=$1 ORDER BY generated_at',[inspectionId]);

    expect(reports.rows).toHaveLength(1);
    expect(reports.rows[0]).toMatchObject({id:prior.id,storagePath:priorPath,archivedAt:null});
    expect(dependencies.remove).toHaveBeenCalledTimes(1);
    expect(dependencies.remove).toHaveBeenCalledWith(newPath);
    expect(dependencies.remove).not.toHaveBeenCalledWith(priorPath);
  });

  it('serializes concurrent generation with the same operation id and deletes only the losing upload',async()=>{
    const inspectionId=await createApprovedInspection();
    const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    const operationId=randomUUID();
    const pdf=Buffer.from('%PDF-1.7\ncontrolled\n%%EOF');
    let releaseRender!:()=>void;
    const renderGate=new Promise<void>(resolve=>{releaseRender=resolve});
    let renderCount=0;
    dependencies.render.mockImplementation(async()=>{
      renderCount+=1;
      if(renderCount===2)releaseRender();
      await renderGate;
      return pdf;
    });

    const [first,second]=await Promise.all([
      service.generateReport(inspectionId,operationId,coordinator,correlationId),
      service.generateReport(inspectionId,operationId,coordinator,correlationId),
    ]);
    const uploadedPaths=dependencies.upload.mock.calls.map(call=>call[0].storagePath as string);
    const persisted=(await query<any>('SELECT id,storage_path AS "storagePath",archived_at AS "archivedAt" FROM inspection_reports WHERE generation_key=$1',[operationId])).rows;
    const activeCount=(await query<{count:number}>('SELECT count(*)::int count FROM inspection_reports WHERE inspection_id=$1 AND status=\'DRAFT\' AND archived_at IS NULL',[inspectionId])).rows[0].count;

    expect(first.id).toBe(second.id);
    expect(uploadedPaths).toHaveLength(2);
    expect(new Set(uploadedPaths).size).toBe(2);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({id:first.id,archivedAt:null});
    expect(activeCount).toBe(1);
    const losingPath=uploadedPaths.find(path=>path!==persisted[0].storagePath);
    expect(losingPath).toBeDefined();
    expect(dependencies.remove).toHaveBeenCalledTimes(1);
    expect(dependencies.remove).toHaveBeenCalledWith(losingPath);
    expect(dependencies.remove).not.toHaveBeenCalledWith(persisted[0].storagePath);
  });

  it('archives a prior draft and removes its object only after successful commit',async()=>{
    const inspectionId=await createApprovedInspection();
    const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    const prior=await service.generateReport(inspectionId,randomUUID(),coordinator,correlationId);
    const priorPath=dependencies.upload.mock.calls.at(-1)?.[0].storagePath as string;
    dependencies.remove.mockClear();
    let cleanupObservedCommittedState=false;
    dependencies.remove.mockImplementation(async path=>{
      if(path===priorPath){
        const state=(await query<any>('SELECT id,archived_at AS "archivedAt" FROM inspection_reports WHERE inspection_id=$1 ORDER BY generated_at',[inspectionId])).rows;
        expect(state.find(row=>row.id===prior.id)?.archivedAt).not.toBeNull();
        expect(state.filter(row=>row.archivedAt===null)).toHaveLength(1);
        cleanupObservedCommittedState=true;
      }
    });

    const regenerated=await service.generateReport(inspectionId,randomUUID(),coordinator,correlationId);
    const currentPath=dependencies.upload.mock.calls.at(-1)?.[0].storagePath as string;
    const reports=(await query<any>('SELECT id,storage_path AS "storagePath",archived_at AS "archivedAt" FROM inspection_reports WHERE inspection_id=$1 ORDER BY generated_at',[inspectionId])).rows;

    expect(regenerated.id).not.toBe(prior.id);
    expect(reports.find(row=>row.id===prior.id)?.archivedAt).not.toBeNull();
    expect(reports.find(row=>row.id===regenerated.id)).toMatchObject({storagePath:currentPath,archivedAt:null});
    expect(cleanupObservedCommittedState).toBe(true);
    expect(dependencies.remove).toHaveBeenCalledTimes(1);
    expect(dependencies.remove).toHaveBeenCalledWith(priorPath);
    expect(dependencies.remove).not.toHaveBeenCalledWith(currentPath);
  });

  it('rejects a generation-key collision from another inspection without archiving or deleting objects',async()=>{
    const firstInspectionId=await createApprovedInspection();
    const secondInspectionId=await createApprovedInspection();
    const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    const operationId=randomUUID();
    const first=await service.generateReport(firstInspectionId,operationId,coordinator,correlationId);
    const firstPath=dependencies.upload.mock.calls.at(-1)?.[0].storagePath as string;
    dependencies.render.mockClear();
    dependencies.upload.mockClear();
    dependencies.remove.mockClear();

    await expect(service.generateReport(secondInspectionId,operationId,coordinator,correlationId)).rejects.toMatchObject({code:'CONFLICT'});
    const reports=(await query<any>('SELECT id,inspection_id AS "inspectionId",storage_path AS "storagePath",archived_at AS "archivedAt" FROM inspection_reports WHERE inspection_id=ANY($1::uuid[]) ORDER BY generated_at',[[firstInspectionId,secondInspectionId]])).rows;

    expect(reports).toEqual([expect.objectContaining({id:first.id,inspectionId:firstInspectionId,storagePath:firstPath,archivedAt:null})]);
    expect(dependencies.render).not.toHaveBeenCalled();
    expect(dependencies.upload).not.toHaveBeenCalled();
    expect(dependencies.remove).not.toHaveBeenCalled();
  });

  it('executes correction, recalculation, PDF idempotency, officialization and closure',async()=>{
    const coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    const evaluator=actor(fixture.evaluatorId,'EVALUATOR');
    const opened=await service.openReview(fixture.inspectionId,coordinator,correlationId);
    await service.returnReview(fixture.inspectionId,opened.id,{reason:'Correct selected criterion',bpmItemIds:[fixture.itemId]},coordinator,correlationId);
    const version=(await query<{version:number}>('SELECT version FROM inspections WHERE id=$1',[fixture.inspectionId])).rows[0].version;
    await service.updateCorrection(fixture.inspectionId,opened.id,fixture.itemId,{baseVersion:version,responseValue:'C',observations:'<script>private</script>'},evaluator,correlationId);
    const resubmitted=await service.resubmit(fixture.inspectionId,opened.id,evaluator,correlationId);
    expect(resubmitted.calculationId).toMatch(/[0-9a-f-]{36}/);
    const approved=await service.approveReview(fixture.inspectionId,opened.id,'Ready',coordinator,correlationId);
    expect(approved.status).toBe('APPROVED');

    const operationId=randomUUID();
    const first=await service.generateReport(fixture.inspectionId,operationId,coordinator,correlationId);
    const retry=await service.generateReport(fixture.inspectionId,operationId,coordinator,correlationId);
    expect(retry.id).toBe(first.id);expect(dependencies.render).toHaveBeenCalledTimes(1);expect(dependencies.upload).toHaveBeenCalledTimes(1);
    const regenerated=await service.generateReport(fixture.inspectionId,randomUUID(),coordinator,correlationId);
    expect(regenerated.id).not.toBe(first.id);expect(dependencies.remove).toHaveBeenCalledWith(expect.stringMatching(/^official-report\//));
    const official=await service.officialize(fixture.inspectionId,regenerated.id,coordinator,correlationId);
    expect(official.status).toBe('OFFICIAL');
    expect(await service.download(fixture.inspectionId,regenerated.id,evaluator,correlationId)).toEqual({signedUrl:'https://signed.test/report',expiresInSeconds:60});
    const closed=await service.closeInspection(fixture.inspectionId,regenerated.id,'Completed',coordinator,correlationId);
    const same=await service.closeInspection(fixture.inspectionId,regenerated.id,'Completed',coordinator,correlationId);
    expect(same.id).toBe(closed.id);
    await expect(service.closeInspection(fixture.inspectionId,regenerated.id,'Different',coordinator,correlationId)).rejects.toMatchObject({code:'23505'});
    dependencies.remove.mockClear();
    await expect(service.generateReport(fixture.inspectionId,randomUUID(),coordinator,correlationId)).rejects.toBeTruthy();
    expect(dependencies.upload).toHaveBeenCalledTimes(3);expect(dependencies.remove).toHaveBeenCalledTimes(1);
    const persisted=await query<any>('SELECT size_bytes::int size,content_sha256 hash FROM inspection_reports WHERE id=$1',[regenerated.id]);
    const pdf=Buffer.from('%PDF-1.7\ncontrolled\n%%EOF');expect(persisted.rows[0].size).toBe(pdf.length);expect(persisted.rows[0].hash).toBe((await import('node:crypto')).createHash('sha256').update(pdf).digest('hex'));
    const serialized=JSON.stringify(await service.reports(fixture.inspectionId,evaluator));
    expect(serialized).not.toMatch(/storagePath|contentSha256|signedUrl|<script>|private<\/script>/i);
    const audits=await query<any>(`SELECT action,metadata::text FROM audit_events WHERE entity_id IN($1,$2,$3) ORDER BY occurred_at`,[opened.id,regenerated.id,closed.id]);
    expect(audits.rows.map(row=>row.action)).toEqual(expect.arrayContaining(['REVIEW_OPENED','REVIEW_RETURNED','REVIEW_RESUBMITTED','REVIEW_APPROVED','REPORT_OFFICIALIZED','INSPECTION_CLOSED']));
    expect(JSON.stringify(audits.rows)).not.toMatch(/Correct selected|Ready|Completed|storage|signed|script/i);
  });

  it('enforces all role boundaries and exceptional reauthentication before SQL mutation',async()=>{
    await expect(service.reviews(fixture.inspectionId,actor(fixture.adminId,'COMPANY_ADMIN'))).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(service.reviews(fixture.inspectionId,actor(fixture.adminId,'DELEGATE'))).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(service.openReview(fixture.inspectionId,actor(fixture.evaluatorId,'EVALUATOR'),correlationId)).rejects.toMatchObject({code:'FORBIDDEN'});
    env.JWT_REAUTH_MAX_AGE_MINUTES=15;
    await expect(service.returnReview(fixture.inspectionId,randomUUID(),{reason:'x',bpmItemIds:[fixture.itemId]},actor(fixture.adminId,'ADMIN',16*60),correlationId)).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(service.officialize(fixture.inspectionId,randomUUID(),actor(fixture.adminId,'UNIVERSAL',16*60),correlationId)).rejects.toMatchObject({code:'REAUTHENTICATION_REQUIRED'});
  });
});
