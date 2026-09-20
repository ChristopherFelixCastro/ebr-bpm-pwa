import { calculateBpmCompliance } from './bpm.js';
import { RiskEngineError } from './errors.js';
import { calculateEstablishmentRisk } from './establishment.js';
import { buildExplanation, toComputedValue } from './explain.js';
import { calculateProductRisk } from './food-risk.js';
import { calculateTotalRisk } from './frequency.js';
import { compileRuleVersion } from './rules.js';
import type {
  CalculateOptions,
  CalculationResult,
  InspectionSnapshot,
  NotCalculableReason,
  RiskRuleVersion,
} from './types.js';
import { ENGINE_VERSION } from './version.js';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function requireText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RiskEngineError('ENTRADA_INVALIDA', `${path} debe ser un texto no vacío`, { path });
  }
  return value;
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RiskEngineError('ENTRADA_INVALIDA', `${path} debe ser un objeto`, { path });
  }
  return value as Record<string, unknown>;
}

export function calculateInspectionRisk(
  snapshot: InspectionSnapshot,
  ruleVersion: RiskRuleVersion,
  options?: CalculateOptions | null,
): CalculationResult {
  const preview = options?.allowDraft === true;
  const rule = compileRuleVersion(ruleVersion);
  if (rule.status !== 'PUBLICADA' && !preview) {
    throw new RiskEngineError('VERSION_NO_PUBLICADA', `La versión de reglas ${rule.version} no está publicada`, {
      ruleVersion: rule.version,
      status: rule.status,
    });
  }

  requireObject(snapshot, 'snapshot');
  const inspectionId = requireText(snapshot.inspectionId, 'inspectionId');
  const assignedRuleVersionId = requireText(snapshot.ruleVersionId, 'ruleVersionId');
  if (assignedRuleVersionId !== rule.id && !preview) {
    throw new RiskEngineError(
      'VERSION_NO_COINCIDE',
      `La inspección usa la versión de reglas ${assignedRuleVersionId}, no ${rule.id}`,
      { assigned: assignedRuleVersionId, received: rule.id },
    );
  }
  requireObject(snapshot.bpm, 'bpm');
  const bpmTemplateVersionId = requireText(snapshot.bpm.templateVersionId, 'bpm.templateVersionId');
  requireObject(snapshot.products, 'products');
  const foodCatalogVersionId = requireText(snapshot.products.catalogVersionId, 'products.catalogVersionId');

  const bpm = calculateBpmCompliance(snapshot.bpm.items, rule.bpmAnswerPoints);
  const product = calculateProductRisk(snapshot.products.subcategories, rule.productRiskPoints);
  const establishment = calculateEstablishmentRisk(rule, snapshot.factorAnswers, bpm.percentage);

  const reasons: NotCalculableReason[] = [];
  if (bpm.percentage === null) reasons.push('SIN_CRITERIOS_APLICABLES');
  if (product.score === null) reasons.push('SIN_RIESGO_PRODUCTO_APLICABLE');

  const total =
    product.score !== null && establishment.total !== null
      ? calculateTotalRisk(rule, product.score, establishment.total)
      : null;

  const { percentageDecimals, riskDecimals } = rule.display;
  const base = {
    inspectionId,
    engineVersion: ENGINE_VERSION,
    preview,
    ruleVersion: { id: rule.id, version: rule.version, status: rule.status },
    assignedRuleVersionId,
    bpmTemplateVersionId,
    foodCatalogVersionId,
    explanation: buildExplanation(
      rule,
      { assignedRuleVersionId, bpmTemplateVersionId, foodCatalogVersionId, preview },
      bpm,
      product,
      establishment,
      total,
    ),
  };
  const bpmPercentage = bpm.percentage === null ? null : toComputedValue(bpm.percentage, percentageDecimals);
  const productRisk = product.score === null ? null : toComputedValue(product.score, riskDecimals);
  const establishmentRisk =
    establishment.total === null ? null : toComputedValue(establishment.total, riskDecimals);

  let result: CalculationResult;
  if (total === null || bpmPercentage === null || productRisk === null || establishmentRisk === null) {
    result = {
      ...base,
      status: 'NO_CALCULABLE',
      reasons,
      bpmPercentage,
      productRisk,
      establishmentRisk,
      totalRisk: null,
      riskLevel: null,
      frequency: null,
      frequencyMonths: null,
    };
  } else {
    result = {
      ...base,
      status: 'CALCULADO',
      bpmPercentage,
      productRisk,
      establishmentRisk,
      totalRisk: toComputedValue(total.value, riskDecimals),
      riskLevel: total.range.level,
      frequency: total.range.frequency,
      frequencyMonths: total.range.months,
    };
  }
  return deepFreeze(result);
}
