import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll,describe,expect,it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { query,withTransaction } from '../../db/client.js';
import * as catalogs from '../../modules/catalog-administration/service.js';
import * as bpm from '../../modules/bpm-template-administration/service.js';
import * as risk from '../../modules/risk-rule-administration/service.js';
import * as inspections from '../../modules/inspection-execution/service.js';
import type { Actor } from '../../modules/versioned-definitions/common.js';
import { openApiDocument } from '../../openapi.js';

const correlationId='123e4567-e89b-42d3-a456-426614174000';
let adminId:string,universalId:string,coordinatorId:string,evaluatorId:string,companyAdminId:string,delegateId:string;
const actor=(userId:string,role:Actor['role'],age=0):Actor=>({userId,role,authTime:Math.floor(Date.now()/1000)-age});
const code=(prefix:string)=>`${prefix}_${randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`;
const authorization=async(role:Actor['role'],id:string,age=0)=>`Bearer ${await signAccessToken(id,role,Math.floor(Date.now()/1000)-age)}`;

async function createPublishedBpm(admin:Actor,prefix:string){const template=await bpm.create({code:code(prefix),name:`${prefix} template`,description:null},admin,correlationId),v=await bpm.createVersion(template.id,undefined,admin,correlationId);const section=await bpm.createItem(template.id,v.id,{parentId:null,itemKind:'SECTION',title:'Section',sortOrder:1,isEvaluable:false,defaultCriticality:null},admin,correlationId);const subsection=await bpm.createItem(template.id,v.id,{parentId:section.id,itemKind:'SUBSECTION',title:'Subsection',sortOrder:1,isEvaluable:false,defaultCriticality:null},admin,correlationId);await bpm.createItem(template.id,v.id,{parentId:subsection.id,itemKind:'CRITERION',displayCode:code('CRITERION'),title:'Criterion',sortOrder:1,isEvaluable:true,defaultCriticality:'MAYOR'},admin,correlationId);const published=await bpm.publish(template.id,v.id,{version:v.version,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);return{template:await bpm.detail(template.id,admin),published}}
async function createPublishedRisk(admin:Actor,prefix:string){const set=await risk.create({code:code(prefix),name:`${prefix} rules`},admin,correlationId),v=await risk.createVersion(set.id,undefined,admin,correlationId);for(const[i,factorCode]of['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'].entries()){const f:any=await risk.mutate(set.id,v.id,'factor','create',v.id,{code:factorCode,name:factorCode,weight:i<4?.17:.16,sortOrder:i+1},admin,correlationId);for(const[j,[optionCode,score]]of[['LOW',1],['MEDIUM_LOW',1.67],['MEDIUM_HIGH',2.33],['HIGH',3]].entries())await risk.mutate(set.id,v.id,'option','create',f.id,{code:optionCode,label:optionCode,score,sortOrder:j+1},admin,correlationId)}const category:any=await risk.mutate(set.id,v.id,'category','create',v.id,{code:'FOOD',name:'Food',sortOrder:1},admin,correlationId);await risk.mutate(set.id,v.id,'subcategory','create',category.id,{name:'Applicable',microbiologicalRisk:'HIGH',riskScore:3,sortOrder:1},admin,correlationId);await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:1,upperBound:3.6,lowerInclusive:true,upperInclusive:true,frequency:'ANNUAL',label:'Annual',sortOrder:1},admin,correlationId);await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:3.6,upperBound:6.3,lowerInclusive:false,upperInclusive:true,frequency:'SEMIANNUAL',label:'Semiannual',sortOrder:2},admin,correlationId);await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:6.3,upperBound:null,lowerInclusive:false,upperInclusive:false,frequency:'QUARTERLY',label:'Quarterly',sortOrder:3},admin,correlationId);const published=await risk.publish(set.id,v.id,{version:v.version,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);return{set:await risk.detail(set.id,admin),published}}
async function createAssignedCase(){return withTransaction(async c=>{const caseId=(await c.query<{id:string}>("INSERT INTO cases(origin,status) VALUES('INSTITUTIONAL_PROGRAM','PENDING_ASSIGNMENT') RETURNING id")).rows[0].id;await c.query('INSERT INTO institutional_program_cases(case_id,reason,created_by_user_id) VALUES($1,$2,$3)',[caseId,'Default definitions test',adminId]);await c.query('INSERT INTO case_assignments(case_id,evaluator_user_id,assigned_by_user_id) VALUES($1,$2,$3)',[caseId,evaluatorId,adminId]);return caseId})}

