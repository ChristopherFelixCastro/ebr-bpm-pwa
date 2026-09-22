import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { closeDatabasePool } from '../../db/client.js';
import { bpmManifestSchema, readManifest, riskManifestSchema } from './manifests.js';
import { importBpm, importRisk } from './service.js';

function argumentsMap(values:string[]){const result=new Map<string,string|true>();for(let index=0;index<values.length;index+=1){const value=values[index];if(!value.startsWith('--'))continue;const next=values[index+1];if(next&&!next.startsWith('--')){result.set(value,next);index+=1}else result.set(value,true)}return result}
const args=argumentsMap(process.argv.slice(2)),kind=process.argv[2] as 'bpm'|'risk';
const mode=args.has('--apply')?'APPLY':args.has('--dry-run')?'DRY_RUN':null;
const manifestArgument=(args.get('--manifest')??args.get('--file')) as string|undefined;
const manifestPath=manifestArgument?path.resolve(process.env.INIT_CWD??process.cwd(),manifestArgument):undefined;
if(!['bpm','risk'].includes(kind)||!mode||!manifestPath||args.has('--apply')===args.has('--dry-run'))throw new Error('Uso: <bpm|risk> --manifest <ruta> (--dry-run|--apply) [--actor-user-id <uuid>|--actor-label <identificador>] [--correlation-id <uuid>]');
const actorUserId=args.get('--actor-user-id') as string|undefined, actorLabel=(args.get('--actor-label') as string|undefined)??(actorUserId?`user:${actorUserId}`:mode==='DRY_RUN'?'cli-dry-run':'');
if(mode==='APPLY'&&!actorLabel)throw new Error('APPLY exige --actor-user-id o --actor-label.');
const correlationId=(args.get('--correlation-id') as string|undefined)??randomUUID();
try{const result=kind==='bpm'?await readManifest(manifestPath,bpmManifestSchema):await readManifest(manifestPath,riskManifestSchema);const report=kind==='bpm'?await importBpm(result.manifest as any,result.manifestHash,mode,{userId:actorUserId,label:actorLabel},correlationId):await importRisk(result.manifest as any,result.manifestHash,mode,{userId:actorUserId,label:actorLabel},correlationId);console.log(JSON.stringify(report,null,2));if(report.status==='REJECTED')process.exitCode=2}catch(error){const raw=error instanceof Error?error.message:'';const code=/^[A-Z][A-Z0-9_]{2,79}$/.test(raw)?raw:error instanceof Error&&error.name==='ZodError'?'INVALID_MANIFEST':'IMPORT_FAILED';console.error(JSON.stringify({status:'FAILED',code,correlationId},null,2));process.exitCode=1}finally{await closeDatabasePool()}
