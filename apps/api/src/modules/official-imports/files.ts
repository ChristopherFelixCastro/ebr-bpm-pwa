import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { normalizeText, sha256, type SourceFile } from './model.js';

export async function loadSourceFile(logicalName: string, filePath: string): Promise<{ source: SourceFile; bytes: Buffer }> {
  const bytes = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const sheetNames: string[] = [];
  if (extension === '.xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    workbook.eachSheet((sheet) => sheetNames.push(sheet.name));
  }
  return { source: { logicalName: normalizeText(logicalName), path: filePath, fileName: path.basename(filePath), sha256: sha256(bytes), sheetNames }, bytes };
}

export async function loadWorkbook(bytes: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  return workbook;
}

export function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value as any;
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if ('richText' in value) return value.richText.map((item: { text: string }) => item.text).join('');
  }
  return value;
}

export function findHeaderRow(sheet: ExcelJS.Worksheet, required: string[], maxRows = 100) {
  const wanted = required.map((item) => normalizeText(item).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, maxRows); rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const found = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      const key = normalizeText(cellValue(cell)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (key && !found.has(key)) found.set(key, column);
    });
    if (wanted.every((item) => found.has(item))) return { rowNumber, columns: found };
  }
  return null;
}
