import type { Decimal } from './decimal.js';
import { RiskEngineError } from './errors.js';
import { rangeContains, type CompiledFrequencyRange, type CompiledRuleVersion } from './rules.js';

export interface TotalRiskCalculation {
  value: Decimal;
  range: CompiledFrequencyRange;
}

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