beforeAll(async()=>{
  const token=randomUUID().slice(0,8);
  const inserted=await query<{id:string;code:string}>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT r.id,$1||r.code,$2||lower(r.code)||'@example.test','hash','APPROVED' FROM roles r WHERE r.code=ANY($3::text[]) RETURNING id,(SELECT code FROM roles WHERE id=role_id) code`,['Definitions ',`${token}.`,['ADMIN','UNIVERSAL','COORDINATOR','EVALUATOR']]);
  adminId=inserted.rows.find(x=>x.code==='ADMIN')!.id;universalId=inserted.rows.find(x=>x.code==='UNIVERSAL')!.id;coordinatorId=inserted.rows.find(x=>x.code==='COORDINATOR')!.id;evaluatorId=inserted.rows.find(x=>x.code==='EVALUATOR')!.id;companyAdminId=evaluatorId;delegateId=evaluatorId;
  env.JWT_ACCESS_SECRET='test-secret-with-at-least-thirty-two-bytes';
});

describe('versioned definitions administration with real PostgreSQL',()=>{
  it('enforces RBAC and recent reauthentication over real HTTP routes',async()=>{
    for(const [role,id,expected]of[['ADMIN',adminId,200],['UNIVERSAL',universalId,200],['COORDINATOR',coordinatorId,200],['EVALUATOR',evaluatorId,403],['COMPANY_ADMIN',companyAdminId,403],['DELEGATE',delegateId,403]]as const){expect((await request(app).get('/v1/admin/catalogs').set('Authorization',await authorization(role,id))).status).toBe(expected)}
    expect((await request(app).get('/v1/admin/bpm-templates').set('Authorization',await authorization('DELEGATE',delegateId))).status).toBe(403);
    expect((await request(app).get('/v1/admin/risk-rule-sets').set('Authorization',await authorization('COORDINATOR',coordinatorId))).status).toBe(200);
    expect((await request(app).post('/v1/admin/catalogs').set('Authorization',await authorization('ADMIN',adminId)).send({code:code('HTTP_ADMIN'),name:'HTTP Admin'})).status).toBe(201);
    expect((await request(app).post('/v1/admin/catalogs').set('Authorization',await authorization('UNIVERSAL',universalId)).send({code:code('HTTP_UNIVERSAL'),name:'HTTP Universal'})).status).toBe(201);
    for(const [role,id]of[['COORDINATOR',coordinatorId],['EVALUATOR',evaluatorId],['COMPANY_ADMIN',companyAdminId],['DELEGATE',delegateId]]as const)expect((await request(app).post('/v1/admin/catalogs').set('Authorization',await authorization(role,id)).send({code:code('DENIED'),name:'Denied'})).status).toBe(403);
    const created=await catalogs.create({code:code('REAUTH'),name:'Reauthentication',description:null,supportsHierarchy:false},actor(adminId,'ADMIN'),correlationId);
    const draft=await catalogs.createVersion(created.id,undefined,actor(adminId,'ADMIN'),correlationId);
    await catalogs.createItem(created.id,draft.id,{code:'VALUE',name:'Value',entryType:'LEAF',sortOrder:1,isActive:true,attributes:{}},actor(adminId,'ADMIN'),correlationId);
    const stale=await request(app).post(`/v1/admin/catalogs/${created.id}/versions/${draft.id}/publish`).set('Authorization',await authorization('ADMIN',adminId,(env.JWT_REAUTH_MAX_AGE_MINUTES+1)*60)).send({version:draft.version,effectiveFrom:new Date().toISOString()});
    expect(stale.status).toBe(401);expect(stale.body.error.code).toBe('REAUTHENTICATION_REQUIRED');
  });

  it('supports catalog CRUD, non-mutating validation, deep clone, future publication, concurrency and retirement',async()=>{
    const admin=actor(adminId,'ADMIN'),catalog=await catalogs.create({code:code('CAT'),name:'Catalog',description:null,supportsHierarchy:true},admin,correlationId);
    const empty=await catalogs.createVersion(catalog.id,undefined,admin,correlationId);
    const before=(await query<any>('SELECT version,updated_at FROM catalog_versions WHERE id=$1',[empty.id])).rows[0];
    const invalid=await catalogs.validate(catalog.id,empty.id,actor(coordinatorId,'COORDINATOR'));
    const after=(await query<any>('SELECT version,updated_at FROM catalog_versions WHERE id=$1',[empty.id])).rows[0];
    expect(invalid.valid).toBe(false);expect(invalid.errors.map(x=>x.code)).toContain('CATALOG_EMPTY');expect(after).toEqual(before);
    const root=await catalogs.createItem(catalog.id,empty.id,{code:'ROOT',name:'Root',entryType:'NODE',sortOrder:1,isActive:true,attributes:{}},admin,correlationId);
    await expect(catalogs.patchItem(catalog.id,empty.id,root.id,{version:999,name:'Stale'},admin,correlationId)).rejects.toMatchObject({code:'STALE_VERSION'});
    await catalogs.createItem(catalog.id,empty.id,{code:'LEAF',name:'Leaf',parentId:root.id,entryType:'LEAF',sortOrder:1,isActive:true,attributes:{}},admin,correlationId);
    const current=await catalogs.publish(catalog.id,empty.id,{version:empty.version,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);
    const other=await catalogs.create({code:code('FOREIGN'),name:'Foreign catalog',description:null,supportsHierarchy:true},admin,correlationId);
    await expect(catalogs.createVersion(other.id,current.id,admin,correlationId)).rejects.toMatchObject({code:'CONFLICT'});
    const clone=await catalogs.createVersion(catalog.id,current.id,admin,correlationId),preview=await catalogs.preview(catalog.id,clone.id,actor(coordinatorId,'COORDINATOR'));
    expect(preview.items[0].children).toHaveLength(1);expect(preview.items[0].id).not.toBe(root.id);
    const future=new Date(Date.now()+3600000).toISOString();
    const concurrent=await Promise.allSettled([catalogs.publish(catalog.id,clone.id,{version:clone.version,effectiveFrom:future},admin,correlationId),catalogs.publish(catalog.id,clone.id,{version:clone.version,effectiveFrom:future},admin,correlationId)]);
    expect(concurrent.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(concurrent.filter(x=>x.status==='rejected')).toHaveLength(1);
    const currentRow=(await query<any>('SELECT version FROM catalog_versions WHERE id=$1',[current.id])).rows[0];
    const retired=await catalogs.retire(catalog.id,current.id,currentRow.version,admin,correlationId);expect(retired.status).toBe('RETIRED');
  });

  it('publishes and deeply clones a valid BPM tree without changing historical UUIDs',async()=>{
    const admin=actor(adminId,'UNIVERSAL'),template=await bpm.create({code:code('BPM'),name:'BPM template',description:null},admin,correlationId),v=await bpm.createVersion(template.id,undefined,admin,correlationId);
    const section=await bpm.createItem(template.id,v.id,{parentId:null,itemKind:'SECTION',title:'Section',sortOrder:1,isEvaluable:false,defaultCriticality:null},admin,correlationId);
    const subsection=await bpm.createItem(template.id,v.id,{parentId:section.id,itemKind:'SUBSECTION',title:'Subsection',sortOrder:1,isEvaluable:false,defaultCriticality:null},admin,correlationId);
    const criterion=await bpm.createItem(template.id,v.id,{parentId:subsection.id,itemKind:'CRITERION',sourceCode:'SOURCE',displayCode:'DISPLAY',title:'Criterion',sortOrder:1,isEvaluable:true,defaultCriticality:'MAYOR',sourceReference:'AllItems',sourceRowNumber:1},admin,correlationId);
    expect((await bpm.validate(template.id,v.id,actor(coordinatorId,'COORDINATOR'))).valid).toBe(true);
    const published=await bpm.publish(template.id,v.id,{version:v.version,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId);
    const clone=await bpm.createVersion(template.id,published.id,admin,correlationId),preview=await bpm.preview(template.id,clone.id,admin);
    expect(preview.items[0].children[0].children[0].id).not.toBe(criterion.id);
    expect((await query<any>('SELECT id FROM bpm_template_items WHERE id=$1',[criterion.id])).rows).toHaveLength(1);
  });

  it('validates, publishes and clones the complete risk model with official scales',async()=>{
    const admin=actor(adminId,'ADMIN'),set=await risk.create({code:code('RISK'),name:'Risk rules'},admin,correlationId),v=await risk.createVersion(set.id,undefined,admin,correlationId);
    const factors=['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING'];
    for(let i=0;i<factors.length;i++){const f:any=await risk.mutate(set.id,v.id,'factor','create',v.id,{code:factors[i],name:factors[i],weight:i<4?.17:.16,sortOrder:i+1},admin,correlationId);for(const [j,[optionCode,score]]of[['LOW',1],['MEDIUM_LOW',1.67],['MEDIUM_HIGH',2.33],['HIGH',3]].entries())await risk.mutate(set.id,v.id,'option','create',f.id,{code:optionCode,label:optionCode,score,sortOrder:j+1},admin,correlationId)}
    const category:any=await risk.mutate(set.id,v.id,'category','create',v.id,{code:'FOOD',name:'Food',sortOrder:1},admin,correlationId);
    await risk.mutate(set.id,v.id,'subcategory','create',category.id,{name:'Applicable',microbiologicalRisk:'HIGH',riskScore:3,sortOrder:1},admin,correlationId);await risk.mutate(set.id,v.id,'subcategory','create',category.id,{name:'NA',microbiologicalRisk:null,riskScore:null,sortOrder:2},admin,correlationId);
    await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:1,upperBound:3.6,lowerInclusive:true,upperInclusive:true,frequency:'ANNUAL',label:'Annual',sortOrder:1},admin,correlationId);await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:3.6,upperBound:6.3,lowerInclusive:false,upperInclusive:true,frequency:'SEMIANNUAL',label:'Semiannual',sortOrder:2},admin,correlationId);await risk.mutate(set.id,v.id,'range','create',v.id,{lowerBound:6.3,upperBound:null,lowerInclusive:false,upperInclusive:false,frequency:'QUARTERLY',label:'Quarterly',sortOrder:3},admin,correlationId);
    const validated=await risk.validate(set.id,v.id,actor(coordinatorId,'COORDINATOR'));expect(validated.valid).toBe(true);
    const published=await risk.publish(set.id,v.id,{version:v.version,effectiveFrom:new Date(Date.now()-1000).toISOString()},admin,correlationId),clone=await risk.createVersion(set.id,published.id,admin,correlationId),preview=await risk.preview(set.id,clone.id,admin);
    expect(preview.factors).toHaveLength(6);expect(preview.factors.every((f:any)=>f.options.length===4)).toBe(true);expect(preview.foodCategories[0].subcategories).toHaveLength(2);expect(preview.frequencyRanges).toHaveLength(3);
    expect(new Set(preview.factors.map((x:any)=>x.id)).has((await risk.preview(set.id,published.id,admin)).factors[0].id)).toBe(false);
  });

  it('selects effective versions only from explicit defaults and preserves historical inspections',async()=>{
    const admin=actor(adminId,'ADMIN'),universal=actor(universalId,'UNIVERSAL');
    const bpmA=await createPublishedBpm(admin,'DEFAULT_A_BPM'),riskA=await createPublishedRisk(admin,'DEFAULT_A_RISK');
    const bpmDefault=await request(app).post(`/v1/admin/bpm-templates/${bpmA.template.id}/set-default`).set('Authorization',await authorization('ADMIN',adminId)).send({version:bpmA.template.version});
    const riskDefault=await request(app).post(`/v1/admin/risk-rule-sets/${riskA.set.id}/set-default`).set('Authorization',await authorization('ADMIN',adminId)).send({version:riskA.set.version});
    expect(bpmDefault.status).toBe(200);expect(bpmDefault.body.data.isDefault).toBe(true);expect(riskDefault.status).toBe(200);expect(riskDefault.body.data.isDefault).toBe(true);

    const future=new Date(Date.now()+3600000).toISOString();
    const futureBpm=await bpm.createVersion(bpmA.template.id,bpmA.published.id,admin,correlationId);await bpm.publish(bpmA.template.id,futureBpm.id,{version:futureBpm.version,effectiveFrom:future},admin,correlationId);
    const futureRisk=await risk.createVersion(riskA.set.id,riskA.published.id,admin,correlationId);await risk.publish(riskA.set.id,futureRisk.id,{version:futureRisk.version,effectiveFrom:future},admin,correlationId);
    expect((await query<{id:string}>('SELECT effective_bpm_template_version(clock_timestamp()) id')).rows[0].id).toBe(bpmA.published.id);
    expect((await query<{id:string}>('SELECT effective_risk_rule_version(clock_timestamp()) id')).rows[0].id).toBe(riskA.published.id);

    const bpmB=await createPublishedBpm(admin,'DEFAULT_B_BPM'),riskB=await createPublishedRisk(admin,'DEFAULT_B_RISK');
    expect((await query<{id:string}>('SELECT effective_bpm_template_version(clock_timestamp()) id')).rows[0].id).toBe(bpmA.published.id);
    expect((await query<{id:string}>('SELECT effective_risk_rule_version(clock_timestamp()) id')).rows[0].id).toBe(riskA.published.id);
    const first=await inspections.create(await createAssignedCase(),actor(evaluatorId,'EVALUATOR'),correlationId);
    expect(first.bpmTemplateVersionId).toBe(bpmA.published.id);expect(first.riskRuleVersionId).toBe(riskA.published.id);

    for(const [role,id]of[['COORDINATOR',coordinatorId],['EVALUATOR',evaluatorId],['COMPANY_ADMIN',companyAdminId],['DELEGATE',delegateId]]as const){
      const deniedBpm=await request(app).post(`/v1/admin/bpm-templates/${bpmB.template.id}/set-default`).set('Authorization',await authorization(role,id)).send({version:bpmB.template.version});expect(deniedBpm.status).toBe(403);expect(deniedBpm.body.error.code).toBe('FORBIDDEN');
      const deniedRisk=await request(app).post(`/v1/admin/risk-rule-sets/${riskB.set.id}/set-default`).set('Authorization',await authorization(role,id)).send({version:riskB.set.version});expect(deniedRisk.status).toBe(403);expect(deniedRisk.body.error.code).toBe('FORBIDDEN');
    }
    const expired=await request(app).post(`/v1/admin/risk-rule-sets/${riskB.set.id}/set-default`).set('Authorization',await authorization('ADMIN',adminId,(env.JWT_REAUTH_MAX_AGE_MINUTES+1)*60)).send({version:riskB.set.version});expect(expired.status).toBe(401);expect(expired.body.error.code).toBe('REAUTHENTICATION_REQUIRED');
    const bpmBCurrent=await bpm.detail(bpmB.template.id,admin),riskBCurrent=await risk.detail(riskB.set.id,admin);
    expect((await request(app).post(`/v1/admin/bpm-templates/${bpmB.template.id}/set-default`).set('Authorization',await authorization('UNIVERSAL',universalId)).send({version:bpmBCurrent.version})).status).toBe(200);
    expect((await request(app).post(`/v1/admin/risk-rule-sets/${riskB.set.id}/set-default`).set('Authorization',await authorization('UNIVERSAL',universalId)).send({version:riskBCurrent.version})).status).toBe(200);
    const second=await inspections.create(await createAssignedCase(),actor(evaluatorId,'EVALUATOR'),correlationId);
    expect(second.bpmTemplateVersionId).toBe(bpmB.published.id);expect(second.riskRuleVersionId).toBe(riskB.published.id);
    const historical=(await query<any>('SELECT bpm_template_version_id AS bpm,risk_rule_version_id AS risk FROM inspections WHERE id=$1',[first.id])).rows[0];expect(historical).toEqual({bpm:bpmA.published.id,risk:riskA.published.id});

    const stale=await request(app).post(`/v1/admin/bpm-templates/${bpmA.template.id}/set-default`).set('Authorization',await authorization('ADMIN',adminId)).send({version:1});expect(stale.status).toBe(409);expect(stale.body.error.code).toBe('STALE_VERSION');
    const bpmACurrent=await bpm.detail(bpmA.template.id,admin);const concurrent=await Promise.allSettled([bpm.setDefault(bpmA.template.id,bpmACurrent.version,admin,correlationId),bpm.setDefault(bpmA.template.id,bpmACurrent.version,admin,correlationId)]);expect(concurrent.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect((await query<{count:string}>('SELECT count(*)::text count FROM bpm_templates WHERE is_default')).rows[0].count).toBe('1');

    await withTransaction(async c=>{await c.query("SELECT set_config('app.default_definition_transition','replace',true)");await c.query('UPDATE bpm_templates SET is_default=false WHERE is_default');await c.query('UPDATE risk_rule_sets SET is_default=false WHERE is_default')});
    await expect(inspections.create(await createAssignedCase(),actor(evaluatorId,'EVALUATOR'),correlationId)).rejects.toMatchObject({code:'DEFAULT_DEFINITIONS_UNAVAILABLE'});
    const restoreBpm=await bpm.detail(bpmA.template.id,admin),restoreRisk=await risk.detail(riskA.set.id,admin);await bpm.setDefault(bpmA.template.id,restoreBpm.version,admin,correlationId);await risk.setDefault(riskA.set.id,restoreRisk.version,admin,correlationId);

    expect((await bpm.list(admin)).filter(x=>x.isDefault)).toHaveLength(1);expect((await risk.list(admin)).filter(x=>x.isDefault)).toHaveLength(1);expect((await bpm.detail(bpmA.template.id,admin)).isDefault).toBe(true);expect((await risk.detail(riskA.set.id,admin)).isDefault).toBe(true);
    const audits=(await query<any>("SELECT action,metadata FROM audit_events WHERE action IN('BPM_TEMPLATE_DEFAULT_CHANGED','RISK_RULE_SET_DEFAULT_CHANGED') ORDER BY occurred_at DESC LIMIT 10")).rows;expect(audits.some(x=>x.action==='BPM_TEMPLATE_DEFAULT_CHANGED')).toBe(true);expect(audits.some(x=>x.action==='RISK_RULE_SET_DEFAULT_CHANGED')).toBe(true);for(const event of audits)expect(Object.keys(event.metadata).sort()).toEqual(['newResourceId','previousResourceId','type','version'].sort());
  });

  it('documents every administrative route family and keeps audit metadata and DTOs safe',async()=>{
    const paths:any=openApiDocument.paths;
    for(const path of['/v1/admin/catalogs','/v1/admin/catalogs/{catalogId}/versions/{versionId}/publish','/v1/admin/catalogs/{catalogId}/versions/{versionId}/items/{itemId}/move','/v1/admin/bpm-templates','/v1/admin/bpm-templates/{templateId}/set-default','/v1/admin/bpm-templates/{templateId}/versions/{versionId}/preview','/v1/admin/risk-rule-sets','/v1/admin/risk-rule-sets/{setId}/set-default','/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/factors/{factorId}/options/{optionId}','/v1/admin/risk-rule-sets/{setId}/versions/{versionId}/frequency-ranges/{rangeId}/move'])expect(paths[path]).toBeTruthy();
    expect(JSON.stringify({bpmList:paths['/v1/admin/bpm-templates'].get.responses,bpmDetail:paths['/v1/admin/bpm-templates/{templateId}'].get.responses,riskList:paths['/v1/admin/risk-rule-sets'].get.responses,riskDetail:paths['/v1/admin/risk-rule-sets/{setId}'].get.responses})).toContain('isDefault');
    const audits=(await query<any>("SELECT metadata::text FROM audit_events WHERE action LIKE 'CATALOG_%' OR action LIKE 'BPM_%' OR action LIKE 'RISK_%' ORDER BY occurred_at DESC LIMIT 100")).rows;
    expect(JSON.stringify(audits)).not.toMatch(/Criterion|Subsection|Applicable|Semiannual|description|attributes|sourceReference/i);
    expect(JSON.stringify(await catalogs.list(actor(adminId,'ADMIN')))).not.toMatch(/password|metadata|normalized/i);
  });
});
