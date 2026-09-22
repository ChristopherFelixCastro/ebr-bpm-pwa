import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const storage=vi.hoisted(()=>({render:vi.fn(),upload:vi.fn(),remove:vi.fn(),sign:vi.fn(),read:vi.fn()}));
vi.mock('../../modules/inspection-reviews/report-renderer.js',()=>({renderPdf:storage.render}));
vi.mock('../../core/storage/storage.service.js',()=>({uploadPrivateObject:storage.upload,removePrivateObject:storage.remove,createShortLivedDownloadUrl:storage.sign,readPrivateObject:storage.read}));

import { query,withTransaction } from '../../db/client.js';
import * as bpmAdmin from '../../modules/bpm-template-administration/service.js';
import * as riskAdmin from '../../modules/risk-rule-administration/service.js';
import * as execution from '../../modules/inspection-execution/service.js';
import * as reviews from '../../modules/inspection-reviews/service.js';
import { importBpm,importRisk } from '../../modules/official-imports/service.js';
import { canonicalJson,sha256 } from '../../modules/official-imports/model.js';
import type { BpmManifest,RiskManifest } from '../../modules/official-imports/manifests.js';

const correlationId='123e4567-e89b-42d3-a456-426614174000';
const actor=(userId:string,role:any)=>({userId,role,authTime:Math.floor(Date.now()/1000)});
let fixture:{adminId:string;evaluatorId:string;coordinatorId:string;bpmManifest:BpmManifest;riskManifest:RiskManifest;bpmHash:string;riskHash:string};

