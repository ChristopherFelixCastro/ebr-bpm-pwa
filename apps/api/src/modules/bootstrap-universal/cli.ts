import { randomUUID } from 'node:crypto';
import { closeDatabasePool } from '../../db/client.js';
import { bootstrapUniversal } from './service.js';

function args(values:string[]){const result=new Map<string,string>();for(let index=0;index<values.length;index+=1){const key=values[index],value=values[index+1];if(key.startsWith('--')&&value&&!value.startsWith('--')){result.set(key,value);index+=1}}return result}
const values=args(process.argv.slice(2));
const fullName=values.get('--name')??process.env.BOOTSTRAP_UNIVERSAL_NAME;
const email=values.get('--email')??process.env.BOOTSTRAP_UNIVERSAL_EMAIL;
const passwordEnvironment=values.get('--password-env')??'BOOTSTRAP_UNIVERSAL_PASSWORD';
const password=process.env[passwordEnvironment];
if(!fullName||!email||!password)throw new Error('Use --name/--email y una variable no versionada indicada por --password-env (por defecto BOOTSTRAP_UNIVERSAL_PASSWORD).');
try{const result=await bootstrapUniversal({fullName,email,password,correlationId:values.get('--correlation-id')??randomUUID()});console.log(JSON.stringify({status:'SUCCEEDED',userId:result.id,created:result.created,role:result.role},null,2))}catch(error){console.error(JSON.stringify({status:'FAILED',code:(error as Error).message},null,2));process.exitCode=1}finally{await closeDatabasePool()}
