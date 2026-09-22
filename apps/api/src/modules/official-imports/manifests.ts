import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { canonicalJson, sha256 } from './model.js';

const target = z.object({ code: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(200), description: z.string().trim().max(1000).optional() }).strict();
const source = z.object({ logicalName: z.string().trim().min(1).max(100), path: z.string().trim().min(1), sheet: z.string().trim().min(1).optional() }).strict();
export const bpmManifestSchema = z.object({
  schemaVersion: z.literal(1), importType: z.literal('BPM'), template: target,
  allItems: source,
  workbooks: z.array(source).min(1),
  guide: z.object({ logicalName: z.string().trim().min(1), sheet: z.string().trim().min(1) }).strict(),
  allItemsOverrides: z.array(z.object({ itemOrder:z.number().int().positive(), expectedSourceCode:z.string().trim().min(1), canonicalCode:z.string().trim().min(1), expectedDescription:z.string().trim().min(1), canonicalDescription:z.string().trim().min(1) }).strict()).default([]),
}).strict();
const range = z.object({ factorCode: z.enum(['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING']), startRow: z.number().int().positive(), endRow: z.number().int().positive() }).strict().refine((value) => value.endRow >= value.startRow);
export const riskManifestSchema = z.object({
  schemaVersion: z.literal(1), importType: z.literal('RISK'),
  catalog: target.omit({ description: true }), riskRuleSet: target.omit({ description: true }),
  matrix: source, rules: source,
  factorOptionColumn: z.string().regex(/^[A-Z]{1,3}$/).default('AO'),
  factorOptionRanges: z.array(range).length(6),
  standaloneCategoryLeaves: z.array(z.object({ sourceRow:z.number().int().positive(), expectedCategory:z.string().trim().min(1), subcategory:z.string().trim().min(1), expectedRisk:z.enum(['BAJO','MEDIO','ALTO','NA']), expectedScore:z.number().nullable() }).strict()).default([]),
  additionalFactorOptions: z.array(z.object({ factorCode:z.enum(['VOLUME','HACCP','BPM','INABIE','REJECTIONS','SAMPLING']), label:z.string().trim().min(1), score:z.union([z.literal(1),z.literal(1.67),z.literal(2.33),z.literal(3)]), code:z.enum(['LOW','MEDIUM_LOW','MEDIUM_HIGH','HIGH']) }).strict()).default([]),
}).strict();
export type BpmManifest = z.infer<typeof bpmManifestSchema>;
export type RiskManifest = z.infer<typeof riskManifestSchema>;

export async function readManifest<T>(filePath: string, schema: z.ZodType<T>) {
  const raw = JSON.parse(await readFile(filePath, 'utf8'));
  const parsed = schema.parse(raw);
  const base = path.dirname(path.resolve(filePath));
  const resolved: any = structuredClone(parsed);
  const resolveSource = (item: { path: string }) => { item.path = path.resolve(base, item.path); };
  if (resolved.allItems) resolveSource(resolved.allItems);
  for (const item of resolved.workbooks ?? []) resolveSource(item);
  if (resolved.matrix) resolveSource(resolved.matrix);
  if (resolved.rules) resolveSource(resolved.rules);
  const portable = structuredClone(parsed) as any;
  const cleanSource = (item: { path: string }) => { item.path = path.basename(item.path); };
  if (portable.allItems) cleanSource(portable.allItems);
  for (const item of portable.workbooks ?? []) cleanSource(item);
  if (portable.matrix) cleanSource(portable.matrix);
  if (portable.rules) cleanSource(portable.rules);
  return { manifest: resolved as T, manifestHash: sha256(canonicalJson(portable)) };
}
