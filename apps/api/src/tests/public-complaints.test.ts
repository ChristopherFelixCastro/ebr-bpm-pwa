import { describe, expect, it } from 'vitest';
import { publicCreateSchema } from '../modules/complaints/schemas.js';

describe('public complaint input', () => {
  it('accepts an anonymous report without account or organization identifiers', () => {
    expect(publicCreateSchema.safeParse({ complaintType: 'Condiciones del establecimiento', description: 'Situación observada en un establecimiento.' }).success).toBe(true);
  });

  it('accepts voluntary contact only with a usable preferred method', () => {
    expect(publicCreateSchema.safeParse({ complaintType: 'Agua', description: 'Situación observada.', complainantData: { preferredContactMethod: 'EMAIL', email: 'prueba@example.test' } }).success).toBe(true);
    expect(publicCreateSchema.safeParse({ complaintType: 'Agua', description: 'Situación observada.', complainantData: { preferredContactMethod: 'PHONE' } }).success).toBe(false);
  });

  it('rejects client supplied timestamps, organization IDs and empty details', () => {
    expect(publicCreateSchema.safeParse({ complaintType: 'Agua', description: 'Situación observada.', receivedAt: new Date().toISOString() }).success).toBe(false);
    expect(publicCreateSchema.safeParse({ complaintType: 'Agua', description: 'Situación observada.', companyId: '00000000-0000-0000-0000-000000000000' }).success).toBe(false);
    expect(publicCreateSchema.safeParse({ complaintType: 'Agua', description: ' ' }).success).toBe(false);
  });
});
