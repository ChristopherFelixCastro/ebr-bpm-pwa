/**
 * Cumplimiento BPM de una inspección.
 *
 *   puntos_obtenidos = suma de los puntajes de las respuestas aplicables
 *   puntos_posibles  = cantidad de respuestas aplicables × puntaje de C
 *   porcentaje_bpm   = puntos_obtenidos / puntos_posibles × 100
 *
 * NA no suma ni entra al denominador. Si no queda ningún ítem aplicable no hay
 * porcentaje: el resultado es SIN_CRITERIOS_APLICABLES (nunca 0 % ni 100 %).
 */
import { Decimal, Ratio } from './decimal.js';
import { RiskEngineError } from './errors.js';
import { compareCodes, compareText } from './sort.js';
import { BPM_ANSWERS, type BpmAnswer, type BpmItemSnapshot, type ItemRef } from './types.js';

export type BpmAnswerPoints = Readonly<Record<Exclude<BpmAnswer, 'NA'>, Decimal>>;

export interface BpmCalculation {
  status: 'CALCULADO' | 'SIN_CRITERIOS_APLICABLES';
  counts: Record<BpmAnswer, number>;
  pointsObtained: Decimal;
  pointsPossible: Decimal;
  applicableItems: number;
  /** Ítems con NA, fuera del denominador. */
  excludedItems: ItemRef[];
  /** null cuando no hay ítems aplicables. */
  percentage: Ratio | null;
}

const byCode = (a: ItemRef, b: ItemRef): number => compareCodes(a.code, b.code) || compareText(a.itemId, b.itemId);

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function calculateBpmCompliance(
  items: readonly BpmItemSnapshot[],
  answerPoints: BpmAnswerPoints,
): BpmCalculation {
  if (!Array.isArray(items)) {
    throw new RiskEngineError('ENTRADA_INVALIDA', 'bpm.items debe ser una lista');
  }

  const seen = new Set<string>();
  const duplicated = new Set<string>();
  const unanswered: ItemRef[] = [];
  const partialNotAllowed: ItemRef[] = [];

  items.forEach((item, index) => {
    const path = `bpm.items[${index}]`;
    if (typeof item !== 'object' || item === null) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path} debe ser un objeto`, { path });
    }
    if (!isNonEmptyText(item.itemId) || !isNonEmptyText(item.code)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path} necesita itemId y code`, { path });
    }
    const allowsPartial = item.allowsPartial ?? true;
    if (typeof allowsPartial !== 'boolean') {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path}.allowsPartial debe ser true o false`, { path });
    }
    const answer = item.answer ?? null; // una respuesta ausente cuenta como sin responder
    if (answer !== null && !BPM_ANSWERS.includes(answer)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${path}.answer no es una respuesta válida`, {
        path,
        answer: String(answer),
        allowed: [...BPM_ANSWERS],
      });
    }
    if (seen.has(item.itemId)) duplicated.add(item.itemId);
    seen.add(item.itemId);
    if (answer === null) unanswered.push({ itemId: item.itemId, code: item.code });
    if (answer === 'CP' && !allowsPartial) {
      partialNotAllowed.push({ itemId: item.itemId, code: item.code });
    }
  });

  if (duplicated.size > 0) {
    throw new RiskEngineError('ENTRADA_DUPLICADA', 'Hay ítems BPM repetidos', {
      itemIds: [...duplicated].sort(compareText),
    });
  }
  if (unanswered.length > 0) {
    const pending = unanswered.sort(byCode);
    throw new RiskEngineError('RESPUESTAS_INCOMPLETAS', `Faltan ${pending.length} respuesta(s) BPM`, {
      items: pending,
    });
  }
  if (partialNotAllowed.length > 0) {
    throw new RiskEngineError(
      'RESPUESTA_NO_PERMITIDA',
      'Hay ítems con cumplimiento parcial (CP) que solo admiten C, IT o NA',
      { items: partialNotAllowed.sort(byCode) },
    );
  }

  const counts: Record<BpmAnswer, number> = { C: 0, CP: 0, IT: 0, NA: 0 };
  let pointsObtained = Decimal.ZERO;
  const excludedItems: ItemRef[] = [];
  for (const item of items) {
    const answer = item.answer as BpmAnswer;
    counts[answer] += 1;
    if (answer === 'NA') {
      excludedItems.push({ itemId: item.itemId, code: item.code });
    } else {
      pointsObtained = pointsObtained.add(answerPoints[answer]);
    }
  }

  const applicableItems = counts.C + counts.CP + counts.IT;
  const pointsPossible = Decimal.fromInteger(applicableItems).multiply(answerPoints.C);
  const percentage =
    applicableItems === 0 ? null : Ratio.divide(pointsObtained, pointsPossible).multiply(Decimal.HUNDRED);

  return {
    status: percentage === null ? 'SIN_CRITERIOS_APLICABLES' : 'CALCULADO',
    counts,
    pointsObtained,
    pointsPossible,
    applicableItems,
    excludedItems: excludedItems.sort(byCode),
    percentage,
  };
}
