import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Runs against the migrated database in DATABASE_URL; only private Storage is replaced by an in-memory double.
const storage = vi.hoisted(() => ({ objects: new Map<string, Buffer>(), failUpload: false }));
vi.mock('../../core/storage/storage.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/storage/storage.service.js')>();
  return {
    ...actual,
    uploadPrivateObject: vi.fn(async ({ storagePath, content }: { storagePath: string; content: Uint8Array }) => {
      if (storage.failUpload) throw new actual.PrivateStorageError('UNAVAILABLE', 'NETWORK_UNAVAILABLE');
      storage.objects.set(storagePath, Buffer.from(content));
      return { storagePath };
    }),
    removePrivateObject: vi.fn(async (storagePath: string) => { storage.objects.delete(storagePath); }),
    createShortLivedDownloadUrl: vi.fn(async (storagePath: string) => {
      if (!storage.objects.has(storagePath)) throw new actual.PrivateStorageError('OBJECT_NOT_FOUND');
      return { signedUrl: `https://storage.test/signed/${randomUUID()}`, expiresInSeconds: 60 };
    }),
  };
});

import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { query, withTransaction } from '../../db/client.js';
import { storeLetter } from '../../modules/users/authorization-letters.js';

const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const pdf = Buffer.from('%PDF-1.4\n% carta de autorizacion de prueba\n%%EOF\n');
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32, 1)]);
const now = () => Math.floor(Date.now() / 1000);
const stale = () => now() - (env.JWT_REAUTH_MAX_AGE_MINUTES + 1) * 60;
type Actors = { admin: string; universal: string; otherUniversal: string; companyId: string };
let actors: Actors;
const bearer = async (id: string, role: 'ADMIN' | 'UNIVERSAL', authTime = now()) => `Bearer ${await signAccessToken(id, role, authTime)}`;
const asAdmin = (authTime?: number) => bearer(actors.admin, 'ADMIN', authTime);
const asUniversal = (authTime?: number) => bearer(actors.universal, 'UNIVERSAL', authTime);
const origin = 'http://localhost:5179';

