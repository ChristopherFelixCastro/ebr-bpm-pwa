import { z } from 'zod';

export const idSchema = z.string().uuid();
const isoDate = z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value), 'Fecha ISO inválida.');
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
export const relationshipTypeSchema = z.enum(['LEGAL_REPRESENTATIVE', 'QUALITY_CONTACT', 'PRIMARY_CONTACT', 'OWNER', 'REPRESENTATIVE']);
export const contactInputSchema = z.object({ fullName: z.string().trim().min(1).max(200), identityDocument: nullableText(80), phone: nullableText(40), email: z.string().trim().email().max(320).nullable().optional() }).strict();
export const createContactSchema = contactInputSchema;
export const patchContactSchema = z.object({ version: z.number().int().positive(), fullName: z.string().trim().min(1).max(200).optional(), identityDocument: nullableText(80), phone: nullableText(40), email: z.string().trim().email().max(320).nullable().optional() }).strict().superRefine((value, ctx) => { if (Object.keys(value).length === 1) ctx.addIssue({ code: 'custom', message: 'Debe indicar un cambio.' }); });
export const listContactsSchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().min(1).max(100).optional() }).strict();
export const linkContactSchema = z.object({ contactId: idSchema.optional(), contact: contactInputSchema.optional(), relationshipType: relationshipTypeSchema, isPrimary: z.boolean(), effectiveFrom: isoDate }).strict().superRefine((value, ctx) => { if (Boolean(value.contactId) === Boolean(value.contact)) ctx.addIssue({ code: 'custom', message: 'Indique contactId o contact, pero no ambos.' }); });
export const endRelationSchema = z.object({ version: z.number().int().positive(), effectiveTo: isoDate }).strict();
export type ContactInput = z.infer<typeof contactInputSchema>;
export type PatchContactInput = z.infer<typeof patchContactSchema>;
export type LinkContactInput = z.infer<typeof linkContactSchema>;
