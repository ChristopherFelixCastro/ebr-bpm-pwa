import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { query } from '../../db/client.js';

// Regression: nested risk-rule routes carry both the parent id and the entity id
// (/factors/:factorId/options/:optionId, /food-categories/:categoryId/subcategories/:subcategoryId).
// The route helper used to pick the parent id as the entity id, so PATCH/DELETE/move
// of options and subcategories always failed with STALE_VERSION or NOT_FOUND.

let adminId: string;
const authorization = async () => `Bearer ${await signAccessToken(adminId, 'ADMIN', Math.floor(Date.now() / 1000))}`;
const code = () => `RISK_NESTED_${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;

beforeAll(async () => {
  env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes';
  adminId = (await query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Risk Nested Admin',$1,'hash','APPROVED' FROM roles WHERE code='ADMIN' RETURNING id`, [`risk.nested.${randomUUID()}@example.test`])).rows[0].id;
});

describe('risk rule nested routes', () => {
  it('patches, moves and deletes an option and a subcategory on a draft version', async () => {
    const auth = await authorization();
    const set = await request(app).post('/v1/admin/risk-rule-sets').set('Authorization', auth).send({ code: code(), name: 'Nested routes' });
    expect(set.status).toBe(201);
    const setId = set.body.data.id;
    const draft = await request(app).post(`/v1/admin/risk-rule-sets/${setId}/versions`).set('Authorization', auth).send({});
    expect(draft.status).toBe(201);
    const base = `/v1/admin/risk-rule-sets/${setId}/versions/${draft.body.data.id}`;

    const factor = await request(app).post(`${base}/factors`).set('Authorization', auth).send({ code: 'VOLUME', name: 'Volumen', weight: 0.5, sortOrder: 1 });
    expect(factor.status).toBe(201);
    const factorId = factor.body.data.id;
    const option = await request(app).post(`${base}/factors/${factorId}/options`).set('Authorization', auth).send({ code: 'LOW', label: 'Bajo', score: 1, sortOrder: 1 });
    expect(option.status).toBe(201);
    const optionId = option.body.data.id;

    const patchedOption = await request(app).patch(`${base}/factors/${factorId}/options/${optionId}`).set('Authorization', auth).send({ version: option.body.data.version, label: 'Bajo editado' });
    expect(patchedOption.status).toBe(200);
    expect(patchedOption.body.data).toMatchObject({ id: optionId, factorId, label: 'Bajo editado' });
    const movedOption = await request(app).post(`${base}/factors/${factorId}/options/${optionId}/move`).set('Authorization', auth).send({ version: patchedOption.body.data.version, sortOrder: 4 });
    expect(movedOption.status).toBe(200);
    expect(movedOption.body.data).toMatchObject({ id: optionId, sortOrder: 4 });
    const deletedOption = await request(app).delete(`${base}/factors/${factorId}/options/${optionId}`).set('Authorization', auth).send({ version: movedOption.body.data.version });
    expect(deletedOption.status).toBe(200);
    expect(deletedOption.body.data).toEqual({ deleted: true, id: optionId });

    const category = await request(app).post(`${base}/food-categories`).set('Authorization', auth).send({ code: 'LACTEOS', name: 'Lácteos', sortOrder: 1 });
    expect(category.status).toBe(201);
    const categoryId = category.body.data.id;
    const subcategory = await request(app).post(`${base}/food-categories/${categoryId}/subcategories`).set('Authorization', auth).send({ name: 'Quesos frescos', microbiologicalRisk: 'HIGH', riskScore: 3, sortOrder: 1 });
    expect(subcategory.status).toBe(201);
    const subcategoryId = subcategory.body.data.id;

    const patchedSub = await request(app).patch(`${base}/food-categories/${categoryId}/subcategories/${subcategoryId}`).set('Authorization', auth).send({ version: subcategory.body.data.version, name: 'Quesos frescos editados' });
    expect(patchedSub.status).toBe(200);
    expect(patchedSub.body.data).toMatchObject({ id: subcategoryId, categoryId, name: 'Quesos frescos editados' });
    const deletedSub = await request(app).delete(`${base}/food-categories/${categoryId}/subcategories/${subcategoryId}`).set('Authorization', auth).send({ version: patchedSub.body.data.version });
    expect(deletedSub.status).toBe(200);
    expect(deletedSub.body.data).toEqual({ deleted: true, id: subcategoryId });

    // The parents are untouched and still editable with their own ids.
    const patchedFactor = await request(app).patch(`${base}/factors/${factorId}`).set('Authorization', auth).send({ version: factor.body.data.version, name: 'Volumen editado' });
    expect(patchedFactor.status).toBe(200);
    expect(patchedFactor.body.data).toMatchObject({ id: factorId, name: 'Volumen editado' });
    const patchedCategory = await request(app).patch(`${base}/food-categories/${categoryId}`).set('Authorization', auth).send({ version: category.body.data.version, name: 'Lácteos editados' });
    expect(patchedCategory.status).toBe(200);
    expect(patchedCategory.body.data).toMatchObject({ id: categoryId, name: 'Lácteos editados' });

    const preview = await request(app).get(`${base}/preview`).set('Authorization', auth);
    expect(preview.status).toBe(200);
    expect(preview.body.data.factors[0].options).toEqual([]);
    expect(preview.body.data.foodCategories[0].subcategories).toEqual([]);
  });
});
