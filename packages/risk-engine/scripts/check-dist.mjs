import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const rule = read('../rules/regla-inicial.v1.json');
const expected = read('../test/fixtures/resultado-referencia.json');

const items = [];
for (const [answer, count] of [['C', 34], ['IT', 6], ['NA', 5]]) {
  for (let i = 0; i < count; i += 1) {
    items.push({ itemId: `item-${items.length + 1}`, code: `1.${items.length + 1}`, answer });
  }
}
const subcategory = (id, level, category = 'Lácteos') => ({
  subcategoryId: id,
  subcategoryName: `Subcategoría ${id}`,
  categoryName: category,
  microbiologicalRisk: level,
  score: level === null ? null : { BAJO: '1', MEDIO: '2', ALTO: '3' }[level],
});
const snapshot = {
  inspectionId: 'insp-001',
  ruleVersionId: 'regla-riesgo-v1',
  bpm: { templateVersionId: 'bpm-plantilla-v1', items },
  products: {
    catalogVersionId: 'catalogo-v1',
    subcategories: [subcategory('leche', 'ALTO'), subcategory('pan', 'BAJO', 'Panadería'), subcategory('pure', null, 'Frutas')],
  },
  factorAnswers: {
    VOLUMEN_PRODUCCION: { value: '150000' },
    HACCP: { option: 'NO_IMPLEMENTADO' },
    PROVEEDOR_INABIE: { option: 'REGIONAL' },
    RECHAZOS_SANITARIOS: { value: 1 },
    PLAN_MUESTREO: { option: 'MATERIAS_PRIMAS' },
  },
};

const fromEsm = await import('@ebr-bpm/risk-engine');
const fromCjs = createRequire(import.meta.url)('@ebr-bpm/risk-engine');
const pkg = createRequire(import.meta.url)('@ebr-bpm/risk-engine/package.json');

for (const [kind, engine] of [['ESM', fromEsm], ['CommonJS', fromCjs]]) {
  const result = engine.calculateInspectionRisk(snapshot, rule);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), expected, `${kind}: el resultado no coincide con el fixture`);
  assert.equal(engine.ENGINE_VERSION, pkg.version, `${kind}: ENGINE_VERSION distinta de package.json`);
}
console.log(`dist OK: ESM y CommonJS dan RT ${expected.totalRisk.value} (${expected.riskLevel}, ${expected.frequency})`);
