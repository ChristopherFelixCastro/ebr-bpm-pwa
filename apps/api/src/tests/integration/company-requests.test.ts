import express from 'express';
import request from 'supertest';
import {beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({query:vi.fn(),clientQuery:vi.fn(),audit:vi.fn(),upload:vi.fn(),remove:vi.fn(),sign:vi.fn(),commit:vi.fn(),rollback:vi.fn()}));
vi.mock('../../db/client.js',()=>({query:mocks.query,withTransaction:async(fn:any)=>{try{const value=await fn({query:mocks.clientQuery});mocks.commit();return value}catch(error){mocks.rollback();throw error}}}));
vi.mock('../../core/audit/domain-audit.service.js',()=>({writeDomainAudit:mocks.audit}));
vi.mock('../../core/storage/storage.service.js',()=>({uploadPrivateObject:mocks.upload,removePrivateObject:mocks.remove,createShortLivedDownloadUrl:mocks.sign,PrivateStorageError:class PrivateStorageError extends Error{constructor(public code:'OBJECT_NOT_FOUND'|'UNAVAILABLE'){super(code)}}}));

import {env} from '../../config/env.js';
import {signAccessToken} from '../../core/auth/jwt.js';
import routes from '../../modules/company-requests/routes.js';
import {openApiDocument} from '../../openapi.js';

const actor='11111111-1111-4111-8111-111111111111';
const company='22222222-2222-4222-8222-222222222222';
const establishment='33333333-3333-4333-8333-333333333333';
const requestId='44444444-4444-4444-8444-444444444444';
const contact='55555555-5555-4555-8555-555555555555';
const requestContact='66666666-6666-4666-8666-666666666666';
const documentId='77777777-7777-4777-8777-777777777777';
const caseId='88888888-8888-4888-8888-888888888888';
const requestRow={id:requestId,companyId:company,establishmentId:establishment,establishmentName:'Planta',requestType:'REGISTRATION',reason:'Registro',observations:null,status:'DRAFT',submittedAt:null,createdByUserId:actor,version:1,createdAt:new Date(),updatedAt:new Date()};
const documentRow={id:documentId,requestId,documentType:'AUTHORIZATION_LETTER',fileName:'letter.pdf',mimeType:'application/pdf',sizeBytes:9,status:'PENDING',uploadedAt:new Date(),validatedAt:null,validatedByUserId:null,rejectionReason:null,archivedAt:null,version:1,createdAt:new Date(),updatedAt:new Date()};
const createBody={companyId:company,establishmentId:establishment,requestType:'REGISTRATION',reason:'Registro'};
const app=()=>{const a=express();a.use(express.json());a.use((q,s,n)=>{q.context={correlationId:'123e4567-e89b-42d3-a456-426614174000'};s.locals.correlationId=q.context.correlationId;n()});a.use('/v1/company-requests',routes);return a};
const token=(role:any)=>signAccessToken(actor,role,Math.floor(Date.now()/1000));
const auth=async(role:any)=>({Authorization:`Bearer ${await token(role)}`});

