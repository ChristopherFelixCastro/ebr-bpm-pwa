import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { afterEach, expect, it } from 'vitest'
import { parseRiskPackage } from '../../modules/official-imports/risk-parser.js'
import type { RiskManifest } from '../../modules/official-imports/manifests.js'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))) })

it('uses only the first microbiological score and retains the original 2/4/8 scale', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ebr-risk-source-scale-'))
  directories.push(directory)
  const matrix = path.join(directory, 'matrix.xlsx')
  const rules = path.join(directory, 'rules.xlsx')
  const matrixBook = new ExcelJS.Workbook()
  const sheet = matrixBook.addWorksheet('Food')
  sheet.addRow(['CATEGORIA', 'SUBCATEGORIA', 'RIESGO MICROBIOLÓGICO', 'PUNTAJE', 'RIESGO QUÍMICO', 'PUNTAJE', 'RIESGO TOTAL'])
  sheet.addRow(['Bebidas', 'Agua envasada', 'BAJO', 2, 'ALTO', 8, 8])
  sheet.addRow(['Bebidas', 'Jugo refrigerado', 'MEDIO', 4, 'BAJO', 2, 4])
  sheet.addRow(['Bebidas', 'Otro producto', 'ALTO', 8, 'BAJO', 2, 8])
  sheet.addRow(['Bebidas', 'p', 'BAJO', 2, null, null, 2])
  await matrixBook.xlsx.writeFile(matrix)
  const rulesBook = new ExcelJS.Workbook()
  rulesBook.addWorksheet('Rules')
  await rulesBook.xlsx.writeFile(rules)
  const factorCodes = ['VOLUME', 'HACCP', 'BPM', 'INABIE', 'REJECTIONS', 'SAMPLING'] as const
  const manifest: RiskManifest = {
    schemaVersion: 1, importType: 'RISK',
    catalog: { code: 'FOOD', name: 'Food' }, riskRuleSet: { code: 'RISK', name: 'Risk' },
    matrix: { logicalName: 'foodMatrix', path: matrix, sheet: 'Food' },
    rules: { logicalName: 'riskRules', path: rules, sheet: 'Rules' },
    matrixScoreScale: 'SOURCE_2_4_8', factorOptionColumn: 'AO',
    factorOptionRanges: factorCodes.map((factorCode) => ({ factorCode, startRow: 1, endRow: 1 })),
    standaloneCategoryLeaves: [], additionalFactorOptions: [],
    excludedMatrixRows: [{ sourceRow: 5, expectedCategory: 'Bebidas', expectedSubcategory: 'p', expectedRisk: 'BAJO', expectedScore: 2 }],
  }
  const parsed = await parseRiskPackage(manifest)
  expect(parsed.functional.categories[0].subcategories.map((item: { riskScore: number; sourceMicrobiologicalScore: number }) => [item.riskScore, item.sourceMicrobiologicalScore])).toEqual([[1, 2], [2, 4], [3, 8]])
  expect(parsed.issues.some((issue) => issue.code === 'RISK_SCORE_MISMATCH')).toBe(false)
  expect(parsed.breakdown.foodMatrix).toMatchObject({ read: 4, accepted: 3, skipped: 1 })
  expect(parsed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'MATRIX_ROW_EXCLUDED', row: 5 })]))
})
