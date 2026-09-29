import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../core/auth/jwt.js';
import { query } from '../../db/client.js';
import * as bpm from '../../modules/bpm-template-administration/service.js';
import type { Actor } from '../../modules/versioned-definitions/common.js';
import { openApiDocument } from '../../openapi.js';

const correlationId = '123e4567-e89b-42d3-a456-426614174000';
let adminId: string;
const actor = (age = 0): Actor => ({ userId: adminId, role: 'ADMIN', authTime: Math.floor(Date.now() / 1000) - age });
const authorization = async (age = 0) => `Bearer ${await signAccessToken(adminId, 'ADMIN', Math.floor(Date.now() / 1000) - age)}`;
const code = () => `BPM_GUIDANCE_${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
const flatten = (items: any[]): any[] => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

beforeAll(async () => {
  env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-bytes';
  adminId = (await query<{ id: string }>(`INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'BPM Guidance Admin',$1,'hash','APPROVED' FROM roles WHERE code='ADMIN' RETURNING id`, [`bpm.guidance.${randomUUID()}@example.test`])).rows[0].id;
});

describe('BPM guidance administration', () => {
  it('supports the final hierarchy, nullable criterion criticality, immutable publication and deep guidance cloning', async () => {
    const admin = actor();
    const template = await bpm.create({ code: code(), name: 'Guidance template', description: null }, admin, correlationId);
    const version = await bpm.createVersion(template.id, undefined, admin, correlationId);
    const section = await bpm.createItem(template.id, version.id, { parentId: null, itemKind: 'SECTION', title: 'Section', sortOrder: 1, isEvaluable: false, defaultCriticality: null }, admin, correlationId);
    const subsection = await bpm.createItem(template.id, version.id, { parentId: section.id, itemKind: 'SUBSECTION', title: 'Subsection', sortOrder: 1, isEvaluable: false, defaultCriticality: null }, admin, correlationId);
    const nested = await bpm.createItem(template.id, version.id, { parentId: subsection.id, itemKind: 'SUBSECTION', title: 'Nested subsection', sortOrder: 1, isEvaluable: false, defaultCriticality: null }, admin, correlationId);
    const group = await bpm.createItem(template.id, version.id, { parentId: nested.id, itemKind: 'GROUP', title: 'Group', sortOrder: 1, isEvaluable: false, defaultCriticality: null }, admin, correlationId);
    const criterion = await bpm.createItem(template.id, version.id, { parentId: group.id, itemKind: 'CRITERION', title: 'Question', sortOrder: 1, isEvaluable: true, defaultCriticality: null }, admin, correlationId);
    const critical = await bpm.createGuidance(template.id, version.id, criterion.id, { text: 'Critical guidance', sortOrder: 0, criticality: 'CRITICA', sourceReference: 'fixture:Guide', sourceRowNumber: 10 }, admin, correlationId);
    const nullable = await bpm.createGuidance(template.id, version.id, criterion.id, { text: 'Guidance without criticality', sortOrder: 1, criticality: null, sourceReference: 'fixture:Guide', sourceRowNumber: 11 }, admin, correlationId);

    expect((await bpm.validate(template.id, version.id, admin)).valid).toBe(true);
    const detail = await bpm.versionDetail(template.id, version.id, admin);
    const detailedCriterion = flatten(detail.items).find((item) => item.id === criterion.id);
    expect(detailedCriterion.defaultCriticality).toBeNull();
    expect(detailedCriterion.guidanceItems.map((item: any) => item.criticality)).toEqual(['CRITICA', null]);

    const published = await bpm.publish(template.id, version.id, { version: version.version, effectiveFrom: new Date(Date.now() - 1000).toISOString() }, admin, correlationId);
    await expect(bpm.patchGuidance(template.id, published.id, criterion.id, critical.id, { version: critical.version, text: 'Forbidden' }, admin, correlationId)).rejects.toMatchObject({ code: 'CONFLICT' });

    const clone = await bpm.createVersion(template.id, published.id, admin, correlationId);
    const cloneDetail = await bpm.versionDetail(template.id, clone.id, admin);
    const clonedCriterion = flatten(cloneDetail.items).find((item) => item.itemKind === 'CRITERION');
    expect(clonedCriterion.id).not.toBe(criterion.id);
    expect(clonedCriterion.guidanceItems).toHaveLength(2);
    expect(clonedCriterion.guidanceItems.map((item: any) => item.id)).not.toContain(critical.id);
    expect(clonedCriterion.guidanceItems.every((item: any) => item.criterionItemId === clonedCriterion.id)).toBe(true);
    expect([critical.id, nullable.id]).toHaveLength(2);
  });

  it('exposes audited CRUD with recent reauthentication and documents guidance plus inspection contracts', async () => {
    const admin = actor();
    const template = await bpm.create({ code: code(), name: 'HTTP guidance template', description: null }, admin, correlationId);
    const version = await bpm.createVersion(template.id, undefined, admin, correlationId);
    const section = await bpm.createItem(template.id, version.id, { parentId: null, itemKind: 'SECTION', title: 'Section', sortOrder: 1, isEvaluable: false, defaultCriticality: null }, admin, correlationId);
    const criterion = await bpm.createItem(template.id, version.id, { parentId: section.id, itemKind: 'CRITERION', title: 'Question', sortOrder: 1, isEvaluable: true, defaultCriticality: null }, admin, correlationId);
    const base = `/v1/admin/bpm-templates/${template.id}/versions/${version.id}/items/${criterion.id}/guidance`;

    const stale = await request(app).post(base).set('Authorization', await authorization((env.JWT_REAUTH_MAX_AGE_MINUTES + 1) * 60)).send({ text: 'Stale', sortOrder: 0 });
    expect(stale.status).toBe(401);

    let response = await request(app).post(base).set('Authorization', await authorization()).send({ text: 'HTTP guidance', sortOrder: 0, criticality: null, sourceReference: 'fixture:Guide', sourceRowNumber: 20 });
    expect(response.status).toBe(201);
    const guidance = response.body.data;
    response = await request(app).get(base).set('Authorization', await authorization());
    expect(response.body.data).toEqual([expect.objectContaining({ id: guidance.id, criticality: null })]);
    response = await request(app).patch(`${base}/${guidance.id}`).set('Authorization', await authorization()).send({ version: guidance.version, text: 'HTTP guidance updated', criticality: 'MENOR' });
    expect(response.body.data).toMatchObject({ text: 'HTTP guidance updated', criticality: 'MENOR', version: 2 });
    response = await request(app).delete(`${base}/${guidance.id}`).set('Authorization', await authorization()).send({ version: 2 });
    expect(response.body.data).toEqual({ deleted: true, id: guidance.id });

    const audits = (await query<any>(`SELECT action,metadata FROM audit_events WHERE entity_id=$1 ORDER BY occurred_at`, [guidance.id])).rows;
    expect(audits.map((event) => event.action)).toEqual(['BPM_GUIDANCE_CREATED', 'BPM_GUIDANCE_UPDATED', 'BPM_GUIDANCE_DELETED']);
    for (const event of audits) {
      expect(Object.keys(event.metadata).sort()).toEqual(['criterionItemId', 'guidanceItemId', 'templateId', 'versionId'].sort());
      expect(JSON.stringify(event.metadata)).not.toContain('HTTP guidance');
    }

    const paths: any = openApiDocument.paths;
    expect(paths['/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}/guidance']).toBeTruthy();
    expect(paths['/v1/admin/bpm-templates/{templateId}/versions/{versionId}/items/{itemId}/guidance/{guidanceId}']).toBeTruthy();
    expect((openApiDocument as any).components.schemas.BpmTemplateItem.properties.guidanceItems.items.$ref).toBe('#/components/schemas/BpmGuidanceItem');
    expect(paths['/v1/inspections/{id}/work-package'].get.responses['200'].content['application/json'].schema.properties.data.$ref).toBe('#/components/schemas/InspectionWorkPackage');
  });
});
