/**
 * @ebr-bpm/risk-engine — motor de cálculo EBR/BPM.
 *
 * Uso típico (en Core):
 *   const resultado = calculateInspectionRisk(instantanea, versionPublicada);
 */
export { calculateInspectionRisk } from './calculate.js';
export { calculateBpmCompliance, type BpmAnswerPoints, type BpmCalculation } from './bpm.js';
export {
  calculateProductRisk,
  type ApplicableSubcategory,
  type ProductRiskCalculation,
  type ProductRiskPoints,
} from './food-risk.js';
export {
  calculateEstablishmentRisk,
  selectBand,
  selectOption,
  type EstablishmentCalculation,
  type FactorCalculation,
  type FactorInput,
} from './establishment.js';
export { calculateTotalRisk, classifyTotalRisk, type TotalRiskCalculation } from './frequency.js';
export {
  compileRuleVersion,
  describeRange,
  formatNumber,
  rangeContains,
  validateRuleVersion,
  type CompiledBand,
  type CompiledFactor,
  type CompiledFrequencyRange,
  type CompiledOption,
  type CompiledOptionFactor,
  type CompiledRange,
  type CompiledRangeFactor,
  type CompiledRuleVersion,
  type DescribeRangeOptions,
  type RuleIssue,
} from './rules.js';
export { buildExplanation, STORED_DECIMALS, toComputedValue, type ExplanationVersions } from './explain.js';
export { Decimal, Ratio, type DecimalInput } from './decimal.js';
export { RiskEngineError, type RiskEngineErrorCode } from './errors.js';
export { ENGINE_VERSION } from './version.js';
export * from './types.js';
