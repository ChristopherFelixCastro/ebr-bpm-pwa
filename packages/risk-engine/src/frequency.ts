/**
 * Riesgo total y frecuencia de inspección.
 *
 *   RT = riesgo del producto × riesgo del establecimiento
 *
 * El rango se busca con el valor exacto: con la versión inicial, 3.6 es Anual y
 * 6.3 es Semestral.
 */
import type { Decimal } from './decimal.js';
import { RiskEngineError } from './errors.js';
import { rangeContains, type CompiledFrequencyRange, type CompiledRuleVersion } from './rules.js';

export interface TotalRiskCalculation {
  value: Decimal;
  range: CompiledFrequencyRange;
}

/** Rango de frecuencia que contiene el riesgo total. Lanza `RIESGO_TOTAL_SIN_RANGO` si ninguno lo contiene. */
export function classifyTotalRisk(rule: CompiledRuleVersion, totalRisk: Decimal): CompiledFrequencyRange {
  const range = rule.frequencyRanges.find((candidate) => rangeContains(candidate.range, totalRisk));
  if (range === undefined) {
    throw new RiskEngineError(
      'RIESGO_TOTAL_SIN_RANGO',
      `Ningún rango de frecuencia contiene el riesgo total ${totalRisk.toString()}`,
      { totalRisk: totalRisk.toString(), ruleVersion: rule.version },
    );
  }
  return range;
}

export function calculateTotalRisk(
  rule: CompiledRuleVersion,
  productRisk: Decimal,
  establishmentRisk: Decimal,
): TotalRiskCalculation {
  const value = productRisk.multiply(establishmentRisk);
  return { value, range: classifyTotalRisk(rule, value) };
}
