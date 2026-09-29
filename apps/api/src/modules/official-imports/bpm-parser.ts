import type ExcelJS from 'exceljs';
import { cellValue, loadSourceFile, loadWorkbook } from './files.js';
import {
  canonicalJson,
  emptyCounts,
  normalizeCode,
  normalizeText,
  sha256,
  type ImportBreakdown,
  type ImportIssue,
  type SourceFile,
} from './model.js';
import type { BpmManifest } from './manifests.js';

type Criticality = 'CRITICA' | 'MAYOR' | 'MENOR' | null;

export type BpmItemImport = {
  key: string;
  parentKey: string | null;
  itemKind: 'SECTION' | 'SUBSECTION' | 'GROUP' | 'CRITERION';
  sourceCode: string | null;
  displayCode: string | null;
  title: string;
  sortOrder: number;
  isEvaluable: boolean;
  criticality: Criticality;
  sourceReference: string;
  sourceRowNumber: number;
  sourceParentCodeRaw: string | null;
};

export type BpmGuidanceImport = {
  key: string;
  criterionKey: string;
  text: string;
  sortOrder: number;
  criticality: Criticality;
  sourceReference: string;
  sourceRowNumber: number;
};

type RawItem = {
  order: number;
  originalCode: string;
  canonicalCode: string;
  originalTitle: string;
  title: string;
  type: string;
  parent: string | null;
  row: number;
  key: string;
  kind: BpmItemImport['itemKind'];
  parentKey: string | null;
  displayCode: string;
};

type GuideInstruction = {
  row: number;
  endRow: number;
  column: number;
  text: string;
  criticality: Criticality;
  recordKey: string;
};

type GuideBlock = {
  row: number;
  title: string;
  topSection: string | null;
  instructions: GuideInstruction[];
};