async function insertUser(role: string, status: string, label: string) {
  return (await query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,$1,$2,'hash',$3 FROM roles WHERE code=$4 RETURNING id`,
    [`${label} ${suffix}`, `${label.toLowerCase().replace(/\s+/g, '.')}.${suffix}@example.test`, status, role])).rows[0].id;
}
async function createPending(as: string, roleCode = 'EVALUATOR', label = `Pending ${randomUUID().slice(0, 6)}`) {
  const response = await request(app).post('/v1/users').set('Authorization', as)
    .send({ fullName: `${label} ${suffix}`, email: `${label.toLowerCase().replace(/\s+/g, '.')}.${suffix}@example.test`, password: 'LongPassword123!', roleCode });
  expect(response.status).toBe(201);
  return response.body.data as { id: string; version: number; status: string };
}
const upload = (as: string, userId: string, file: Buffer, name: string, type: string) =>
  request(app).post(`/v1/users/${userId}/authorization-letters`).set('Authorization', as).attach('file', file, { filename: name, contentType: type });
const currentUser = async (userId: string) => (await request(app).get(`/v1/users/${userId}`).set('Authorization', await asUniversal())).body.data;

describe('F users RBAC and account authorization letter (database)', () => {
  beforeAll(async () => {
    await query(`INSERT INTO roles(code,name,is_universal) VALUES('ADMIN','Administrator',false),('UNIVERSAL','Universal',true),('EVALUATOR','Evaluator',false),
      ('COMPANY_ADMIN','Company administrator',false),('DELEGATE','Delegate',false) ON CONFLICT(code) DO NOTHING`);
    const companyId = (await query<{ id: string }>('INSERT INTO companies(legal_name,rnc) VALUES($1,$2) RETURNING id', [`Letters ${suffix}`, `LET-${suffix}`])).rows[0].id;
    actors = { admin: await insertUser('ADMIN', 'APPROVED', 'Rbac Admin'), universal: await insertUser('UNIVERSAL', 'APPROVED', 'Rbac Universal'),
      otherUniversal: await insertUser('UNIVERSAL', 'APPROVED', 'Rbac Hidden Universal'), companyId };
  });
  beforeEach(() => { storage.failUpload = false; });

  it('hides UNIVERSAL accounts from ADMIN in rows, paginated totals and direct reads', async () => {
    const admin = await request(app).get(`/v1/users?search=${suffix}&limit=100`).set('Authorization', await asAdmin());
    const universal = await request(app).get(`/v1/users?search=${suffix}&limit=100`).set('Authorization', await asUniversal());
    expect(admin.status).toBe(200);
    expect(admin.body.data.some((user: { roleCode: string }) => user.roleCode === 'UNIVERSAL')).toBe(false);
    expect(universal.body.data.filter((user: { roleCode: string }) => user.roleCode === 'UNIVERSAL').length).toBe(2);
    expect(admin.body.meta.total).toBe(universal.body.meta.total - 2);
    const filtered = await request(app).get('/v1/users?roleCode=UNIVERSAL').set('Authorization', await asAdmin());
    expect(filtered.body).toMatchObject({ data: [], meta: { total: 0 } });
    expect((await request(app).get(`/v1/users/${actors.otherUniversal}`).set('Authorization', await asAdmin())).status).toBe(404);
    expect((await request(app).get(`/v1/users/${actors.otherUniversal}`).set('Authorization', await asUniversal())).status).toBe(200);
    expect((await request(app).get(`/v1/users/${actors.otherUniversal}/authorization-letters`).set('Authorization', await asAdmin())).status).toBe(404);
  });

  it('escapes LIKE wildcards in search', async () => {
    const response = await request(app).get('/v1/users?search=%25').set('Authorization', await asUniversal());
    expect(response.status).toBe(200);
    expect(response.body.data.every((user: { fullName: string; email: string }) => `${user.fullName}${user.email}`.includes('%'))).toBe(true);
  });

  it('prevents ADMIN from creating, promoting or demoting UNIVERSAL accounts and audits the denial', async () => {
    const before = Number((await query<{ count: string }>("SELECT count(*) FROM audit_events WHERE action='AUTH_FORBIDDEN' AND actor_user_id=$1", [actors.admin])).rows[0].count);
    const create = await request(app).post('/v1/users').set('Authorization', await asAdmin())
      .send({ fullName: 'Nope', email: `nope.${suffix}@example.test`, password: 'LongPassword123!', roleCode: 'UNIVERSAL' });
    expect(create.status).toBe(403);
    const pending = await createPending(await asAdmin());
    const promote = await request(app).patch(`/v1/users/${pending.id}`).set('Authorization', await asAdmin()).send({ version: pending.version, roleCode: 'UNIVERSAL' });
    expect(promote.status).toBe(403);
    const hidden = await currentUser(actors.otherUniversal);
    const demote = await request(app).patch(`/v1/users/${actors.otherUniversal}`).set('Authorization', await asAdmin()).send({ version: hidden.version, roleCode: 'ADMIN' });
    expect(demote.status).toBe(404);
    for (const action of ['approve', 'reject', 'deactivate'])
      expect((await request(app).post(`/v1/users/${actors.otherUniversal}/${action}`).set('Authorization', await asAdmin()).send({ version: hidden.version })).status).toBe(404);
    expect((await currentUser(actors.otherUniversal)).roleCode).toBe('UNIVERSAL');
    const after = Number((await query<{ count: string }>("SELECT count(*) FROM audit_events WHERE action='AUTH_FORBIDDEN' AND actor_user_id=$1", [actors.admin])).rows[0].count);
    expect(after - before).toBe(6);
  });

  it('requires recent reauthentication for UNIVERSAL account changes and for every status decision', async () => {
    const payload = { fullName: 'Second Universal', email: `second.universal.${suffix}@example.test`, password: 'LongPassword123!', roleCode: 'UNIVERSAL' };
    expect((await request(app).post('/v1/users').set('Authorization', await asUniversal(stale())).send(payload)).body.error.code).toBe('REAUTHENTICATION_REQUIRED');
    const created = await request(app).post('/v1/users').set('Authorization', await asUniversal()).send(payload);
    expect(created.status).toBe(201);
    const pending = await createPending(await asAdmin());
    const denied = await request(app).post(`/v1/users/${pending.id}/reject`).set('Authorization', await asAdmin(stale())).send({ version: pending.version });
    expect(denied.status).toBe(401);
    expect((await request(app).post(`/v1/users/${pending.id}/reject`).set('Authorization', await asAdmin()).send({ version: pending.version })).body.data.status).toBe('REJECTED');
    expect((await request(app).post(`/v1/users/${actors.admin}/deactivate`).set('Authorization', await asAdmin()).send({ version: 1 })).status).toBe(403);
  });

  it('keeps optimistic versioning on user edits', async () => {
    const pending = await createPending(await asAdmin());
    expect((await request(app).patch(`/v1/users/${pending.id}`).set('Authorization', await asAdmin()).send({ version: pending.version, fullName: `Renamed ${suffix}` })).status).toBe(200);
    const stale = await request(app).patch(`/v1/users/${pending.id}`).set('Authorization', await asAdmin()).send({ version: pending.version, fullName: `Again ${suffix}` });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
  });

  it('approves only with an active VALID letter reviewed by someone else', async () => {
    const pending = await createPending(await asAdmin());
    const approve = async () => request(app).post(`/v1/users/${pending.id}/approve`).set('Authorization', await asAdmin()).send({ version: (await currentUser(pending.id)).version });
    expect((await approve()).body.error.code).toBe('AUTHORIZATION_LETTER_REQUIRED');

    expect((await upload(await asAdmin(), pending.id, Buffer.from('not a pdf'), 'carta.pdf', 'application/pdf')).status).toBe(400);
    expect((await upload(await asAdmin(), pending.id, Buffer.from('GIF89a'), 'carta.gif', 'image/gif')).status).toBe(415);
    expect((await upload(await asAdmin(), pending.id, Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]), 'carta.pdf', 'application/pdf')).status).toBe(413);

    const uploaded = await upload(await asAdmin(), pending.id, pdf, 'carta autorización.pdf', 'application/pdf');
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data).toMatchObject({ status: 'PENDING', mimeType: 'application/pdf', sizeBytes: pdf.length, sha256: createHash('sha256').update(pdf).digest('hex') });
    expect(JSON.stringify(uploaded.body)).not.toContain('account-authorization-letter/');
    expect((await currentUser(pending.id)).authorizationLetterStatus).toBe('PENDING');
    expect((await approve()).body.error.code).toBe('AUTHORIZATION_LETTER_REQUIRED');

    const letter = uploaded.body.data as { id: string; version: number };
    const base = `/v1/users/${pending.id}/authorization-letters/${letter.id}`;
    expect((await request(app).post(`${base}/reject`).set('Authorization', await asAdmin()).send({ version: letter.version })).status).toBe(400);
    expect((await request(app).post(`${base}/validate`).set('Authorization', await asAdmin(stale())).send({ version: letter.version })).status).toBe(401);
    expect((await request(app).post(`${base}/validate`).set('Authorization', await asAdmin()).send({ version: letter.version + 1 })).body.error.code).toBe('STALE_VERSION');
    const valid = await request(app).post(`${base}/validate`).set('Authorization', await asAdmin()).send({ version: letter.version });
    expect(valid.body.data).toMatchObject({ status: 'VALID', reviewedByUserId: actors.admin });

    const approved = await approve();
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({ status: 'APPROVED', authorizationLetterStatus: 'VALID' });
    expect((await upload(await asAdmin(), pending.id, pdf, 'otra.pdf', 'application/pdf')).body.error.code).toBe('INVALID_STATE');

    const audit = (await query<{ action: string; metadata: Record<string, unknown> }>("SELECT action,metadata FROM audit_events WHERE entity_type='USER_AUTHORIZATION_LETTER' AND entity_id=$1", [letter.id])).rows;
    expect(audit.map((row) => row.action)).toEqual(expect.arrayContaining(['USER_AUTHORIZATION_LETTER_UPLOADED', 'USER_AUTHORIZATION_LETTER_VALIDATED']));
    expect(JSON.stringify(audit)).not.toMatch(/carta|account-authorization-letter\/|signed/i);
  });

  it('rejects, archives on replacement and keeps the history', async () => {
    const pending = await createPending(await asAdmin());
    const first = (await upload(await asAdmin(), pending.id, pdf, 'carta.pdf', 'application/pdf')).body.data;
    await request(app).post(`/v1/users/${pending.id}/authorization-letters/${first.id}/reject`).set('Authorization', await asAdmin()).send({ version: first.version, reason: 'Firma ilegible' });
    const approve = await request(app).post(`/v1/users/${pending.id}/approve`).set('Authorization', await asAdmin()).send({ version: (await currentUser(pending.id)).version });
    expect(approve.body.error.code).toBe('AUTHORIZATION_LETTER_REQUIRED');
    const second = await upload(await asAdmin(), pending.id, png, 'carta.png', 'image/png');
    expect(second.status).toBe(201);
    const history = (await request(app).get(`/v1/users/${pending.id}/authorization-letters`).set('Authorization', await asAdmin())).body.data;
    expect(history.map((entry: { status: string }) => entry.status)).toEqual(['PENDING', 'ARCHIVED']);
    expect(history[1]).toMatchObject({ rejectionReason: 'Firma ilegible' });
    expect(JSON.stringify(history)).not.toMatch(/account-authorization-letter\/|signedUrl/);
  });

  it('issues a short-lived download only to authorized roles', async () => {
    const pending = await createPending(await asAdmin());
    const letter = (await upload(await asAdmin(), pending.id, pdf, 'carta.pdf', 'application/pdf')).body.data;
    const response = await request(app).post(`/v1/users/${pending.id}/authorization-letters/${letter.id}/download-url`).set('Authorization', await asAdmin());
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({ expiresInSeconds: 60 });
    const coordinator = await request(app).post(`/v1/users/${pending.id}/authorization-letters/${letter.id}/download-url`)
      .set('Authorization', `Bearer ${await signAccessToken(actors.admin, 'COORDINATOR', now())}`);
    expect(coordinator.status).toBe(403);
  });

  it('reports Storage failures without leaving rows and removes the object when persistence fails', async () => {
    const pending = await createPending(await asAdmin());
    storage.failUpload = true;
    const failed = await upload(await asAdmin(), pending.id, pdf, 'carta.pdf', 'application/pdf');
    expect(failed.status).toBe(503);
    expect((await query('SELECT 1 FROM user_authorization_documents WHERE user_id=$1', [pending.id])).rowCount).toBe(0);
    storage.failUpload = false;
    const sizeBefore = storage.objects.size;
    await expect(storeLetter(pending.id, { buffer: pdf, size: pdf.length, mimetype: 'application/pdf', originalname: 'carta.pdf' }, async () => { throw new Error('database down'); }))
      .rejects.toThrow('database down');
    expect(storage.objects.size).toBe(sizeBefore);
  });

  it('public registration with a letter stays pending and creates no session', async () => {
    const email = `register.letter.${suffix}@example.test`;
    const response = await request(app).post('/v1/auth/register').set('Origin', origin)
      .field('fullName', 'Registro Con Carta').field('email', email).field('password', 'LongPassword123!').field('roleCode', 'COMPANY_ADMIN').field('companyId', actors.companyId)
      .attach('authorizationLetter', pdf, { filename: 'carta.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: 'PENDING_VALIDATION', authorizationLetterStatus: 'PENDING' });
    expect(response.body.data.accessToken).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
    const letters = (await query<{ uploadedBy: string; status: string }>('SELECT uploaded_by_user_id AS "uploadedBy",status::text FROM user_authorization_documents WHERE user_id=$1', [response.body.data.id])).rows;
    expect(letters).toEqual([{ uploadedBy: response.body.data.id, status: 'PENDING' }]);

    const missing = await request(app).post('/v1/auth/register').set('Origin', origin)
      .field('fullName', 'Sin Carta').field('email', `register.missing.${suffix}@example.test`).field('password', 'LongPassword123!').field('roleCode', 'DELEGATE').field('companyId', actors.companyId);
    expect(missing.body.error.code).toBe('AUTHORIZATION_LETTER_REQUIRED');

    storage.failUpload = true;
    const unavailable = await request(app).post('/v1/auth/register').set('Origin', origin)
      .field('fullName', 'Storage Caido').field('email', `register.storage.${suffix}@example.test`).field('password', 'LongPassword123!').field('roleCode', 'DELEGATE').field('companyId', actors.companyId)
      .attach('authorizationLetter', pdf, { filename: 'carta.pdf', contentType: 'application/pdf' });
    expect(unavailable.status).toBe(503);
    expect((await query('SELECT 1 FROM users WHERE email_normalized=$1', [`register.storage.${suffix}@example.test`])).rowCount).toBe(0);
  });

  it('legacy JSON registration stays pending and cannot be approved without a letter', async () => {
    const response = await request(app).post('/v1/auth/register').set('Origin', origin)
      .send({ fullName: 'Registro Json', email: `register.json.${suffix}@example.test`, password: 'LongPassword123!', roleCode: 'DELEGATE', companyId: actors.companyId });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: 'PENDING_VALIDATION', authorizationLetterStatus: null });
    const approve = await request(app).post(`/v1/users/${response.body.data.id}/approve`).set('Authorization', await asAdmin()).send({ version: response.body.data.version });
    expect(approve.body.error.code).toBe('AUTHORIZATION_LETTER_REQUIRED');
  });

  it('the persistence guard blocks an approval that bypasses the route', async () => {
    const pending = await createPending(await asAdmin());
    await expect(withTransaction((client) => client.query("UPDATE users SET status='APPROVED' WHERE id=$1", [pending.id])))
      .rejects.toMatchObject({ code: '23514', constraint: 'users_approval_requires_valid_letter' });
  });
});
