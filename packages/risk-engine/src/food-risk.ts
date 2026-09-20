import { Decimal } from './decimal.js';
import { RiskEngineError } from './errors.js';
import { compareText } from './sort.js';
import { RISK_LEVELS, type FoodSubcategorySnapshot, type RiskLevel, type SubcategoryRef } from './types.js';

export type ProductRiskPoints = Readonly<Record<RiskLevel, Decimal>>;

export interface ApplicableSubcategory extends SubcategoryRef {
  microbiologicalRisk: RiskLevel;
  score: Decimal;
}

export interface ProductRiskCalculation {
  status: 'CALCULADO' | 'SIN_RIESGO_PRODUCTO_APLICABLE';
  applicable: ApplicableSubcategory[];
  excluded: SubcategoryRef[];
  score: Decimal | null;
  level: RiskLevel | null;
  determinedBy: SubcategoryRef[];
}

const bySubcategory = (a: SubcategoryRef, b: SubcategoryRef): number =>
  compareText(a.categoryName, b.categoryName) ||
  compareText(a.subcategoryName, b.subcategoryName) ||
  compareText(a.subcategoryId, b.subcategoryId);

const toRef = ({ subcategoryId, subcategoryName, categoryName }: SubcategoryRef): SubcategoryRef => ({
  subcategoryId,
  subcategoryName,
  categoryName,
});

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function calculateProductRisk(
  subcategories: readonly FoodSubcategorySnapshot[],
  points: ProductRiskPoints,
): ProductRiskCalculation {
  if (!Array.isArray(subcategories)) {
    throw new RiskEngineError('ENTRADA_INVALIDA', 'products.subcategories debe ser una lista');
  }

  const seen = new Set<string>();
  const applicable: ApplicableSubcategory[] = [];
  const excluded: SubcategoryRef[] = [];

  subcategories.forEach((row, index) => {
    const path = `products.subcategories[${index}]`;
    if (typeof row !== 'object' || row === null) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path} debe ser un objeto`, { path });
    }
    if (!isNonEmptyText(row.subcategoryId) || !isNonEmptyText(row.subcategoryName) || !isNonEmptyText(row.categoryName)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path} necesita subcategoryId, subcategoryName y categoryName`, {
        path,
      });
    }
    if (seen.has(row.subcategoryId)) {
      throw new RiskEngineError('ENTRADA_DUPLICADA', `La subcategoría ${row.subcategoryId} está repetida`, {
        subcategoryId: row.subcategoryId,
      });
    }
    seen.add(row.subcategoryId);

    const noLevel = isEmpty(row.microbiologicalRisk);
    const noScore = isEmpty(row.score);
    if (!noLevel && !RISK_LEVELS.includes(row.microbiologicalRisk as RiskLevel)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path}.microbiologicalRisk no es un nivel válido`, {
        path,
        value: String(row.microbiologicalRisk),
      });
    }
    if (noLevel !== noScore) {
      throw new RiskEngineError(
        'CATALOGO_INCONSISTENTE',
        `${row.subcategoryName}: el nivel y el puntaje deben venir los dos o ninguno`,
        { subcategoryId: row.subcategoryId },
      );
    }
    if (noLevel) {
      excluded.push(toRef(row));
      return;
    }

    const level = row.microbiologicalRisk as RiskLevel;
    const score = Decimal.parse(row.score as string | number, `${path}.score`);
    if (!score.equals(points[level])) {
      throw new RiskEngineError(
        'CATALOGO_INCONSISTENTE',
        `${row.subcategoryName}: el nivel ${level} vale ${points[level].toString()}, no ${score.toString()}`,
        { subcategoryId: row.subcategoryId, level, score: score.toString(), expected: points[level].toString() },
      );
    }
    applicable.push({ ...toRef(row), microbiologicalRisk: level, score });
  });

  applicable.sort(bySubcategory);
  excluded.sort(bySubcategory);

  if (applicable.length === 0) {
    return {
      status: 'SIN_RIESGO_PRODUCTO_APLICABLE',
      applicable,
      excluded,
      score: null,
      level: null,
      determinedBy: [],
    };
  }

  const score = applicable.reduce((max, row) => (row.score.compare(max) > 0 ? row.score : max), applicable[0]!.score);
  const winners = applicable.filter((row) => row.score.equals(score));
  return {
    status: 'CALCULADO',
    applicable,
    excluded,
    score,
    level: winners[0]!.microbiologicalRisk,
    determinedBy: winners.map(toRef),
  };
}
