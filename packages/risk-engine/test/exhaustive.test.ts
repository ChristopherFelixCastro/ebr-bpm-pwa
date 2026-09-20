import { describe, expect, it } from 'vitest';
import {
  calculateInspectionRisk,
  Decimal,
  type BpmItemSnapshot,
  type FoodSubcategorySnapshot,
  type InspectionSnapshot,
  type RiskRuleVersion,
} from '../src/index.js';
import { bpmItems, ruleV1, subcategory } from './helpers.js';

const VOLUME = ['100000', '500000', '1000000', '3000000'];
const HACCP = ['TODAS_LAS_LINEAS', 'LINEAS_75', 'LINEAS_25', 'NO_IMPLEMENTADO'];
const BPM: BpmItemSnapshot[][] = [
  bpmItems({ C: 45 }),
  bpmItems({ C: 3, IT: 1 }),
  bpmItems({ C: 13, IT: 7 }),
  bpmItems({ C: 1, IT: 1, NA: 3 }),
];
const INABIE = ['NO_SUPLIDOR', 'LOCAL', 'REGIONAL', 'NACIONAL'];
const REJECTIONS = [0, 1, 2, 5];
const SAMPLING = ['COMPLETO', 'PROCESO_Y_PRODUCTO_TERMINADO', 'MATERIAS_PRIMAS', 'INEXISTENTE'];
const PRODUCTS: Record<1 | 2 | 3, FoodSubcategorySnapshot[]> = {
  1: [subcategory('pan', 'BAJO')],
  2: [subcategory('queso', 'MEDIO'), subcategory('pan', 'BAJO')],
  3: [subcategory('leche', 'ALTO'), subcategory('pure', null)],
};

const POINTS = [100, 167, 233, 300];
const WEIGHTS = [16, 9, 56, 5, 6, 8];

function oracle(indices: number[], productRisk: number) {
  const re = indices.reduce((sum, index, factor) => sum + POINTS[index]! * WEIGHTS[factor]!, 0);
  const rt = productRisk * re;
  const level = rt <= 36000 ? 'BAJO' : rt <= 63000 ? 'MEDIO' : 'ALTO';
  return { re, rt, level };
}

function fromTenThousandths(units: number): string {
  const integerPart = Math.floor(units / 10000);
  const fraction = String(units % 10000).padStart(4, '0').replace(/0+$/, '');
  return fraction === '' ? String(integerPart) : `${integerPart}.${fraction}`;
}

function* combinations(): Generator<number[]> {
  for (let n = 0; n < 4 ** 6; n += 1) {
    yield Array.from({ length: 6 }, (_, position) => Math.floor(n / 4 ** position) % 4);
  }
}

function snapshotFor([volume, haccp, bpm, inabie, rejections, sampling]: number[], productRisk: 1 | 2 | 3): InspectionSnapshot {
  return {
    inspectionId: `combo-${productRisk}`,
    ruleVersionId: 'regla-riesgo-v1',
    bpm: { templateVersionId: 'bpm', items: BPM[bpm!]! },
    products: { catalogVersionId: 'catalogo', subcategories: PRODUCTS[productRisk] },
    factorAnswers: {
      VOLUMEN_PRODUCCION: { value: VOLUME[volume!]! },
      HACCP: { option: HACCP[haccp!]! },
      PROVEEDOR_INABIE: { option: INABIE[inabie!]! },
      RECHAZOS_SANITARIOS: { value: REJECTIONS[rejections!]! },
      PLAN_MUESTREO: { option: SAMPLING[sampling!]! },
    },
  };
}

describe('Todas las combinaciones de la regla v1', () => {
  it('coinciden con el cálculo entero (12,288 casos)', () => {
    const rule = ruleV1();
    const mismatches: string[] = [];
    const levels = { BAJO: 0, MEDIO: 0, ALTO: 0 };
    let cases = 0;

    for (const indices of combinations()) {
      for (const productRisk of [1, 2, 3] as const) {
        cases += 1;
        const expected = oracle(indices, productRisk);
        const result = calculateInspectionRisk(snapshotFor(indices, productRisk), rule);
        levels[expected.level as keyof typeof levels] += 1;

        const contributions = result.explanation.establishment.factors.reduce(
          (sum, factor) => sum.add(Decimal.parse(factor.contribution ?? 'NaN')),
          Decimal.ZERO,
        );
        const ok =
          result.status === 'CALCULADO' &&
          result.establishmentRisk.value === fromTenThousandths(expected.re) &&
          result.totalRisk.value === fromTenThousandths(expected.rt) &&
          result.riskLevel === expected.level &&
          contributions.toString() === result.establishmentRisk.value &&
          result.totalRisk.display === Decimal.parse(result.totalRisk.value).toFixed(4) &&
          result.explanation.establishment.factors.every(
            (factor, position) => factor.points === Decimal.parse(String(POINTS[indices[position]!]! / 100)).toString(),
          );
        if (!ok) mismatches.push(`${indices.join('')}/RP${productRisk}`);
      }
    }

    expect(mismatches).toEqual([]);
    expect(cases).toBe(12288);
    expect(levels.BAJO + levels.MEDIO + levels.ALTO).toBe(12288);
    expect(levels.BAJO).toBeGreaterThan(0);
    expect(levels.MEDIO).toBeGreaterThan(0);
    expect(levels.ALTO).toBeGreaterThan(0);
  }, 60_000);

  it('con 2 decimales, riesgos de distinto nivel se verían iguales (por eso la v1 usa 4)', () => {
    const rule = ruleV1();
    const twoDecimals: RiskRuleVersion = { ...rule, display: { percentageDecimals: 2, riskDecimals: 2 } };
    const levelsShownAs360 = new Set<string>();
    for (const indices of combinations()) {
      for (const productRisk of [2, 3] as const) {
        const result = calculateInspectionRisk(snapshotFor(indices, productRisk), twoDecimals);
        if (result.status === 'CALCULADO' && result.totalRisk.display === '3.60') {
          levelsShownAs360.add(result.riskLevel);
        }
      }
    }
    expect([...levelsShownAs360].sort()).toEqual(['BAJO', 'MEDIO']);
  }, 60_000);
});
