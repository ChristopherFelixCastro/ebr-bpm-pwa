import { expect } from 'vitest';
import regla from '../rules/regla-inicial.v1.json' with { type: 'json' };
import {
  compileRuleVersion,
  RiskEngineError,
  type BpmAnswer,
  type BpmItemSnapshot,
  type CompiledRuleVersion,
  type FactorAnswers,
  type FoodSubcategorySnapshot,
  type InspectionSnapshot,
  type RiskEngineErrorCode,
  type RiskRuleVersion,
} from '../src/index.js';

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function ruleV1(): RiskRuleVersion {
  return cloneJson(regla) as unknown as RiskRuleVersion;
}

export function compiledV1(): CompiledRuleVersion {
  return compileRuleVersion(ruleV1());
}

export function bpmItems(counts: Partial<Record<BpmAnswer, number>>): BpmItemSnapshot[] {
  const items: BpmItemSnapshot[] = [];
  let n = 0;
  for (const answer of ['C', 'CP', 'IT', 'NA'] as const) {
    for (let i = 0; i < (counts[answer] ?? 0); i += 1) {
      n += 1;
      items.push({ itemId: `item-${n}`, code: `1.${n}`, answer });
    }
  }
  return items;
}

export function subcategory(
  id: string,
  microbiologicalRisk: FoodSubcategorySnapshot['microbiologicalRisk'],
  category = 'Lácteos',
): FoodSubcategorySnapshot {
  const score = { BAJO: '1', MEDIO: '2', ALTO: '3' } as const;
  return {
    subcategoryId: id,
    subcategoryName: `Subcategoría ${id}`,
    categoryName: category,
    microbiologicalRisk,
    score: microbiologicalRisk === null ? null : score[microbiologicalRisk],
  };
}

export function referenceAnswers(): FactorAnswers {
  return {
    VOLUMEN_PRODUCCION: { value: '150000' },
    HACCP: { option: 'NO_IMPLEMENTADO' },
    PROVEEDOR_INABIE: { option: 'REGIONAL' },
    RECHAZOS_SANITARIOS: { value: 1 },
    PLAN_MUESTREO: { option: 'MATERIAS_PRIMAS' },
  };
}

export function referenceSnapshot(): InspectionSnapshot {
  return {
    inspectionId: 'insp-001',
    ruleVersionId: 'regla-riesgo-v1',
    bpm: {
      templateVersionId: 'bpm-plantilla-v1',
      items: bpmItems({ C: 34, IT: 6, NA: 5 }),
    },
    products: {
      catalogVersionId: 'catalogo-v1',
      subcategories: [subcategory('leche', 'ALTO'), subcategory('pan', 'BAJO', 'Panadería'), subcategory('pure', null, 'Frutas')],
    },
    factorAnswers: referenceAnswers(),
  };
}

export function expectEngineError(fn: () => unknown, code: RiskEngineErrorCode): RiskEngineError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(RiskEngineError);
    expect((error as RiskEngineError).code).toBe(code);
    return error as RiskEngineError;
  }
  throw new Error(`Se esperaba el error ${code}`);
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
