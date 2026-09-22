import { Pool, type QueryResultRow } from 'pg'; import { env } from '../config/env.js';
export const pool=new Pool({connectionString:env.DATABASE_URL,max:10,connectionTimeoutMillis:3000,query_timeout:3000});
pool.on('error',()=>{/* pooled client errors are intentionally not emitted with connection details */});
export const query=<T extends QueryResultRow>(text:string,values:unknown[]=[])=>(pool.query<T>(text,values));
export async function withTransaction<T>(fn:(client:import('pg').PoolClient)=>Promise<T>){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
export const closeDatabasePool=()=>pool.end();
