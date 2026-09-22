import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { writeAuthAudit } from '../../core/audit/auth-audit.service.js';
import { authenticate } from '../../core/auth/authenticate.js';
import { requireTrustedOrigin } from '../../core/auth/csrf.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { verifyPassword } from '../../core/auth/password.js';
import { roleCodes, type RoleCode } from '../../core/auth/roles.js';
import { issueOpaqueRefreshToken, parseOpaqueRefreshToken } from '../../core/auth/tokens.js';
import { query, withTransaction } from '../../db/client.js';

const router=Router();
const credentials=z.object({email:z.string().email().transform(x=>x.trim().toLowerCase()),password:z.string().min(1).max(1024)}).strict();
const passwordBody=z.object({password:z.string().min(1).max(1024)}).strict();
const success=(res:Response,data:unknown)=>res.json({data,meta:{correlationId:res.locals.correlationId}});
const error=(req:Request,res:Response,status:number,code:string,message:string)=>res.status(status).json({error:{code,message},meta:{correlationId:req.context.correlationId}});
const cookieValue=(req:Request,name:string)=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1);
const refreshCookie=(res:Response,value:string)=>res.cookie('refresh_token',value,{httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/v1/auth',maxAge:30*24*60*60*1000});
const validRole=(value:string):value is RoleCode=>(roleCodes as readonly string[]).includes(value);
type UserRow={id:string;password_hash:string;role:string;status:string};

router.post('/login',async(req,res)=>{const parsed=credentials.safeParse(req.body);if(!parsed.success)return error(req,res,400,'VALIDATION_ERROR','La solicitud no es válida.');const result=await query<UserRow>('SELECT u.id,u.password_hash,u.status,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email_normalized=$1',[parsed.data.email]);const user=result.rows[0];const passwordOk=user?await verifyPassword(user.password_hash,parsed.data.password):false;if(!user||!passwordOk||user.status!=='APPROVED'||!validRole(user.role)){await writeAuthAudit({action:'AUTH_LOGIN_FAILED',outcome:'FAILURE',correlationId:req.context.correlationId});return error(req,res,401,'UNAUTHENTICATED','Credenciales inválidas.')}const refresh=issueOpaqueRefreshToken();await query('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 days\')',[refresh.tokenId,user.id,refresh.hash]);refreshCookie(res,refresh.token);const accessToken=await signAccessToken(user.id,user.role);await writeAuthAudit({action:'AUTH_LOGIN_SUCCEEDED',outcome:'SUCCESS',correlationId:req.context.correlationId,userId:user.id});return success(res,{accessToken})});

router.post('/refresh',requireTrustedOrigin,async(req,res)=>{const parsed=parseOpaqueRefreshToken(cookieValue(req,'refresh_token')??'');if(!parsed){await writeAuthAudit({action:'AUTH_REFRESH_REJECTED',outcome:'FAILURE',correlationId:req.context.correlationId});return error(req,res,401,'UNAUTHENTICATED','Refresh token inválido.')}const next=issueOpaqueRefreshToken();const rotated=await withTransaction(async client=>{const current=await client.query<{id:string;user_id:string;token_hash:string;role:string}>('SELECT t.id,t.user_id,t.token_hash,r.code AS role FROM refresh_tokens t JOIN users u ON u.id=t.user_id JOIN roles r ON r.id=u.role_id WHERE t.id=$1 AND t.revoked_at IS NULL AND t.expires_at>now() FOR UPDATE',[parsed.tokenId]);const row=current.rows[0];if(!row||!validRole(row.role))return null;const supplied=Buffer.from(parsed.hash,'hex'),stored=Buffer.from(row.token_hash.trim(),'hex');if(supplied.length!==stored.length||!timingSafeEqual(supplied,stored))return null;await client.query('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 days\')',[next.tokenId,row.user_id,next.hash]);await client.query('UPDATE refresh_tokens SET revoked_at=now(),replaced_by_id=$1 WHERE id=$2',[next.tokenId,row.id]);await writeAuthAudit({action:'AUTH_REFRESH_SUCCEEDED',outcome:'SUCCESS',correlationId:req.context.correlationId,userId:row.user_id,client});return {userId:row.user_id,role:row.role}});if(!rotated){await writeAuthAudit({action:'AUTH_REFRESH_REJECTED',outcome:'FAILURE',correlationId:req.context.correlationId});return error(req,res,401,'UNAUTHENTICATED','Refresh token inválido.')}refreshCookie(res,next.token);return success(res,{accessToken:await signAccessToken(rotated.userId,rotated.role)})});

router.post('/logout',requireTrustedOrigin,async(req,res)=>{const parsed=parseOpaqueRefreshToken(cookieValue(req,'refresh_token')??'');let userId:string|undefined;if(parsed){const result=await query<{user_id:string}>('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND token_hash=$2 RETURNING user_id',[parsed.tokenId,parsed.hash]);userId=result.rows[0]?.user_id}res.clearCookie('refresh_token',{httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/v1/auth'});await writeAuthAudit({action:'AUTH_LOGOUT',outcome:'SUCCESS',correlationId:req.context.correlationId,userId});return success(res,{loggedOut:true})});

router.post('/reauthenticate',authenticate,async(req,res)=>{const parsed=passwordBody.safeParse(req.body);if(!parsed.success)return error(req,res,400,'VALIDATION_ERROR','La solicitud no es válida.');const result=await query<{password_hash:string;role:string}>('SELECT u.password_hash,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 AND u.status=\'APPROVED\'',[req.auth!.userId]);const user=result.rows[0];if(!user||!validRole(user.role)||!await verifyPassword(user.password_hash,parsed.data.password))return error(req,res,401,'UNAUTHENTICATED','Credenciales inválidas.');const accessToken=await signAccessToken(req.auth!.userId,user.role,Math.floor(Date.now()/1000));await writeAuthAudit({action:'AUTH_REAUTHENTICATED',outcome:'SUCCESS',correlationId:req.context.correlationId,userId:req.auth!.userId});return success(res,{accessToken})});

router.get('/me',authenticate,(req,res)=>success(res,{id:req.auth!.userId,role:req.auth!.role,authTime:req.auth!.authTime}));
export default router;
