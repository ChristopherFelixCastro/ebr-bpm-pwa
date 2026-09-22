import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { authenticate } from '../../core/auth/authenticate.js';
import { bad, ok } from '../cases/http.js';
import * as schema from './schemas.js';
import * as service from './service.js';

const router=Router();
const multipart=multer({storage:multer.memoryStorage(),limits:{files:1,fileSize:5*1024*1024}});
router.use(authenticate);
const actor=(q:Request):service.Actor=>q.auth!;
const fail=(q:Request,s:Response,e:unknown)=>{if(e instanceof service.InspectionError){const status:Record<service.InspectionErrorCode,number>={FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,DEFAULT_DEFINITIONS_UNAVAILABLE:409,STALE_VERSION:409,ALREADY_SUBMITTED:409,INSPECTION_IN_PROGRESS:409,VALIDATION_ERROR:400,PAYLOAD_TOO_LARGE:413,REAUTHENTICATION_REQUIRED:401,CALCULATION_INPUT_INCOMPLETE:422,IDEMPOTENCY_KEY_REUSED:409,PAYLOAD_HASH_MISMATCH:400,ONLINE_REQUIRED:409,BINARY_UPLOAD_REQUIRED:409};if(e.details)return s.status(status[e.code]).json({error:{code:e.code,message:'La operación no pudo completarse.',details:e.details},meta:{correlationId:q.context.correlationId}});return bad(q,s,status[e.code],e.code)}const code=(e as any)?.code;if(code==='23505'||code==='23514'||code==='55000')return bad(q,s,409,'CONFLICT');throw e};
const wrap=(f:(q:Request,s:Response)=>Promise<unknown>)=>async(q:Request,s:Response,n:any)=>{try{await f(q,s)}catch(e){try{fail(q,s,e)}catch(x){n(x)}}};
const id=(v:unknown)=>schema.uuid.safeParse(v);

