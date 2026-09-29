import type{PoolClient}from'pg';
import{env}from'../../config/env.js';
import{writeDomainAudit}from'../../core/audit/domain-audit.service.js';
import type{RoleCode}from'../../core/auth/roles.js';

export type Actor={userId:string;role:RoleCode;authTime:number};
export type ValidationIssue={code:string;path:string;message:string};
export type ValidationResult={valid:boolean;errors:ValidationIssue[];warnings:ValidationIssue[];summary:{errorCount:number;warningCount:number}};
export type DefinitionErrorCode='FORBIDDEN'|'NOT_FOUND'|'CONFLICT'|'STALE_VERSION'|'VALIDATION_ERROR'|'REAUTHENTICATION_REQUIRED'|'PUBLICATION_INVALID';
export class DefinitionError extends Error{constructor(public code:DefinitionErrorCode,public details?:unknown){super(code)}}
const readers=new Set<RoleCode>(['ADMIN','UNIVERSAL','COORDINATOR']);
const writers=new Set<RoleCode>(['ADMIN','UNIVERSAL']);
export function requireRead(a:Actor){if(!readers.has(a.role))throw new DefinitionError('FORBIDDEN')}
export function requireWrite(a:Actor){if(!writers.has(a.role))throw new DefinitionError('FORBIDDEN')}
export function requireRecent(a:Actor){requireWrite(a);if(Math.floor(Date.now()/1000)-a.authTime>env.JWT_REAUTH_MAX_AGE_MINUTES*60)throw new DefinitionError('REAUTHENTICATION_REQUIRED')}
export const result=(errors:ValidationIssue[],warnings:ValidationIssue[]=[]):ValidationResult=>{errors.sort((a,b)=>(a.code+a.path).localeCompare(b.code+b.path));warnings.sort((a,b)=>(a.code+a.path).localeCompare(b.code+b.path));return{valid:errors.length===0,errors,warnings,summary:{errorCount:errors.length,warningCount:warnings.length}}};
export const state=(row:any)=>row.status==='DRAFT'?'DRAFT':row.retiredAt?'RETIRED':'PUBLISHED';
export const versionDto=(row:any)=>({id:row.id,resourceId:row.resourceId,versionNumber:row.versionNumber,status:state(row),publicationNote:row.publicationNote??null,effectiveFrom:row.effectiveFrom??null,effectiveTo:row.effectiveTo??null,publishedAt:row.publishedAt??null,publishedByUserId:row.publishedByUserId??null,retiredAt:row.retiredAt??null,retiredByUserId:row.retiredByUserId??null,version:row.version,createdAt:row.createdAt,updatedAt:row.updatedAt});
export const audit=(client:PoolClient,action:string,a:Actor,correlationId:string,entityType:string,entityId:string,metadata:Record<string,string|number|boolean|null>)=>writeDomainAudit({action,actorUserId:a.userId,correlationId,entityType,entityId,metadata,client});
export function assertVersion(row:any,expected:number){if(Number(row.version)!==expected)throw new DefinitionError('STALE_VERSION')}
export function tree<T extends{id:string;parentId:string|null;sortOrder:number}>(rows:T[]){const children=new Map<string|null,T[]>();for(const row of rows){const list=children.get(row.parentId)??[];list.push(row);children.set(row.parentId,list)}for(const list of children.values())list.sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));const seen=new Set<string>();const build=(parent:string|null):any[]=>(children.get(parent)??[]).map(row=>{if(seen.has(row.id))return{...row,children:[]};seen.add(row.id);return{...row,children:build(row.id)}});return build(null)}
export function cloneOrder<T extends{id:string;parentId:string|null}>(rows:T[]){const pending=[...rows],ordered:T[]=[],seen=new Set<string>();while(pending.length){const index=pending.findIndex(x=>x.parentId===null||seen.has(x.parentId));if(index<0)throw new DefinitionError('CONFLICT');const[row]=pending.splice(index,1);ordered.push(row);seen.add(row.id)}return ordered}
export async function lockResource(client:PoolClient,key:string,id:string){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${key}:${id}`])}
