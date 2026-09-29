import { createHash } from 'node:crypto';

export type ImportMode = 'DRY_RUN' | 'APPLY';
export type ImportType = 'BPM' | 'RISK';
export type ImportIssue = {
  severity: 'WARNING' | 'ERROR';
  code: string;
  message: string;
  file?: string;
  sheet?: string;
  row?: number;
  column?: string;
  field?: string;
  recordKey?: string;
};
export type SourceFile = { logicalName: string; path: string; fileName: string; sha256: string; sheetNames: string[] };
export type ImportCounts = { read: number; accepted: number; skipped: number; warned: number; rejected: number };
export type ImportBreakdown = Record<string, ImportCounts>;
export type ImportReport = {
  type: ImportType;
  mode: ImportMode;
  status: 'SUCCEEDED' | 'FAILED' | 'REJECTED' | 'SKIPPED';
  packageHash: string;
  functionalHash: string;
  files: Array<{ logicalName: string; fileName: string; sha256: string; sheets: string[] }>;
  counts: ImportCounts;
  breakdown: ImportBreakdown;
  issueCounts: { errors: number; warnings: number };
  summary: Record<string, number>;
  warnings: ImportIssue[];
  errors: ImportIssue[];
  transformations: string[];
  createdVersions: { bpmTemplateVersionId?: string; catalogVersionId?: string; riskRuleVersionId?: string };
  versionsRemainDraft: true;
  importRunId?: string;
};

export const normalizeText = (value: unknown) => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
export const normalizeCode = (value: unknown) => normalizeText(value).toUpperCase();
export const normalizeNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(8)) : null;
  const text = normalizeText(value).replace(',', '.');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(8)) : null;
};
export const slugCode = (value: unknown, fallback: string) => {
  const code = normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return (code || fallback).slice(0, 120);
};

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
  return value;
};
export const canonicalJson = (value: unknown) => JSON.stringify(sortValue(value));
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const emptyCounts = (): ImportCounts => ({ read: 0, accepted: 0, skipped: 0, warned: 0, rejected: 0 });
export const aggregateBreakdown = (breakdown: ImportBreakdown): ImportCounts => Object.values(breakdown).reduce((total, item) => ({ read: total.read + item.read, accepted: total.accepted + item.accepted, skipped: total.skipped + item.skipped, warned: total.warned + item.warned, rejected: total.rejected + item.rejected }), emptyCounts());

export class ImportValidationError extends Error {
  constructor(public readonly issues: ImportIssue[]) { super('La importación contiene errores de validación.'); }
}