router.get('/inspections',wrap(async(q,s)=>{const p=schema.inspectionListSchema.safeParse(q.query);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');const x=await service.list(p.data,actor(q));ok(q,s,x.rows,200,{page:p.data.page,limit:p.data.limit,total:x.total})}));
router.post('/cases/:caseId/inspections',wrap(async(q,s)=>{const p=id(q.params.caseId);if(!p.success||Object.keys(q.body??{}).length)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.create(p.data,actor(q),q.context.correlationId),201)}));
router.get('/inspections/:id',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.detail(p.data,actor(q)))}));
router.get('/inspections/:id/work-package',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.workPackage(p.data,actor(q)))}));
router.post('/inspections/:id/start',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.versionSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.start(p.data,b.data.version,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/submit',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.versionSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.submit(p.data,b.data.version,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/finalize',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.versionSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.finalize(p.data,b.data.version,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/unlock',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.unlockSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.unlock(p.data,b.data,actor(q),q.context.correlationId))}));

router.put('/inspections/:id/bpm-responses/:bpmItemId',wrap(async(q,s)=>{const p=id(q.params.id),item=id(q.params.bpmItemId),b=schema.bpmResponseSchema.safeParse(q.body);if(!p.success||!item.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.upsertResponse(p.data,item.data,b.data,actor(q),q.context.correlationId))}));
router.delete('/inspections/:id/bpm-responses/:bpmItemId',wrap(async(q,s)=>{const p=id(q.params.id),item=id(q.params.bpmItemId),b=schema.baseVersionSchema.safeParse(q.body);if(!p.success||!item.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.deleteResponse(p.data,item.data,b.data.baseVersion,actor(q),q.context.correlationId))}));
router.put('/inspections/:id/risk-factors/:factorId',wrap(async(q,s)=>{const p=id(q.params.id),factor=id(q.params.factorId),b=schema.riskFactorSchema.safeParse(q.body);if(!p.success||!factor.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.selectFactor(p.data,factor.data,b.data,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/food-snapshots',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.foodSnapshotSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.addFood(p.data,b.data,actor(q),q.context.correlationId),201)}));
router.get('/inspections/:id/food-snapshots',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.foodSnapshots(p.data,actor(q)))}));

router.get('/inspections/:id/evidence',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.evidenceList(p.data,actor(q)))}));
router.post('/inspections/:id/evidence',(q,s,n)=>multipart.single('file')(q,s,(e:any)=>e?bad(q,s,e.code==='LIMIT_FILE_SIZE'?413:400,e.code==='LIMIT_FILE_SIZE'?'PAYLOAD_TOO_LARGE':'VALIDATION_ERROR'):n()),wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success||!q.file)return bad(q,s,400,'VALIDATION_ERROR');const baseVersion=q.body.baseVersion===undefined?undefined:Number(q.body.baseVersion),operationId=q.body.operationId,payloadHash=q.body.payloadHash;if(baseVersion!==undefined&&(!Number.isInteger(baseVersion)||baseVersion<1)||operationId&&!schema.uuid.safeParse(operationId).success||payloadHash&&!/^[0-9a-f]{64}$/.test(payloadHash))return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.uploadEvidence(p.data,q.file,actor(q),q.context.correlationId,{baseVersion,operationId,payloadHash}),201)}));
router.post('/inspections/:id/evidence/:evidenceId/delete',wrap(async(q,s)=>{const p=id(q.params.id),e=id(q.params.evidenceId),b=schema.evidenceDeleteSchema.safeParse(q.body);if(!p.success||!e.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.deleteEvidence(p.data,e.data,b.data,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/evidence/:evidenceId/validate',wrap(async(q,s)=>{const p=id(q.params.id),e=id(q.params.evidenceId),b=schema.evidenceDecisionSchema.safeParse(q.body);if(!p.success||!e.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.decideEvidence(p.data,e.data,b.data.version,'VALID',undefined,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/evidence/:evidenceId/reject',wrap(async(q,s)=>{const p=id(q.params.id),e=id(q.params.evidenceId),b=schema.evidenceDecisionSchema.safeParse(q.body);if(!p.success||!e.success||!b.success||!b.data.reason)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.decideEvidence(p.data,e.data,b.data.version,'REJECTED',b.data.reason,actor(q),q.context.correlationId))}));
router.post('/inspections/:id/evidence/:evidenceId/download-url',wrap(async(q,s)=>{const p=id(q.params.id),e=id(q.params.evidenceId);if(!p.success||!e.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.downloadEvidence(p.data,e.data,actor(q),q.context.correlationId))}));

router.post('/inspections/:id/offline-operations/batch',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.offlineBatchSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.offlineBatch(p.data,b.data.operations,actor(q),q.context.correlationId))}));
router.get('/inspections/:id/offline-operations',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.operations(p.data,actor(q)))}));
router.get('/inspections/:id/offline-conflicts',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.operations(p.data,actor(q),true))}));

router.post('/inspections/:id/calculations/preview',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success||Object.keys(q.body??{}).length)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.preview(p.data,actor(q),q.context.correlationId))}));
router.get('/inspections/:id/calculations',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.calculationList(p.data,actor(q)))}));
router.get('/inspections/:id/calculations/current',wrap(async(q,s)=>{const p=id(q.params.id);if(!p.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.calculationCurrent(p.data,actor(q)))}));
router.get('/inspections/:id/calculations/:calculationId',wrap(async(q,s)=>{const p=id(q.params.id),c=id(q.params.calculationId);if(!p.success||!c.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.calculationDetail(p.data,c.data,actor(q)))}));
router.post('/inspections/:id/calculations/recalculate',wrap(async(q,s)=>{const p=id(q.params.id),b=schema.recalculateSchema.safeParse(q.body);if(!p.success||!b.success)return bad(q,s,400,'VALIDATION_ERROR');ok(q,s,await service.recalculate(p.data,b.data.reason,actor(q),q.context.correlationId))}));

export default router;