async function workbookFile(filePath:string,configure:(workbook:ExcelJS.Workbook)=>void){const workbook=new ExcelJS.Workbook();configure(workbook);await workbook.xlsx.writeFile(filePath)}
async function setup(){const suffix=randomUUID().replaceAll('-','').slice(0,10).toUpperCase(),directory=await mkdtemp(path.join(tmpdir(),'ebr-import-'));
  await query(`INSERT INTO roles(code,name,is_universal) VALUES('ADMIN','Administrator',false),('UNIVERSAL','Universal',true),('COORDINATOR','Coordinator',false),('EVALUATOR','Evaluator',false) ON CONFLICT(code) DO NOTHING`);
  const createUser=async(role:string)=>(await query<{id:string}>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,$1,$2,'hash','APPROVED' FROM roles WHERE code=$3 RETURNING id`,[`${role} ${suffix}`,`${role.toLowerCase()}.${suffix.toLowerCase()}@example.test`,role])).rows[0].id;
  const adminId=await createUser('ADMIN'),evaluatorId=await createUser('EVALUATOR'),coordinatorId=await createUser('COORDINATOR');
  const allItems=path.join(directory,'all-items.sql'),bpmBook=path.join(directory,'bpm.xlsx');
  await writeFile(allItems,`INSERT [dbo].[AllItems] ([Items], [ItemsId], [Decription], [SectionType], [Parents]) VALUES (1, N'1', N'Section', N'C', NULL)\nINSERT [dbo].[AllItems] ([Items], [ItemsId], [Decription], [SectionType], [Parents]) VALUES (2, N'1.1', N'Subsection', N'S', N'1')\nINSERT [dbo].[AllItems] ([Items], [ItemsId], [Decription], [SectionType], [Parents]) VALUES (3, N'1.1.1', N'Safe criterion', N'I', N'1.1')\nINSERT [dbo].[AllItems] ([Items], [ItemsId], [Decription], [SectionType], [Parents]) VALUES (4, N'1.1.2', N'Optional criterion', N'I', N'1.1')\n`,'utf8');
  await workbookFile(bpmBook,workbook=>{const sheet=workbook.addWorksheet('Criticalities');sheet.getCell('A1').value='Safe criterion';sheet.getCell('P1').value='Observaciones';sheet.getCell('X1').value='Puntos';sheet.getCell('A2').value='M';sheet.getCell('B2').value='i. Safe atomic control';sheet.getCell('A3').value='Optional criterion';sheet.getCell('P3').value='Observaciones';sheet.getCell('X3').value='Puntos';sheet.getCell('A4').value='m';sheet.getCell('B4').value='i. Optional atomic control'});
  const matrix=path.join(directory,'matrix.xlsx'),rules=path.join(directory,'rules.xlsx');
  await workbookFile(matrix,workbook=>{const sheet=workbook.addWorksheet('Food');sheet.addRows([['CATEGORIA','SUBCATEGORIA','RIESGO MICROBIOLÓGICO','PUNTAJE','IGNORADA'],['Synthetic food','Applicable','ALTO',3,'must not import'],['Synthetic food','Not applicable','NA',null,'must not import']])});
  const factorNames=['Volumen de producción','Implementación sistema HACCP','Cumplimiento con las BPM','Proveedor INABIE','Rechazos Registros Sanitarios por incumplimiento microbiológicos','Planes de muestreo microbiológico/Análisis de laboratorio'],weights=[.16,.09,.56,.05,.06,.08];
  await workbookFile(rules,workbook=>{const sheet=workbook.addWorksheet('Rules');sheet.getCell('C1').value='Factor de Riesgo';sheet.getCell('E1').value='Puntaje';sheet.getCell('G1').value='Peso %';for(let i=0;i<6;i++){sheet.getCell(2+i,3).value=factorNames[i];sheet.getCell(2+i,5).value=1;sheet.getCell(2+i,7).value=weights[i]}for(let factor=0;factor<6;factor++)for(const[offset,score]of[1,1.67,2.33,3].entries())sheet.getCell(10+factor*4+offset,41).value=`Option ${factor+1}-${offset+1} (${score} p)`;sheet.getCell('A40').value='Riesgo Total';sheet.getCell('P40').value='Frecuencia de inspección';sheet.getCell('A41').value='1.0 - 3.6 puntos';sheet.getCell('P41').value='Anual';sheet.getCell('A42').value='> 3.6 - 6.3 puntos';sheet.getCell('P42').value='Semestral';sheet.getCell('A43').value='> 6.3 puntos';sheet.getCell('P43').value='Trimestral'});
  const bpmManifest:BpmManifest={schemaVersion:1,importType:'BPM',template:{code:`BPM_${suffix}`,name:'Synthetic BPM'},allItems:{logicalName:'allItems',path:allItems},workbooks:[{logicalName:'bpmForm',path:bpmBook,sheet:'Criticalities'}],guide:{logicalName:'bpmForm',sheet:'Criticalities'},allItemsOverrides:[]};
  const codes=['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'] as const;
  const riskManifest:RiskManifest={schemaVersion:1,importType:'RISK',catalog:{code:`FOOD_${suffix}`,name:'Synthetic food catalog'},riskRuleSet:{code:`RISK_${suffix}`,name:'Synthetic risk'},matrix:{logicalName:'foodMatrix',path:matrix,sheet:'Food'},rules:{logicalName:'riskRules',path:rules,sheet:'Rules'},factorOptionColumn:'AO',factorOptionRanges:codes.map((factorCode,index)=>({factorCode,startRow:10+index*4,endRow:13+index*4})),standaloneCategoryLeaves:[],additionalFactorOptions:[]};
  return{adminId,evaluatorId,coordinatorId,bpmManifest,riskManifest,bpmHash:sha256(canonicalJson({fixture:'bpm',suffix})),riskHash:sha256(canonicalJson({fixture:'risk',suffix}))};
}

describe('official imports and focused critical flow',()=>{
  beforeAll(async()=>{fixture=await setup()});
  beforeEach(()=>{vi.clearAllMocks();const pdf=Buffer.from('%PDF-1.7\ncontrolled\n%%EOF');storage.render.mockResolvedValue(pdf);storage.read.mockResolvedValue(pdf);storage.upload.mockImplementation(async(input:any)=>({storagePath:input.storagePath}));storage.remove.mockResolvedValue(undefined);storage.sign.mockResolvedValue({signedUrl:'https://signed.test/report',expiresInSeconds:60})});
  it('validates, imports once under concurrency, publishes, calculates, approves, reports and closes',async()=>{const admin=actor(fixture.adminId,'ADMIN'),evaluator=actor(fixture.evaluatorId,'EVALUATOR'),coordinator=actor(fixture.coordinatorId,'COORDINATOR');
    expect((await importBpm(fixture.bpmManifest,fixture.bpmHash,'DRY_RUN',{userId:fixture.adminId,label:'integration-admin'},correlationId)).status).toBe('SUCCEEDED');
    expect((await importRisk(fixture.riskManifest,fixture.riskHash,'DRY_RUN',{userId:fixture.adminId,label:'integration-admin'},correlationId)).status).toBe('SUCCEEDED');
    const concurrent=await Promise.all([importBpm(fixture.bpmManifest,fixture.bpmHash,'APPLY',{userId:fixture.adminId,label:'integration-admin'},correlationId),importBpm(fixture.bpmManifest,fixture.bpmHash,'APPLY',{userId:fixture.adminId,label:'integration-admin'},correlationId)]);
    expect(concurrent.map(item=>item.status).sort()).toEqual(['SKIPPED','SUCCEEDED']);const bpmReport=concurrent.find(item=>item.status==='SUCCEEDED')!;
    const riskReport=await importRisk(fixture.riskManifest,fixture.riskHash,'APPLY',{userId:fixture.adminId,label:'integration-admin'},correlationId);expect(riskReport.status).toBe('SUCCEEDED');expect((await importRisk(fixture.riskManifest,fixture.riskHash,'APPLY',{userId:fixture.adminId,label:'integration-admin'},correlationId)).status).toBe('SKIPPED');
    const bpmVersionId=bpmReport.createdVersions.bpmTemplateVersionId!,riskVersionId=riskReport.createdVersions.riskRuleVersionId!;
    expect((await query<any>('SELECT status::text FROM bpm_template_versions WHERE id=$1',[bpmVersionId])).rows[0].status).toBe('DRAFT');expect((await query<any>('SELECT status::text FROM risk_rule_versions WHERE id=$1',[riskVersionId])).rows[0].status).toBe('DRAFT');
    const bpmParent=(await query<any>('SELECT t.id,t.version FROM bpm_templates t JOIN bpm_template_versions v ON v.template_id=t.id WHERE v.id=$1',[bpmVersionId])).rows[0],riskParent=(await query<any>('SELECT s.id,s.version FROM risk_rule_sets s JOIN risk_rule_versions v ON v.risk_rule_set_id=s.id WHERE v.id=$1',[riskVersionId])).rows[0];
    await bpmAdmin.publish(bpmParent.id,bpmVersionId,{version:1,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);await riskAdmin.publish(riskParent.id,riskVersionId,{version:1,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);
    const bpmCurrent=await bpmAdmin.detail(bpmParent.id,admin),riskCurrent=await riskAdmin.detail(riskParent.id,admin);await bpmAdmin.setDefault(bpmParent.id,bpmCurrent.version,admin,correlationId);await riskAdmin.setDefault(riskParent.id,riskCurrent.version,admin,correlationId);
    const caseId=await withTransaction(async client=>{const id=(await client.query<{id:string}>("INSERT INTO cases(origin,status) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT') RETURNING id")).rows[0].id;await client.query('INSERT INTO institutional_program_cases(case_id,reason,created_by_user_id) VALUES($1,$2,$3)',[id,'Synthetic critical flow',fixture.adminId]);await client.query('INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES($1,$2,$3)',[id,fixture.evaluatorId,fixture.adminId]);return id});
    let inspection=await execution.create(caseId,evaluator,correlationId);inspection=await execution.start(inspection.id,inspection.version,evaluator,correlationId);
    const items=(await query<{id:string}>("SELECT id FROM bpm_template_items WHERE template_version_id=$1 AND item_kind='CRITERION' ORDER BY sort_order",[bpmVersionId])).rows;let changed=await execution.upsertResponse(inspection.id,items[0].id,{baseVersion:inspection.version,responseValue:'C'},evaluator,correlationId);changed=await execution.upsertResponse(inspection.id,items[1].id,{baseVersion:changed.version,responseValue:'NA'},evaluator,correlationId);
    const factors=(await query<{id:string;option_id:string}>(`SELECT f.id,(SELECT o.id FROM risk_factor_options o WHERE o.risk_factor_id=f.id AND o.score=1) option_id FROM risk_factors f WHERE f.risk_rule_version_id=$1 ORDER BY f.sort_order`,[riskVersionId])).rows;let version=changed.version;for(const factor of factors)version=(await execution.selectFactor(inspection.id,factor.id,{baseVersion:version,optionId:factor.option_id},evaluator,correlationId)).version;
    const food=(await query<{id:string}>(`SELECT s.id FROM food_risk_subcategories s JOIN food_risk_categories c ON c.id=s.category_id WHERE c.risk_rule_version_id=$1 AND s.risk_score=3 LIMIT 1`,[riskVersionId])).rows[0].id;version=(await execution.addFood(inspection.id,{baseVersion:version,foodRiskSubcategoryId:food},evaluator,correlationId)).version;
    const finalized=await execution.finalize(inspection.id,version,evaluator,correlationId);await execution.submit(inspection.id,finalized.inspection.version,evaluator,correlationId);const review=await reviews.openReview(inspection.id,coordinator,correlationId);await reviews.approveReview(inspection.id,review.id,'Approved',coordinator,correlationId);
    const report=await reviews.generateReport(inspection.id,randomUUID(),coordinator,correlationId);await reviews.officialize(inspection.id,report.id,coordinator,correlationId);const closure=await reviews.closeInspection(inspection.id,report.id,'Complete',coordinator,correlationId);
    expect(closure.inspectionId).toBe(inspection.id);expect((await query<any>('SELECT status::text FROM cases WHERE id=$1',[caseId])).rows[0].status).toBe('CLOSED');expect((await query<any>("SELECT count(*)::int count FROM inspection_bpm_responses WHERE inspection_id=$1 AND response_value='NA'",[inspection.id])).rows[0].count).toBe(1);
  },60000);
  it('rejects an incompatible manifest for an applied package and records the failed attempt',async()=>{
    const incompatibleHash=sha256(canonicalJson({fixture:'bpm',manifest:'incompatible'}));
    await expect(importBpm(fixture.bpmManifest,incompatibleHash,'APPLY',{userId:fixture.adminId,label:'integration-admin'},correlationId)).rejects.toThrow('IMPORT_PACKAGE_INCOMPATIBLE');
    const failed=(await query<any>("SELECT status::text,report FROM official_import_runs WHERE import_type='BPM' AND mode='APPLY' AND status='FAILED' ORDER BY started_at DESC LIMIT 1")).rows[0];
    expect(failed.status).toBe('FAILED');
    expect(failed.report.errors).toEqual(expect.arrayContaining([expect.objectContaining({code:'IMPORT_PACKAGE_INCOMPATIBLE'})]));
  });
});
