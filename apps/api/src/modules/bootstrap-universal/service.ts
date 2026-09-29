import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hashPassword } from '../../core/auth/password.js';
import { newPasswordSchema } from '../../core/auth/password-policy.js';
import { withTransaction } from '../../db/client.js';

const inputSchema=z.object({fullName:z.string().trim().min(1).max(200),email:z.string().trim().email().max(320).transform(value=>value.toLowerCase()),password:newPasswordSchema,correlationId:z.string().uuid().optional()}).strict();

export async function bootstrapUniversal(input:z.input<typeof inputSchema>){const parsed=inputSchema.parse(input);return withTransaction(async client=>{
  await client.query("SELECT pg_advisory_xact_lock(hashtext('ebr-bpm:first-universal:v1'))");
  let role=(await client.query<{id:string;is_universal:boolean}>("SELECT id,is_universal FROM roles WHERE code='UNIVERSAL' FOR UPDATE")).rows[0];
  if(!role)role=(await client.query<{id:string;is_universal:boolean}>("INSERT INTO roles(code,name,is_universal) VALUES('UNIVERSAL','Universal',true) RETURNING id,is_universal")).rows[0];
  if(!role.is_universal)throw new Error('UNIVERSAL_ROLE_INVALID');
  const existing=(await client.query<{id:string;role_code:string}>(`SELECT u.id,r.code role_code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email_normalized=$1 FOR UPDATE OF u`,[parsed.email])).rows[0];
  if(existing){if(existing.role_code!=='UNIVERSAL')throw new Error('EMAIL_ALREADY_ASSIGNED');return{id:existing.id,created:false,role:'UNIVERSAL' as const}}
  if((await client.query("SELECT 1 FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='UNIVERSAL' AND u.status='APPROVED' FOR UPDATE OF u LIMIT 1")).rowCount)throw new Error('UNIVERSAL_ALREADY_BOOTSTRAPPED');
  const passwordHash=await hashPassword(parsed.password);
  const user=(await client.query<{id:string}>(`INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES($1,$2,$3,$4,'APPROVED') RETURNING id`,[role.id,parsed.fullName,parsed.email,passwordHash])).rows[0];
  const correlationId=parsed.correlationId??randomUUID();
  await client.query(`INSERT INTO audit_events(actor_type,correlation_id,action,entity_type,entity_id,outcome,source,metadata) VALUES('SYSTEM',$1,'BOOTSTRAP_UNIVERSAL_CREATED','USER',$2,'SUCCESS','SYSTEM',$3::jsonb)`,[correlationId,user.id,JSON.stringify({roleCode:'UNIVERSAL',bootstrapVersion:1})]);
  return{id:user.id,created:true,role:'UNIVERSAL' as const};
})}