const insertPattern = /INSERT\s+\[dbo\]\.\[AllItems\].*?VALUES\s*\((\d+),\s*N?'((?:''|[^'])*)',\s*N?'((?:''|[^'])*)',\s*N?'((?:''|[^'])*)',\s*(NULL|N?'((?:''|[^'])*)')\)/gi;
const kindMap: Record<string, BpmItemImport['itemKind']> = {
  C: 'SECTION', S: 'SUBSECTION', SS: 'SUBSECTION', A: 'GROUP', I: 'CRITERION',
};

const exactCriticality = (value: unknown): Criticality => {
  const raw = normalizeText(value);
  return raw === 'C' ? 'CRITICA' : raw === 'M' ? 'MAYOR' : raw === 'm' ? 'MENOR' : null;
};
const plain = (value: unknown) => normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const titleKey = (value: unknown) => plain(value).replace(/^\d+(?: \d+)*\s*/, '').trim();
const sectionOfCode = (value: string) => /^\d+/.exec(value)?.[0] ?? null;
const columnNumber = (letters: string) => [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
const address = (value: string) => {
  const match = /^([A-Z]+)(\d+)$/.exec(value)!;
  return { column: columnNumber(match[1]), row: Number(match[2]) };
};

function sourceCounts(keys: string[], issues: ImportIssue[], prefix: string) {
  const rejected = new Set(issues.filter((issue) => issue.severity === 'ERROR' && issue.recordKey?.startsWith(prefix)).map((issue) => issue.recordKey));
  const warned = new Set(issues.filter((issue) => issue.severity === 'WARNING' && issue.recordKey?.startsWith(prefix)).map((issue) => issue.recordKey));
  return { ...emptyCounts(), read: keys.length, accepted: keys.filter((key) => !rejected.has(key)).length, rejected: rejected.size, warned: warned.size };
}

function guideBlocks(sheet: ExcelJS.Worksheet, fileName: string, issues: ImportIssue[]) {
  const mergeByMaster = new Map<string, { startRow: number; endRow: number; startColumn: number; endColumn: number }>();
  for (const range of sheet.model.merges ?? []) {
    const [start, end] = range.split(':').map(address);
    mergeByMaster.set(sheet.getCell(start.row, start.column).address, { startRow: start.row, endRow: end.row, startColumn: start.column, endColumn: end.column });
  }

  const headers: Array<{ row: number; observationColumn: number; title: string; topSection: string | null }> = [];
  let topSection: string | null = null;
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= Math.min(15, sheet.columnCount); column += 1) {
      const section = /^(\d+)\.\s/.exec(normalizeText(cellValue(row.getCell(column))));
      if (section) topSection = section[1];
    }
    let observationColumn: number | null = null;
    let hasPoints = false;
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      const cell = row.getCell(column);
      if (cell.isMerged && cell.master.address !== cell.address) continue;
      const value = plain(cellValue(cell));
      if (value === 'OBSERVACIONES') observationColumn = column;
      if (value === 'PUNTOS') hasPoints = true;
    }
    if (observationColumn && hasPoints) {
      const titles: string[] = [];
      for (let column = 1; column < observationColumn; column += 1) {
        const cell = row.getCell(column);
        if (cell.isMerged && cell.master.address !== cell.address) continue;
        const value = normalizeText(cellValue(cell));
        if (value && !exactCriticality(value)) titles.push(value);
      }
      headers.push({ row: rowNumber, observationColumn, title: titles.join(' | '), topSection });
    }
  }

  const blocks: GuideBlock[] = [];
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const end = (headers[index + 1]?.row ?? sheet.rowCount + 1) - 1;
    const instructions: GuideInstruction[] = [];
    for (let rowNumber = header.row + 1; rowNumber <= end; rowNumber += 1) {
      for (let column = 1; column < header.observationColumn; column += 1) {
        const cell = sheet.getCell(rowNumber, column);
        if (cell.isMerged && cell.master.address !== cell.address) continue;
        const original = normalizeText(cellValue(cell));
        if (!/^[ivxlcdm]+(?:[.,)]|\s)\s*/i.test(original)) continue;
        const span = mergeByMaster.get(cell.address) ?? { startRow: rowNumber, endRow: rowNumber, startColumn: column, endColumn: column };
        const marks = new Map<string, NonNullable<Criticality>>();
        for (let markRow = span.startRow; markRow <= span.endRow; markRow += 1) {
          for (let markColumn = 1; markColumn < span.startColumn; markColumn += 1) {
            const markCell = sheet.getCell(markRow, markColumn);
            const master = markCell.isMerged ? markCell.master : markCell;
            const value = exactCriticality(cellValue(master));
            if (value) marks.set(master.address, value);
          }
        }
        const criticalities = new Set(marks.values());
        const recordKey = `bpmGuidance:${sheet.name}:${rowNumber}:${column}`;
        let criticality: Criticality = null;
        if (criticalities.size === 1) criticality = [...criticalities][0];
        if (criticalities.size > 1) {
          issues.push({ severity: 'ERROR', code: 'CONTRADICTORY_GUIDANCE_CRITICALITY', message: 'La instrucción contiene criticidades C/M/m contradictorias en su rango.', file: fileName, sheet: sheet.name, row: rowNumber, field: 'criticality', recordKey });
        }
        instructions.push({ row: rowNumber, endRow: span.endRow, column, text: original, criticality, recordKey });
      }
    }
    blocks.push({ row: header.row, title: header.title, topSection: header.topSection, instructions });
  }
  return blocks;
}

