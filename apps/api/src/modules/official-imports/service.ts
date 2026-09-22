import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../../db/client.js';
import { aggregateBreakdown, type ImportBreakdown, type ImportCounts, type ImportIssue, type ImportMode, type ImportReport, type ImportType, type SourceFile } from './model.js';
import { parseBpmPackage } from './bpm-parser.js';
import { parseRiskPackage } from './risk-parser.js';
import type { BpmManifest, RiskManifest } from './manifests.js';

export type ImportActor={userId?:string;label:string};
type Prepared={type:ImportType;packageHash:string;functionalHash:string;files:SourceFile[];issues:ImportIssue[];transformations:string[];functional:any;counts:ImportCounts;breakdown:ImportBreakdown;summary:Record<string,number>};
const statusCounts=(prepared:Prepared)=>prepared.counts;
const reportFiles=(files:SourceFile[])=>files.map(file=>({logicalName:file.logicalName,fileName:file.fileName,sha256:file.sha256,sheets:file.sheetNames}));

async function assertActor(client:PoolClient,actor:ImportActor,mode:ImportMode){
  if(mode==='APPLY'&&!actor.label.trim())throw new Error('IMPORT_ACTOR_REQUIRED');
  if(!actor.userId)return;
  const result=await client.query<{code:string;status:string}>('SELECT r.code,u.status::text FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1',[actor.userId]);
  const row=result.rows[0];if(!row||row.status!=='APPROVED'||!['ADMIN','UNIVERSAL'].includes(row.code))throw new Error('IMPORT_ACTOR_NOT_AUTHORIZED');
}
async function createRun(client:PoolClient,prepared:Prepared,mode:ImportMode,manifestHash:string,actor:ImportActor,correlationId?:string){
  const row=(await client.query<{id:string}>(`INSERT INTO official_import_runs(import_type,mode,package_sha256,functional_sha256,manifest_sha256,actor_user_id,actor_label,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[prepared.type,mode,prepared.packageHash,prepared.functionalHash,manifestHash,actor.userId??null,actor.label.trim(),correlationId??null])).rows[0];
  for(const file of prepared.files)await client.query('INSERT INTO official_import_files(import_run_id,logical_name,file_name,content_sha256,sheet_names) VALUES($1,$2,$3,$4,$5::jsonb)',[row.id,file.logicalName,file.fileName,file.sha256,JSON.stringify(file.sheetNames)]);
  return row.id;
}
async function finishRun(client:PoolClient,id:string,status:ImportReport['status'],counts:ImportCounts,report:ImportReport,versions:ImportReport['createdVersions']={}){
  await client.query(`UPDATE official_import_runs SET status=$2,finished_at=clock_timestamp(),rows_read=$3,rows_accepted=$4,rows_skipped=$5,warning_count=$6,rejected_count=$7,bpm_template_version_id=$8,catalog_version_id=$9,risk_rule_version_id=$10,report=$11::jsonb WHERE id=$1`,[id,status,counts.read,counts.accepted,counts.skipped,counts.warned,counts.rejected,versions.bpmTemplateVersionId??null,versions.catalogVersionId??null,versions.riskRuleVersionId??null,JSON.stringify({...report,importRunId:undefined})]);
}
function buildReport(prepared:Prepared,mode:ImportMode,status:ImportReport['status'],versions:ImportReport['createdVersions']={},runId?:string):ImportReport{const counts=statusCounts(prepared),warnings=prepared.issues.filter(issue=>issue.severity==='WARNING'),errors=prepared.issues.filter(issue=>issue.severity==='ERROR');return{type:prepared.type,mode,status,packageHash:prepared.packageHash,functionalHash:prepared.functionalHash,files:reportFiles(prepared.files),counts,breakdown:prepared.breakdown,issueCounts:{errors:errors.length,warnings:warnings.length},summary:prepared.summary,warnings,errors,transformations:prepared.transformations,createdVersions:versions,versionsRemainDraft:true,importRunId:runId}}
async function audit(client:PoolClient,action:string,runId:string,prepared:Prepared,actor:ImportActor,correlationId?:string,outcome:'SUCCESS'|'FAILURE'='SUCCESS'){await client.query(`INSERT INTO audit_events(actor_user_id,actor_type,correlation_id,action,entity_type,entity_id,outcome,source,metadata) VALUES($1,$2,$3,$4,'OFFICIAL_IMPORT',$5,$6,'SYSTEM',$7::jsonb)`,[actor.userId??null,actor.userId?'USER':'SYSTEM',correlationId??randomUUID(),action,runId,outcome,JSON.stringify({importType:prepared.type,packageHash:prepared.packageHash.slice(0,16),fileCount:prepared.files.length})])}

async function prepareBpm(manifest:BpmManifest):Promise<Prepared>{const parsed=await parseBpmPackage(manifest);return{type:'BPM',...parsed,counts:aggregateBreakdown(parsed.breakdown)}}
async function prepareRisk(manifest:RiskManifest):Promise<Prepared>{const parsed=await parseRiskPackage(manifest);return{type:'RISK',...parsed,counts:aggregateBreakdown(parsed.breakdown)}}

async function applyBpm(client:PoolClient,functional:any){
  let template=(await client.query<{id:string}>('SELECT id FROM bpm_templates WHERE code=$1 FOR UPDATE',[functional.template.code])).rows[0];if(!template)template=(await client.query<{id:string}>('INSERT INTO bpm_templates(code,name,description) VALUES($1,$2,$3) RETURNING id',[functional.template.code,functional.template.name,functional.template.description])).rows[0];
  if((await client.query("SELECT 1 FROM bpm_template_versions WHERE template_id=$1 AND status='DRAFT'",[template.id])).rowCount)throw new Error('BPM_DRAFT_ALREADY_EXISTS');
  const version=(await client.query<{id:string}>(`INSERT INTO bpm_template_versions(template_id,version_number) SELECT $1,COALESCE(max(version_number),0)+1 FROM bpm_template_versions WHERE template_id=$1 RETURNING id`,[template.id])).rows[0];const ids=new Map<string,string>();
  for(const item of functional.items){const id=randomUUID();ids.set(item.key,id);await client.query(`INSERT INTO bpm_template_items(id,template_version_id,parent_item_id,item_kind,source_code,display_code,title,sort_order,is_evaluable,default_criticality,source_reference,source_row_number,source_parent_code_raw) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[id,version.id,item.parentKey?ids.get(item.parentKey):null,item.itemKind,item.sourceCode,item.displayCode,item.title,item.sortOrder,item.isEvaluable,item.criticality,item.sourceReference,item.sourceRowNumber,item.sourceParentCodeRaw]);}
  for(const guidance of functional.guidanceItems){const criterionId=ids.get(guidance.criterionKey);if(!criterionId)throw new Error('BPM_GUIDANCE_CRITERION_MISSING');await client.query('INSERT INTO bpm_criterion_guidance_items(template_version_id,criterion_item_id,text,sort_order,criticality,source_reference,source_row_number) VALUES($1,$2,$3,$4,$5,$6,$7)',[version.id,criterionId,guidance.text,guidance.sortOrder,guidance.criticality,guidance.sourceReference,guidance.sourceRowNumber]);}
  return{bpmTemplateVersionId:version.id};
}
async function applyRisk(client:PoolClient,functional:any){
  let catalog=(await client.query<{id:string}>('SELECT id FROM catalog_definitions WHERE code=$1 FOR UPDATE',[functional.catalog.code])).rows[0];if(!catalog)catalog=(await client.query<{id:string}>('INSERT INTO catalog_definitions(code,name,supports_hierarchy) VALUES($1,$2,true) RETURNING id',[functional.catalog.code,functional.catalog.name])).rows[0];
  if((await client.query("SELECT 1 FROM catalog_versions WHERE catalog_id=$1 AND status='DRAFT'",[catalog.id])).rowCount)throw new Error('CATALOG_DRAFT_ALREADY_EXISTS');
  const catalogVersion=(await client.query<{id:string}>(`INSERT INTO catalog_versions(catalog_id,version_number) SELECT $1,COALESCE(max(version_number),0)+1 FROM catalog_versions WHERE catalog_id=$1 RETURNING id`,[catalog.id])).rows[0];
  for(const category of functional.categories){const categoryId=randomUUID();await client.query(`INSERT INTO catalog_entries(id,catalog_version_id,code,name,entry_type,sort_order,is_active,source_reference,attributes) VALUES($1,$2,$3,$4,'NODE',$5,true,$6,$7::jsonb)`,[categoryId,catalogVersion.id,category.code,category.name,category.sortOrder,`${category.sourceFile}:${category.sourceSheet}:${category.sourceRowNumber}`,JSON.stringify({sourceRowNumber:category.sourceRowNumber})]);for(const sub of category.subcategories)await client.query(`INSERT INTO catalog_entries(catalog_version_id,code,name,parent_entry_id,entry_type,sort_order,is_active,source_reference,attributes) VALUES($1,$2,$3,$4,'LEAF',$5,true,$6,$7::jsonb)`,[catalogVersion.id,`${category.code}_${String(sub.sortOrder).padStart(4,'0')}`,sub.name,categoryId,sub.sortOrder,`${sub.sourceFile}:${sub.sourceSheet}:${sub.sourceRowNumber}`,JSON.stringify({microbiologicalRisk:sub.microbiologicalRisk,riskScore:sub.riskScore,sourceRowNumber:sub.sourceRowNumber})]);}
  let set=(await client.query<{id:string}>('SELECT id FROM risk_rule_sets WHERE code=$1 FOR UPDATE',[functional.riskRuleSet.code])).rows[0];if(!set)set=(await client.query<{id:string}>('INSERT INTO risk_rule_sets(code,name) VALUES($1,$2) RETURNING id',[functional.riskRuleSet.code,functional.riskRuleSet.name])).rows[0];
  if((await client.query("SELECT 1 FROM risk_rule_versions WHERE risk_rule_set_id=$1 AND status='DRAFT'",[set.id])).rowCount)throw new Error('RISK_DRAFT_ALREADY_EXISTS');
  const riskVersion=(await client.query<{id:string}>(`INSERT INTO risk_rule_versions(risk_rule_set_id,version_number) SELECT $1,COALESCE(max(version_number),0)+1 FROM risk_rule_versions WHERE risk_rule_set_id=$1 RETURNING id`,[set.id])).rows[0];
  for(const factor of functional.factors){const factorId=(await client.query<{id:string}>('INSERT INTO risk_factors(risk_rule_version_id,code,name,weight,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING id',[riskVersion.id,factor.code,factor.name,factor.weight,factor.sortOrder])).rows[0].id;for(const option of factor.options)await client.query('INSERT INTO risk_factor_options(risk_factor_id,code,label,score,sort_order) VALUES($1,$2,$3,$4,$5)',[factorId,option.code,option.label,option.score,option.sortOrder]);}
  for(const category of functional.categories){const categoryId=(await client.query<{id:string}>('INSERT INTO food_risk_categories(risk_rule_version_id,code,name,sort_order,source_file,source_sheet,source_row_number) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[riskVersion.id,category.code,category.name,category.sortOrder,category.sourceFile,category.sourceSheet,category.sourceRowNumber])).rows[0].id;for(const sub of category.subcategories)await client.query('INSERT INTO food_risk_subcategories(category_id,name,microbiological_risk,risk_score,sort_order,source_file,source_sheet,source_row_number) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[categoryId,sub.name,sub.microbiologicalRisk,sub.riskScore,sub.sortOrder,sub.sourceFile,sub.sourceSheet,sub.sourceRowNumber]);}
  for(const item of functional.ranges)await client.query('INSERT INTO inspection_frequency_ranges(risk_rule_version_id,lower_bound,upper_bound,lower_inclusive,upper_inclusive,frequency,label,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[riskVersion.id,item.lowerBound,item.upperBound,item.lowerInclusive,item.upperInclusive,item.frequency,item.label,item.sortOrder]);
  return{catalogVersionId:catalogVersion.id,riskRuleVersionId:riskVersion.id};
}

async function executeOnce(prepared:Prepared,manifestHash:string,mode:ImportMode,actor:ImportActor,correlationId?:string){
  const hasErrors=prepared.issues.some(issue=>issue.severity==='ERROR');
  if(mode==='DRY_RUN'||hasErrors)return withTransaction(async client=>{await assertActor(client,actor,mode);const runId=await createRun(client,prepared,mode,manifestHash,actor,correlationId);const status=hasErrors?'REJECTED':'SUCCEEDED';const report=buildReport(prepared,mode,status,{},runId);await finishRun(client,runId,status,statusCounts(prepared),report);await audit(client,hasErrors?'OFFICIAL_IMPORT_REJECTED':'OFFICIAL_IMPORT_DRY_RUN',runId,prepared,actor,correlationId);return report});
  return withTransaction(async client=>{await assertActor(client,actor,mode);await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[prepared.packageHash]);const prior=await client.query<{id:string;import_type:string;manifest_sha256:string;report:any}>("SELECT id,import_type::text,manifest_sha256,report FROM official_import_runs WHERE package_sha256=$1 AND mode='APPLY' AND status='SUCCEEDED' ORDER BY finished_at DESC LIMIT 1",[prepared.packageHash]);if(prior.rows[0]){if(prior.rows[0].import_type!==prepared.type||prior.rows[0].manifest_sha256.trim()!==manifestHash)throw new Error('IMPORT_PACKAGE_INCOMPATIBLE');const runId=await createRun(client,prepared,mode,manifestHash,actor,correlationId);const report=buildReport(prepared,mode,'SKIPPED',{},runId);report.breakdown=Object.fromEntries(Object.entries(report.breakdown).map(([key,value])=>[key,{...value,accepted:0,rejected:0,warned:0,skipped:value.read}]));report.counts=aggregateBreakdown(report.breakdown);await finishRun(client,runId,'SKIPPED',report.counts,report);await audit(client,'OFFICIAL_IMPORT_IDEMPOTENT_SKIP',runId,prepared,actor,correlationId);return report}
    const runId=await createRun(client,prepared,mode,manifestHash,actor,correlationId);const versions=prepared.type==='BPM'?await applyBpm(client,prepared.functional):await applyRisk(client,prepared.functional);const report=buildReport(prepared,mode,'SUCCEEDED',versions,runId);await finishRun(client,runId,'SUCCEEDED',statusCounts(prepared),report,versions);await audit(client,'OFFICIAL_IMPORT_APPLIED',runId,prepared,actor,correlationId);return report});
}
async function recordApplyFailure(prepared:Prepared,manifestHash:string,actor:ImportActor,correlationId:string|undefined,error:unknown){
  const rawCode=error instanceof Error?error.message:'';
  const code=/^[A-Z][A-Z0-9_]{2,79}$/.test(rawCode)?rawCode:'IMPORT_APPLY_FAILED';
  await withTransaction(async client=>{
    await assertActor(client,actor,'APPLY');
    const runId=await createRun(client,prepared,'APPLY',manifestHash,actor,correlationId);
    const report=buildReport(prepared,'APPLY','FAILED',{},runId);
    report.errors=[...report.errors,{severity:'ERROR',code,message:'La aplicación transaccional falló; no se creó ni publicó ninguna versión.'}];
    report.issueCounts.errors=report.errors.length;
    await finishRun(client,runId,'FAILED',report.counts,report);
    await audit(client,'OFFICIAL_IMPORT_FAILED',runId,prepared,actor,correlationId,'FAILURE');
  });
}
async function execute(prepared:Prepared,manifestHash:string,mode:ImportMode,actor:ImportActor,correlationId?:string){
  try{return await executeOnce(prepared,manifestHash,mode,actor,correlationId)}catch(error){
    if(mode==='APPLY'){try{await recordApplyFailure(prepared,manifestHash,actor,correlationId,error)}catch{/* La falla original conserva prioridad; la BD puede no estar disponible. */}}
    throw error;
  }
}
export async function importBpm(manifest:BpmManifest,manifestHash:string,mode:ImportMode,actor:ImportActor,correlationId?:string){return execute(await prepareBpm(manifest),manifestHash,mode,actor,correlationId)}
export async function importRisk(manifest:RiskManifest,manifestHash:string,mode:ImportMode,actor:ImportActor,correlationId?:string){return execute(await prepareRisk(manifest),manifestHash,mode,actor,correlationId)}
export async function importRun(id:string){return(await query('SELECT * FROM official_import_runs WHERE id=$1',[id])).rows[0]}
