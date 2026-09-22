import express from 'express';
import request from 'supertest';
import { beforeEach,describe,expect,it,vi } from 'vitest';

const mocks=vi.hoisted(()=>({query:vi.fn(),clientQuery:vi.fn(),verifyPassword:vi.fn(),audit:vi.fn()}));
vi.mock('../../db/client.js',()=>({query:mocks.query,withTransaction:async(fn:any)=>fn({query:mocks.clientQuery})}));
vi.mock('../../core/auth/password.js',()=>({verifyPassword:mocks.verifyPassword,hashPassword:vi.fn()}));
vi.mock('../../core/audit/auth-audit.service.js',()=>({writeAuthAudit:mocks.audit}));

import authRoutes from '../../modules/auth/routes.js';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { canAccess } from '../../core/auth/roles.js';

const makeApp=()=>{const app=express();app.use(express.json());app.use((req,res,next)=>{req.context={correlationId:'123e4567-e89b-42d3-a456-426614174000'};res.locals.correlationId=req.context.correlationId;next()});app.use('/v1/auth',authRoutes);return app};

describe('auth foundation',()=>{beforeEach(()=>{vi.clearAllMocks();env.JWT_ACCESS_SECRET='test-secret-with-at-least-thirty-two-bytes'});
it('inicia sesión y entrega tokens sin exponer el hash',async()=>{mocks.query.mockResolvedValueOnce({rows:[{id:'11111111-1111-4111-8111-111111111111',password_hash:'hash',status:'APPROVED',role:'COORDINATOR'}]}).mockResolvedValueOnce({rows:[]});mocks.verifyPassword.mockResolvedValue(true);const response=await request(makeApp()).post('/v1/auth/login').send({email:'user@example.test',password:'secret'});expect(response.status).toBe(200);expect(response.body.data.accessToken).toBeTypeOf('string');expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');expect(JSON.stringify(response.body)).not.toContain('hash');expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'AUTH_LOGIN_SUCCEEDED'}))});
it('audita login fallido como sistema',async()=>{mocks.query.mockResolvedValueOnce({rows:[]});const response=await request(makeApp()).post('/v1/auth/login').send({email:'none@example.test',password:'bad'});expect(response.status).toBe(401);const event=mocks.audit.mock.calls[0][0];expect(event.action).toBe('AUTH_LOGIN_FAILED');expect(event).not.toHaveProperty('userId')});
it('bloquea refresh sin Origin confiable',async()=>{const response=await request(makeApp()).post('/v1/auth/refresh');expect(response.status).toBe(403);expect(mocks.clientQuery).not.toHaveBeenCalled()});
it('rota un refresh token válido y revoca el anterior',async()=>{mocks.query.mockResolvedValueOnce({rows:[{id:'11111111-1111-4111-8111-111111111111',password_hash:'hash',status:'APPROVED',role:'EVALUATOR'}]}).mockResolvedValueOnce({rows:[]});mocks.verifyPassword.mockResolvedValue(true);const login=await request(makeApp()).post('/v1/auth/login').send({email:'user@example.test',password:'secret'});const cookie=login.headers['set-cookie'][0].split(';')[0];mocks.clientQuery.mockResolvedValueOnce({rows:[{id:cookie.split('=')[1].split('.')[0],user_id:'11111111-1111-4111-8111-111111111111',token_hash:(await import('../../core/auth/tokens.js')).parseOpaqueRefreshToken(cookie.split('=')[1])!.hash,role:'EVALUATOR'}]}).mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[]});const response=await request(makeApp()).post('/v1/auth/refresh').set('Origin','http://localhost:5173').set('Cookie',cookie);expect(response.status).toBe(200);expect(mocks.clientQuery).toHaveBeenCalledTimes(3);expect(response.headers['set-cookie'][0]).not.toContain(cookie)});
it('rechaza un refresh revocado o inexistente',async()=>{mocks.clientQuery.mockResolvedValueOnce({rows:[]});const response=await request(makeApp()).post('/v1/auth/refresh').set('Origin','http://localhost:5173').set('Cookie','refresh_token=11111111-1111-4111-8111-111111111111.secret');expect(response.status).toBe(401);expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({action:'AUTH_REFRESH_REJECTED'}))});
it('cierra sesión y limpia la cookie',async()=>{mocks.query.mockResolvedValueOnce({rows:[]});const response=await request(makeApp()).post('/v1/auth/logout').set('Origin','http://localhost:5173').set('Cookie','refresh_token=11111111-1111-4111-8111-111111111111.secret');expect(response.status).toBe(200);expect(response.headers['set-cookie'][0]).toContain('refresh_token=;')});
it('reauthentica y UNIVERSAL supera RBAC',async()=>{mocks.query.mockResolvedValueOnce({rows:[{password_hash:'hash',role:'UNIVERSAL'}]});mocks.verifyPassword.mockResolvedValue(true);const access=await signAccessToken('11111111-1111-4111-8111-111111111111','UNIVERSAL',1);const response=await request(makeApp()).post('/v1/auth/reauthenticate').set('Authorization',`Bearer ${access}`).send({password:'secret'});expect(response.status).toBe(200);expect(canAccess('UNIVERSAL',['ADMIN'])).toBe(true)});
});