export async function parseBpmPackage(manifest: BpmManifest) {
  const issues: ImportIssue[] = [];
  const files: SourceFile[] = [];
  const transformations = [
    'NFKC, espacios consecutivos y textos vacíos normalizados.',
    'AllItems C → SECTION; S/SS → SUBSECTION; A → GROUP; I → CRITERION evaluable.',
    'Las líneas atómicas de la Guía de Llenado se importan como instrucciones auxiliares del CRITERION asociado.',
    'Criticidad auxiliar sensible a mayúsculas: C → CRITICA, M → MAYOR, m → MENOR; la ausencia es válida.',
  ];

  const allItemsLoaded = await loadSourceFile(manifest.allItems.logicalName, manifest.allItems.path);
  files.push(allItemsLoaded.source);
  const sourceText = allItemsLoaded.bytes.toString('utf8');
  const workbooks = new Map<string, { source: SourceFile; workbook: ExcelJS.Workbook }>();
  for (const source of manifest.workbooks) {
    const loaded = await loadSourceFile(source.logicalName, source.path);
    files.push(loaded.source);
    workbooks.set(source.logicalName, { source: loaded.source, workbook: await loadWorkbook(loaded.bytes) });
  }

  const rawInput: Array<{ order: number; code: string; title: string; type: string; parent: string | null; row: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = insertPattern.exec(sourceText))) {
    rawInput.push({ order: Number(match[1]), code: match[2].replaceAll("''", "'"), title: match[3].replaceAll("''", "'"), type: normalizeCode(match[4]), parent: match[5].toUpperCase() === 'NULL' ? null : (match[6] ?? '').replaceAll("''", "'"), row: sourceText.slice(0, match.index).split(/\r?\n/).length });
  }
  if (!rawInput.length) issues.push({ severity: 'ERROR', code: 'ALLITEMS_EMPTY', message: 'No se encontraron INSERT válidos de AllItems.', file: allItemsLoaded.source.fileName });

  const overrideByOrder = new Map(manifest.allItemsOverrides.map((item) => [item.itemOrder, item]));
  const seenOverrides = new Set<number>();
  const prepared = rawInput.sort((a, b) => a.order - b.order).map((source) => {
    let canonicalCode = normalizeText(source.code);
    let title = normalizeText(source.title);
    const override = overrideByOrder.get(source.order);
    const recordKey = `allItems:${source.order}`;
    if (override) {
      seenOverrides.add(source.order);
      if (normalizeText(source.code) !== normalizeText(override.expectedSourceCode) || normalizeText(source.title) !== normalizeText(override.expectedDescription)) {
        issues.push({ severity: 'ERROR', code: 'STALE_ALLITEMS_OVERRIDE', message: 'El override no coincide con el código y la descripción actuales de AllItems.', file: allItemsLoaded.source.fileName, row: source.row, field: 'allItemsOverrides', recordKey });
      } else {
        canonicalCode = normalizeText(override.canonicalCode);
        title = normalizeText(override.canonicalDescription);
        transformations.push(`Override AllItems Items=${source.order}: ${source.code} → ${canonicalCode}; descripción canónica verificada.`);
      }
    }
    return { ...source, canonicalCode, title, recordKey };
  });
  for (const override of manifest.allItemsOverrides) {
    if (!seenOverrides.has(override.itemOrder)) issues.push({ severity: 'ERROR', code: 'ALLITEMS_OVERRIDE_TARGET_MISSING', message: `No existe Items=${override.itemOrder} para aplicar el override.`, file: allItemsLoaded.source.fileName, field: 'allItemsOverrides', recordKey: `allItems:${override.itemOrder}` });
  }

  const occurrence = new Map<string, number>();
  const firstByCanonical = new Map<string, string>();
  const sibling = new Map<string, number>();
  const raw: RawItem[] = [];
  for (const source of prepared) {
    const kind = kindMap[source.type];
    if (!kind) {
      issues.push({ severity: 'ERROR', code: 'UNKNOWN_ITEM_TYPE', message: 'SectionType no reconocido.', file: allItemsLoaded.source.fileName, row: source.row, field: 'SectionType', recordKey: source.recordKey });
      continue;
    }
    const count = (occurrence.get(source.canonicalCode) ?? 0) + 1;
    occurrence.set(source.canonicalCode, count);
    const key = `all:${source.order}`;
    const displayCode = `${source.canonicalCode}${count > 1 ? `-${String(count).padStart(2, '0')}` : ''}`;
    if (!firstByCanonical.has(source.canonicalCode)) firstByCanonical.set(source.canonicalCode, key);
    const parentKey = source.parent ? firstByCanonical.get(normalizeText(source.parent)) ?? null : null;
    if (source.parent && !parentKey) issues.push({ severity: 'ERROR', code: 'UNKNOWN_PARENT', message: 'El padre de AllItems no existe antes del elemento después de aplicar overrides.', file: allItemsLoaded.source.fileName, row: source.row, field: 'Parents', recordKey: source.recordKey });
    raw.push({ order: source.order, originalCode: normalizeText(source.code), canonicalCode: source.canonicalCode, originalTitle: normalizeText(source.title), title: source.title, type: source.type, parent: source.parent, row: source.row, key, kind, parentKey, displayCode });
  }

  const items: BpmItemImport[] = [];
  for (const source of raw) {
    const parentToken = source.parentKey ?? 'root';
    const sortOrder = (sibling.get(parentToken) ?? 0) + 1;
    sibling.set(parentToken, sortOrder);
    items.push({ key: source.key, parentKey: source.parentKey, itemKind: source.kind, sourceCode: source.originalCode || null, displayCode: source.displayCode || null, title: source.title, sortOrder, isEvaluable: source.kind === 'CRITERION', criticality: null, sourceReference: `${allItemsLoaded.source.logicalName}:${allItemsLoaded.source.fileName}:Items=${source.order}:canonical=${source.canonicalCode}`, sourceRowNumber: source.row, sourceParentCodeRaw: source.parent });
  }

  const guideEntry = workbooks.get(manifest.guide.logicalName);
  if (!guideEntry) throw new Error('GUIDE_WORKBOOK_NOT_DECLARED');
  const guideSheet = guideEntry.workbook.getWorksheet(manifest.guide.sheet);
  if (!guideSheet) throw new Error('GUIDE_SHEET_NOT_FOUND');
  const blocks = guideBlocks(guideSheet, guideEntry.source.fileName, issues);
  const criteria = raw.filter((item) => item.type === 'I');
  const assigned = new Set<string>();
  const childrenByParent = new Map<string, RawItem[]>();
  for (const criterion of criteria) {
    const list = childrenByParent.get(criterion.parentKey ?? '') ?? [];
    list.push(criterion);
    childrenByParent.set(criterion.parentKey ?? '', list);
  }

  const guidanceItems: BpmGuidanceImport[] = [];
  const guidanceKeys = blocks.flatMap((block) => block.instructions.map((instruction) => instruction.recordKey));
  const rejectBlock = (block: GuideBlock, code: string, message: string) => {
    for (const instruction of block.instructions) issues.push({ severity: 'ERROR', code, message, file: guideEntry.source.fileName, sheet: guideSheet.name, row: instruction.row, field: 'criterion', recordKey: instruction.recordKey });
  };

  for (const block of blocks) {
    const sectionCandidates = criteria.filter((criterion) => !assigned.has(criterion.key) && (!block.topSection || sectionOfCode(criterion.canonicalCode) === block.topSection));
    const exact = sectionCandidates.filter((criterion) => titleKey(criterion.title) === titleKey(block.title));
    let selected: RawItem[] = [];
    if (exact.length > 1) {
      rejectBlock(block, 'AMBIGUOUS_GUIDE_ASSOCIATION', `El encabezado de Guía fila ${block.row} coincide con varios criterios AllItems: ${exact.map((item) => `Items=${item.order}`).join(', ')}.`);
      continue;
    }
    if (exact.length === 1) selected = exact;
    else {
      const code = /^(\d+(?:\.\d+)*)\.?\s/.exec(normalizeText(block.title))?.[1];
      const header = code ? raw.find((item) => item.canonicalCode === code && item.type !== 'I') : undefined;
      const direct = header ? (childrenByParent.get(header.key) ?? []).filter((item) => !assigned.has(item.key)) : [];
      if (direct.length) selected = direct;
      else if (sectionCandidates[0]) selected = [sectionCandidates[0]];
    }
    if (!selected.length) {
      rejectBlock(block, 'GUIDE_CRITERION_UNMATCHED', 'No existe un criterio AllItems único y comprobable para el encabezado de Guía.');
      continue;
    }
    if (selected.length > 1 && block.instructions.length !== selected.length) {
      rejectBlock(block, 'AMBIGUOUS_GUIDE_ASSOCIATION', `El encabezado agrupa ${selected.length} criterios AllItems (${selected.map((item) => `Items=${item.order}`).join(', ')}), pero contiene ${block.instructions.length} instrucciones; no se puede asociar por posición.`);
      continue;
    }
    for (const criterion of selected) assigned.add(criterion.key);
    if (!block.instructions.length) {
      for (const criterion of selected) issues.push({ severity: 'ERROR', code: 'CRITERION_WITHOUT_GUIDANCE', message: 'El criterio AllItems no contiene instrucciones asociadas en la Guía.', file: guideEntry.source.fileName, sheet: guideSheet.name, row: block.row, field: 'criterion', recordKey: `allItems:${criterion.order}` });
      continue;
    }
    for (let index = 0; index < block.instructions.length; index += 1) {
      const instruction = block.instructions[index];
      const criterion = selected.length === 1 ? selected[0] : selected[index];
      const sortOrder = guidanceItems.filter((item) => item.criterionKey === criterion.key).length;
      guidanceItems.push({ key: instruction.recordKey, criterionKey: criterion.key, text: instruction.text, sortOrder, criticality: instruction.criticality, sourceReference: `${manifest.guide.logicalName}:${guideEntry.source.fileName}:${guideSheet.name}:criterionItems=${criterion.order}:criterionCode=${criterion.canonicalCode}`, sourceRowNumber: instruction.row });
    }
  }

  for (const criterion of criteria.filter((item) => !assigned.has(item.key))) {
    issues.push({ severity: 'ERROR', code: 'CRITERION_WITHOUT_GUIDE_ASSOCIATION', message: 'El criterio AllItems no quedó asociado a un bloque único de la Guía.', file: allItemsLoaded.source.fileName, row: criterion.row, field: 'Decription', recordKey: `allItems:${criterion.order}` });
  }

  const allKeys = rawInput.map((item) => `allItems:${item.order}`);
  const breakdown: ImportBreakdown = { allItems: sourceCounts(allKeys, issues, 'allItems:'), bpmGuidance: sourceCounts(guidanceKeys, issues, 'bpmGuidance:') };
  const functional = { template: { code: normalizeCode(manifest.template.code), name: normalizeText(manifest.template.name), description: normalizeText(manifest.template.description) || null }, items, guidanceItems };
  const fileBundle = files.map((file) => ({ logicalName: file.logicalName, sha256: file.sha256 })).sort((a, b) => a.logicalName.localeCompare(b.logicalName));
  const summary = {
    sections: items.filter((item) => item.itemKind === 'SECTION').length,
    subsections: items.filter((item) => item.itemKind === 'SUBSECTION').length,
    groups: items.filter((item) => item.itemKind === 'GROUP').length,
    criteria: items.filter((item) => item.itemKind === 'CRITERION').length,
    guidanceItems: guidanceItems.length,
    guidanceWithCriticality: guidanceItems.filter((item) => item.criticality !== null).length,
    guidanceWithoutCriticality: guidanceItems.filter((item) => item.criticality === null).length,
  };
  return { functional, files, issues, breakdown, summary, packageHash: sha256(canonicalJson(fileBundle)), functionalHash: sha256(canonicalJson(functional)), transformations };
}
