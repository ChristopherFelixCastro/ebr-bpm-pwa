import { z } from 'zod';

export const uuid = z.string().uuid();
export const empty = z.object({}).strict();
export const returnReview = z.object({
  reason: z.string().trim().min(1).max(1000),
  bpmItemIds: z.array(uuid).min(1).max(200),
}).strict().superRefine((value, context) => {
  if (new Set(value.bpmItemIds).size !== value.bpmItemIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['bpmItemIds'], message: 'No se permiten criterios repetidos.' });
});
export const correction = z.object({
  baseVersion: z.number().int().positive(),
  responseValue: z.enum(['C', 'CP', 'IT', 'NA']),
  observations: z.string().trim().max(2000).nullable().optional(),
}).strict();
export const deleteCorrection = z.object({ baseVersion: z.number().int().positive() }).strict();
export const approve = z.object({ note: z.string().trim().max(1000).optional() }).strict();
export const generate = z.object({ operationId: uuid }).strict();
export const close = z.object({ reason: z.string().trim().max(500).optional() }).strict();