describe('company requests HTTP',()=>{
  beforeEach(()=>{vi.clearAllMocks();env.JWT_ACCESS_SECRET='test-secret-with-at-least-thirty-two-bytes';mocks.upload.mockResolvedValue(undefined);mocks.remove.mockResolvedValue(undefined);mocks.sign.mockResolvedValue({signedUrl:'https://signed.test/file',expiresInSeconds:60})});

  it('applies global, company-scoped, empty-membership and forbidden list access',async()=>{
    for(const role of ['ADMIN','UNIVERSAL','COORDINATOR']){mocks.query.mockResolvedValueOnce({rows:[{total:'1'}]}).mockResolvedValueOnce({rows:[requestRow]});const r=await request(app()).get('/v1/company-requests').set(await auth(role));expect(r.status).toBe(200);expect(r.body.data).toHaveLength(1)}
    mocks.query.mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{total:'1'}]}).mockResolvedValueOnce({rows:[requestRow]});
    let r=await request(app()).get('/v1/company-requests').set(await auth('COMPANY_ADMIN'));expect(r.status).toBe(200);expect(mocks.query.mock.calls.at(-2)?.[1]?.[0]).toBe(company);
    mocks.query.mockResolvedValueOnce({rows:[]});r=await request(app()).get('/v1/company-requests').set(await auth('DELEGATE'));expect(r.body.data).toEqual([]);
    r=await request(app()).get('/v1/company-requests').set(await auth('EVALUATOR'));expect(r.status).toBe(403);
  });

  it('creates drafts for global and scoped writers and rejects read-only roles',async()=>{
    let r;
    for(const role of ['ADMIN','UNIVERSAL']){mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{id:requestId}]}).mockResolvedValueOnce({rows:[requestRow]});r=await request(app()).post('/v1/company-requests').set(await auth(role)).send(createBody);expect(r.status).toBe(201)}
    for(const role of ['COMPANY_ADMIN','DELEGATE']){mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{id:requestId}]}).mockResolvedValueOnce({rows:[requestRow]});r=await request(app()).post('/v1/company-requests').set(await auth(role)).send({...createBody,companyId:undefined});expect(r.status).toBe(201)}
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'COMPANY_REQUEST_CREATED'}));
    for(const role of ['COORDINATOR','EVALUATOR'])expect((await request(app()).post('/v1/company-requests').set(await auth(role)).send(createBody)).status).toBe(403);
  });

  it('enforces active organization, matching establishment and immutable submitted drafts',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[{companyStatus:'INACTIVE',establishmentStatus:'ACTIVE',companyId:company}]});
    let r=await request(app()).post('/v1/company-requests').set(await auth('ADMIN')).send(createBody);expect(r.status).toBe(409);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[{...requestRow,status:'PENDING_ASSIGNMENT'}]});
    r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('ADMIN')).send({version:1,reason:'Cambio'});expect(r.body.error.code).toBe('ALREADY_SUBMITTED');
  });

  it('rejects an establishment from another company and performs a valid patch',async()=>{
    const other='99999999-9999-4999-8999-999999999999';
    mocks.clientQuery.mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:other}]});
    let r=await request(app()).post('/v1/company-requests').set(await auth('ADMIN')).send(createBody);expect(r.status).toBe(400);expect(r.body.error.code).toBe('VALIDATION_ERROR');expect(String(mocks.clientQuery.mock.calls[0][0])).toContain('WHERE e.id=$1');expect(mocks.clientQuery.mock.calls[0][1]).toEqual([establishment]);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rowCount:1,rows:[]}).mockResolvedValueOnce({rows:[{...requestRow,reason:'Cambio',version:2}]});
    r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('UNIVERSAL')).send({version:1,reason:'Cambio'});expect(r.status).toBe(200);expect(r.body.data.version).toBe(2);expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'COMPANY_REQUEST_UPDATED'}));
  });

  it('distinguishes a missing establishment from a foreign one for company roles',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[]});let r=await request(app()).post('/v1/company-requests').set(await auth('ADMIN')).send(createBody);expect(r.status).toBe(404);expect(r.body.error.code).toBe('NOT_FOUND');
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:'99999999-9999-4999-8999-999999999999'}]});r=await request(app()).post('/v1/company-requests').set(await auth('COMPANY_ADMIN')).send({...createBody,companyId:undefined});expect(r.status).toBe(403);expect(r.body.error.code).toBe('FORBIDDEN');
  });

  it('applies real establishment ownership lookup to PATCH',async()=>{
    const foreignCompany='99999999-9999-4999-8999-999999999999';
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[]});let r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('ADMIN')).send({version:1,establishmentId:'99999999-9999-4999-8999-999999999998'});expect(r.status).toBe(404);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:foreignCompany}]});r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('UNIVERSAL')).send({version:1,establishmentId:'99999999-9999-4999-8999-999999999998'});expect(r.status).toBe(400);expect(r.body.error.code).toBe('VALIDATION_ERROR');
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:foreignCompany}]});r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('DELEGATE')).send({version:1,establishmentId:'99999999-9999-4999-8999-999999999998'});expect(r.status).toBe(403);
  });

  it('uses optimistic versions when patching and removing request contacts',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rowCount:0,rows:[]});
    let r=await request(app()).patch(`/v1/company-requests/${requestId}`).set(await auth('ADMIN')).send({version:9,reason:'Cambio'});expect(r.body.error.code).toBe('STALE_VERSION');
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rowCount:0,rows:[]});
    r=await request(app()).post(`/v1/company-requests/${requestId}/contacts/${requestContact}/remove`).set(await auth('ADMIN')).send({version:9});expect(r.body.error.code).toBe('STALE_VERSION');
  });

  it('links contacts and prevents scoped writers from using contacts outside their company',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{id:requestContact}]});
    let r=await request(app()).post(`/v1/company-requests/${requestId}/contacts`).set(await auth('UNIVERSAL')).send({contactId:contact,relationshipType:'PRIMARY_CONTACT',isPrimary:true});expect(r.status).toBe(201);expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'REQUEST_CONTACT_ADDED'}));
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rowCount:0,rows:[]});
    r=await request(app()).post(`/v1/company-requests/${requestId}/contacts`).set(await auth('COMPANY_ADMIN')).send({contactId:contact,relationshipType:'OWNER',isPrimary:false});expect(r.status).toBe(403);
  });

  it('takes contact snapshots from the server, retires logically, maps duplicates and permits historical re-entry',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{id:requestContact}]});
    let r=await request(app()).post(`/v1/company-requests/${requestId}/contacts`).set(await auth('ADMIN')).send({contactId:contact,relationshipType:'OWNER',isPrimary:false});expect(r.status).toBe(201);expect(String(mocks.clientQuery.mock.calls[1][0])).toMatch(/full_name,phone,email/);expect(String(mocks.clientQuery.mock.calls[1][0])).not.toMatch(/identity_document/);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rowCount:1,rows:[]});r=await request(app()).post(`/v1/company-requests/${requestId}/contacts/${requestContact}/remove`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(200);expect(String(mocks.clientQuery.mock.calls[1][0])).toContain('removed_at');
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockRejectedValueOnce(Object.assign(new Error('duplicate'),{code:'23505'}));r=await request(app()).post(`/v1/company-requests/${requestId}/contacts`).set(await auth('ADMIN')).send({contactId:contact,relationshipType:'OWNER',isPrimary:false});expect(r.status).toBe(409);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{id:requestContact}]});r=await request(app()).post(`/v1/company-requests/${requestId}/contacts`).set(await auth('ADMIN')).send({contactId:contact,relationshipType:'OWNER',isPrimary:false});expect(r.status).toBe(201);
  });

  it('validates multipart magic bytes, type, size and omits storage paths from DTOs',async()=>{
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'0',letter:'0'}]});
    mocks.clientQuery.mockResolvedValueOnce({rows:[{id:documentId}]}).mockResolvedValueOnce({rows:[documentRow]});
    const pdf=Buffer.from('%PDF-1.7\n');
    let r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','AUTHORIZATION_LETTER').attach('file',pdf,{filename:'letter.pdf',contentType:'application/pdf'});
    expect(r.status).toBe(201);expect(r.body.data.fileName).toBe('letter.pdf');expect(String(mocks.clientQuery.mock.calls[1][0])).toContain('file_name AS "fileName"');expect(mocks.upload).toHaveBeenCalled();expect(r.body.data).not.toHaveProperty('storagePath');expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('storagePath');
    r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.from('not-a-pdf'),{filename:'bad.pdf',contentType:'application/pdf'});expect(r.status).toBe(400);
    r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.alloc(5*1024*1024+1),{filename:'large.pdf',contentType:'application/pdf'});expect(r.status).toBe(413);
  });

  it('accepts PDF, JPEG and PNG signatures and rejects empty or forged files',async()=>{
    const files=[['a.pdf','application/pdf',Buffer.from('%PDF-1.7')],['a.jpg','image/jpeg',Buffer.from([0xff,0xd8,0xff,1])],['a.png','image/png',Buffer.from([137,80,78,71,13,10,26,10,1])]] as const;
    for(const [name,mime,bytes] of files){mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'0',letter:'0'}]});mocks.clientQuery.mockResolvedValueOnce({rows:[{id:documentId}]}).mockResolvedValueOnce({rows:[{...documentRow,mimeType:mime}]});const r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',bytes,{filename:name,contentType:mime});expect(r.status).toBe(201)}
    let r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.alloc(0),{filename:'empty.pdf',contentType:'application/pdf'});expect(r.status).toBe(400);
    r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.from('%PDF-1.7'),{filename:'fake.png',contentType:'image/png'});expect(r.status).toBe(400);
  });

  it('enforces ten active documents, one active letter and no metadata after Storage failure',async()=>{
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'10',letter:'0'}]});let r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.from('%PDF-1.7'),{filename:'a.pdf',contentType:'application/pdf'});expect(r.status).toBe(409);
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'1',letter:'1'}]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','AUTHORIZATION_LETTER').attach('file',Buffer.from('%PDF-1.7'),{filename:'letter.pdf',contentType:'application/pdf'});expect(r.status).toBe(409);
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'0',letter:'0'}]});mocks.upload.mockRejectedValueOnce(new Error('storage failed'));const before=mocks.clientQuery.mock.calls.length;r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.from('%PDF-1.7'),{filename:'a.pdf',contentType:'application/pdf'});expect(r.status).toBe(500);expect(mocks.clientQuery.mock.calls).toHaveLength(before);
  });

  it('removes a private object when database persistence fails',async()=>{
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'0',letter:'0'}]});mocks.clientQuery.mockRejectedValueOnce(new Error('database failure'));
    const r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','SUPPORTING_DOCUMENT').attach('file',Buffer.from('%PDF-1.7'),{filename:'evidence.pdf',contentType:'application/pdf'});
    expect(r.status).toBe(500);expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  it('allows ADMIN, UNIVERSAL and COORDINATOR to validate/reject and denies EVALUATOR',async()=>{
    for(const role of ['ADMIN','UNIVERSAL','COORDINATOR']){mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[documentRow]}).mockResolvedValueOnce({rowCount:1,rows:[]}).mockResolvedValueOnce({rows:[{...documentRow,status:'VALID',version:2}]});const r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/validate`).set(await auth(role)).send({version:1});expect(r.status).toBe(200)}
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[documentRow]}).mockResolvedValueOnce({rowCount:1,rows:[]}).mockResolvedValueOnce({rows:[{...documentRow,status:'REJECTED',rejectionReason:'Ilegible',version:2}]});let rejected=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/reject`).set(await auth('COORDINATOR')).send({version:1,reason:'  Ilegible  '});expect(rejected.status).toBe(200);expect(rejected.body.data.status).toBe('REJECTED');
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]});const denied=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/reject`).set(await auth('EVALUATOR')).send({version:1,reason:'Ilegible'});expect(denied.status).toBe(403);
  });

  it('requires rejection reason, blocks company roles from decisions and requires archive before replacement',async()=>{
    let r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/reject`).set(await auth('COORDINATOR')).send({version:1});expect(r.status).toBe(400);
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[documentRow]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/reject`).set(await auth('DELEGATE')).send({version:1,reason:'Ilegible'});expect(r.status).toBe(403);
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'1',letter:'1'}]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','AUTHORIZATION_LETTER').attach('file',Buffer.from('%PDF-1.7'),{filename:'new.pdf',contentType:'application/pdf'});expect(r.status).toBe(409);
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rows:[{...documentRow,status:'REJECTED'}]}).mockResolvedValueOnce({rows:[{companyId:company}]}).mockResolvedValueOnce({rowCount:1,rows:[]}).mockResolvedValueOnce({rows:[{...documentRow,status:'ARCHIVED'}]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/archive`).set(await auth('DELEGATE')).send({version:1});expect(r.status).toBe(200);expect(mocks.remove).not.toHaveBeenCalled();
    for(const status of ['PENDING','VALID']){mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{...documentRow,status}]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/archive`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(409)}
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{count:'1',letter:'0'}]});mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[{id:documentId}]}).mockResolvedValueOnce({rows:[documentRow]});r=await request(app()).post(`/v1/company-requests/${requestId}/documents`).set(await auth('ADMIN')).field('documentType','AUTHORIZATION_LETTER').attach('file',Buffer.from('%PDF-1.7'),{filename:'replacement.pdf',contentType:'application/pdf'});expect(r.status).toBe(201);
  });

  it('returns ALREADY_SUBMITTED for validate, reject and archive after submission',async()=>{
    const sent={...requestRow,status:'PENDING_ASSIGNMENT'};
    const actions=[['validate',{version:1}],['reject',{version:1,reason:'Ilegible'}],['archive',{version:1}]] as const;
    for(const [action,body] of actions){mocks.clientQuery.mockResolvedValueOnce({rows:[sent]});const r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/${action}`).set(await auth('ADMIN')).send(body);expect(r.status).toBe(409);expect(r.body.error.code).toBe('ALREADY_SUBMITTED');expect(mocks.clientQuery.mock.calls.at(-1)?.[1]).toEqual([requestId])}
  });

  it('maps SQLSTATE 55000 to a domain conflict instead of returning 500',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[documentRow]}).mockRejectedValueOnce(Object.assign(new Error('submitted request children are immutable'),{code:'55000'}));
    const r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/validate`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(409);expect(r.body.error.code).toBe('ALREADY_SUBMITTED');
  });

  it('archives only rejected documents, issues signed URLs and audits without storage paths',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{...documentRow,status:'REJECTED'}]}).mockResolvedValueOnce({rowCount:1,rows:[]}).mockResolvedValueOnce({rows:[{...documentRow,status:'ARCHIVED'}]});
    let r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/archive`).set(await auth('COORDINATOR')).send({version:1});expect(r.status).toBe(200);
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{...documentRow,storagePath:'request-document/private.pdf'}]});
    r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/download-url`).set(await auth('COORDINATOR'));expect(r.body.data).toEqual({signedUrl:'https://signed.test/file',expiresInSeconds:60});expect(mocks.sign).toHaveBeenCalledWith('request-document/private.pdf',60);expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('request-document/private.pdf');
  });

  it('paginates pending documents in draft requests without exposing private fields',async()=>{
    const pending={id:documentId,requestId,documentType:'AUTHORIZATION_LETTER',fileName:'letter.pdf',version:1,establishmentName:'Planta',requestType:'REGISTRATION'};
    for(const role of ['ADMIN','UNIVERSAL','COORDINATOR']){
      mocks.query.mockResolvedValueOnce({rows:[{total:'3'}]}).mockResolvedValueOnce({rows:[pending]});
      const r=await request(app()).get('/v1/company-requests/documents/pending?page=2&limit=1').set(await auth(role));
      expect(r.status).toBe(200);expect(r.body.meta).toMatchObject({page:2,limit:1,total:3});expect(r.body.data).toEqual([pending]);
      expect(JSON.stringify(r.body)).not.toMatch(/storagePath|signedUrl|mimeType|companyId/);
      const [countSql]=mocks.query.mock.calls.at(-2)!;const [rowsSql,values]=mocks.query.mock.calls.at(-1)!;
      for(const sql of [countSql,rowsSql]){expect(sql).toContain("cr.status='DRAFT'");expect(sql).toContain("d.status='PENDING'");expect(sql).toContain('d.deleted_at IS NULL');expect(sql).toContain('d.archived_at IS NULL')}
      expect(values).toEqual([1,1]);
    }
    for(const role of ['COMPANY_ADMIN','DELEGATE','EVALUATOR'])expect((await request(app()).get('/v1/company-requests/documents/pending').set(await auth(role))).status).toBe(403);
    expect((await request(app()).get('/v1/company-requests/documents/pending?page=0').set(await auth('ADMIN'))).status).toBe(400);
  });

  it('maps absent private objects to 404 and signing outages to 503',async()=>{
    const {PrivateStorageError}=await import('../../core/storage/storage.service.js');
    for(const [code,status] of [['OBJECT_NOT_FOUND',404],['UNAVAILABLE',503]] as const){
      mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{...documentRow,storagePath:'request-document/private.pdf'}]});
      mocks.sign.mockRejectedValueOnce(new PrivateStorageError(code));
      const r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/download-url`).set(await auth('COORDINATOR'));
      expect(r.status).toBe(status);expect(JSON.stringify(r.body)).not.toContain('request-document/private.pdf');
    }
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('submits atomically with exact prerequisites and creates a MEDIUM pending case',async()=>{
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{docs:'1',letters:'1',contacts:'1',primary:'1'}]}).mockResolvedValueOnce({rowCount:1,rows:[{id:requestId}]}).mockResolvedValueOnce({rows:[{id:caseId}]}).mockResolvedValueOnce({rows:[{...requestRow,status:'PENDING_ASSIGNMENT'}]});
    let r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(200);expect(r.body.data.caseId).toBe(caseId);expect(mocks.clientQuery.mock.calls.some(x=>String(x[0]).includes("'MEDIUM','PENDING_ASSIGNMENT'"))).toBe(true);expect(mocks.audit.mock.calls.map(x=>x[0].action)).toEqual(['COMPANY_REQUEST_SUBMITTED','COMPANY_REQUEST_CASE_CREATED']);expect(mocks.commit).toHaveBeenCalledTimes(1);expect(mocks.rollback).not.toHaveBeenCalled();
    mocks.clientQuery.mockReset().mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{docs:'1',letters:'0',contacts:'1',primary:'1'}]});
    r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(409);
  });

  it('blocks every invalid contact/letter submission state, repeat submission and rolls back on case failure',async()=>{
    for(const invalid of [{docs:'1',letters:'1',contacts:'0',primary:'0'},{docs:'1',letters:'1',contacts:'1',primary:'0'},{docs:'2',letters:'1',contacts:'2',primary:'2'}]){mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[invalid]});const r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('UNIVERSAL')).send({version:1});expect(r.status).toBe(409)}
    for(const letterState of ['PENDING','REJECTED','ARCHIVED','ABSENT']){mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{docs:letterState==='ARCHIVED'||letterState==='ABSENT'?'0':'1',letters:'0',contacts:'1',primary:'1'}]});const r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('ADMIN')).send({version:1});expect(r.status,letterState).toBe(409);expect(String(mocks.clientQuery.mock.calls.at(-1)?.[0])).toContain("status='VALID'")}
    mocks.clientQuery.mockResolvedValueOnce({rows:[{...requestRow,status:'PENDING_ASSIGNMENT'}]});let r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('ADMIN')).send({version:1});expect(r.body.error.code).toBe('ALREADY_SUBMITTED');
    mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyStatus:'ACTIVE',establishmentStatus:'ACTIVE',companyId:company}]}).mockResolvedValueOnce({rows:[{docs:'1',letters:'1',contacts:'1',primary:'1'}]}).mockResolvedValueOnce({rowCount:1,rows:[{id:requestId}]}).mockRejectedValueOnce(new Error('case failed'));r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth('ADMIN')).send({version:1});expect(r.status).toBe(500);expect(mocks.audit).not.toHaveBeenCalled();expect(mocks.rollback).toHaveBeenCalled();
  });

  it('denies out-of-scope download and all mutating routes to COORDINATOR/EVALUATOR',async()=>{
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{companyId:'99999999-9999-4999-8999-999999999999'}]});let r=await request(app()).post(`/v1/company-requests/${requestId}/documents/${documentId}/download-url`).set(await auth('DELEGATE'));expect(r.status).toBe(403);
    for(const role of ['COORDINATOR','EVALUATOR']){mocks.clientQuery.mockResolvedValueOnce({rows:[requestRow]});r=await request(app()).post(`/v1/company-requests/${requestId}/submit`).set(await auth(role)).send({version:1});expect(r.status).toBe(403)}
  });

  it('returns request detail without internal fields and documents all thirteen operations',async()=>{
    mocks.query.mockResolvedValueOnce({rows:[requestRow]}).mockResolvedValueOnce({rows:[{id:requestContact,contactId:contact,version:3}]}).mockResolvedValueOnce({rows:[documentRow]});
    const r=await request(app()).get(`/v1/company-requests/${requestId}`).set(await auth('ADMIN'));expect(r.status).toBe(200);expect(JSON.stringify(r.body)).not.toMatch(/storage_path|email_normalized|identity_document_normalized/);expect(r.body.data.documentSummary.total).toBe(1);
    const p:any=openApiDocument.paths;const operations=[p['/v1/company-requests'].get,p['/v1/company-requests'].post,p['/v1/company-requests/{id}'].get,p['/v1/company-requests/{id}'].patch,p['/v1/company-requests/{id}/submit'].post,p['/v1/company-requests/{id}/contacts'].post,p['/v1/company-requests/{id}/contacts/{requestContactId}/remove'].post,p['/v1/company-requests/{id}/documents'].get,p['/v1/company-requests/{id}/documents'].post,p['/v1/company-requests/{id}/documents/{documentId}/validate'].post,p['/v1/company-requests/{id}/documents/{documentId}/reject'].post,p['/v1/company-requests/{id}/documents/{documentId}/archive'].post,p['/v1/company-requests/{id}/documents/{documentId}/download-url'].post];expect(operations.every(Boolean)).toBe(true);expect(operations).toHaveLength(13);
  });
});
