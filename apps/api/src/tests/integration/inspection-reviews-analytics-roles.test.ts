import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('../../db/client.js', () => mocks);

import * as service from '../../modules/inspection-reviews/service.js';

const id = '11111111-1111-4111-8111-111111111111';
const actor = (role: service.Actor['role']): service.Actor => ({ userId: id, role, authTime: Math.floor(Date.now() / 1000) });

describe('analytics operation roles at the Core boundary', () => {
  it('keeps ADMIN read-only before any database or Storage mutation', async () => {
    const admin = actor('ADMIN');
    await expect(service.openReview(id, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.returnReview(id, id, { reason: 'corregir', bpmItemIds: [id] }, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.approveReview(id, id, undefined, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.generateReport(id, id, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.officialize(id, id, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.closeInspection(id, id, undefined, admin, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });
});
