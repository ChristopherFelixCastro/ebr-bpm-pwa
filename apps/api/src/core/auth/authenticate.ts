import type { NextFunction,Request,Response } from 'express';
import { verifyAccessToken } from './jwt.js';
import { roleCodes,type RoleCode } from './roles.js';
declare global { namespace Express { interface Request { auth?:{userId:string;role:RoleCode;authTime:number} } } }
export const authenticate=async(req:Request,res:Response,next:NextFunction)=>{try{const token=req.header('authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw Error();const {payload}=await verifyAccessToken(token);const userId=String(payload.sub??''),role=String(payload.role),authTime=Number(payload.auth_time);if(!userId||!(roleCodes as readonly string[]).includes(role)||!Number.isFinite(authTime))throw Error();req.auth={userId,role:role as RoleCode,authTime};next()}catch{return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Autenticación requerida.'},meta:{correlationId:req.context.correlationId}})}};
