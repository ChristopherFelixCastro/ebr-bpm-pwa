import { Decimal, type Ratio } from './decimal.js';
import type { BpmCalculation } from './bpm.js';
import type { EstablishmentCalculation, FactorCalculation } from './establishment.js';
import type { ProductRiskCalculation } from './food-risk.js';
import type { TotalRiskCalculation } from './frequency.js';
import { describeRange, formatNumber, type CompiledRuleVersion } from './rules.js';
import type { CalculationExplanation, ComputedValue, FactorExplanation } from './types.js';
import { ENGINE_VERSION } from './version.js';

export const STORED_DECIMALS = 10;

function groupThousands(text: string): string {
  const [integerPart = '', fractionPart] = text.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fractionPart === undefined ? grouped : `${grouped}.${fractionPart}`;
}

export function toComputedValue(value: Decimal | Ratio, displayDecimals: number): ComputedValue {
  if (value instanceof Decimal) {
    return { value: value.toString(), exact: true, display: groupThousands(value.toFixed(displayDecimals)) };
  }
  const { text, exact } = value.toText(STORED_DECIMALS);
  return { value: text, exact, display: groupThousands(value.toFixed(displayDecimals)) };
}

function explainFactor(calculation: FactorCalculation, displayDecimals: number): FactorExplanation {
  const { factor, input, selected, points, contribution } = calculation;
  const unit = factor.kind === 'RANGO' ? factor.unit : null;

  let explainedInput: FactorExplanation['input'];
  if (input.kind === 'VALOR') {
    const value =
      input.value instanceof Decimal
        ? { value: input.value.toString(), exact: true, display: formatNumber(input.value) }
        : toComputedValue(input.value, displayDecimals);
    explainedInput = unit === null ? { kind: 'VALOR', value } : { kind: 'VALOR', value, unit };
  } else if (input.kind === 'OPCION') {
    explainedInput = { kind: 'OPCION', option: input.option };
  } else {
    explainedInput = { kind: 'SIN_VALOR' };
  }

  let explainedSelection: FactorExplanation['selected'] = null;
  if (selected !== null) {
    explainedSelection =
      'range' in selected
        ? {
            code: selected.code,
            label: selected.label,
            range: describeRange(selected.range, {
              unit,
              integerOnly: factor.kind === 'RANGO' && factor.integerOnly,
            }),
          }
        : { code: selected.code, label: selected.label };
  }

  return {
    code: factor.code,
    name: factor.name,
    input: explainedInput,
    selected: explainedSelection,
    points: points === null ? null : points.toString(),
    weight: factor.weight.toString(),
    contribution: contribution === null ? null : contribution.toString(),
  };
}

export interface ExplanationVersions {
  assignedRuleVersionId: string;
  bpmTemplateVersionId: string;
  foodCatalogVersionId: string;
  preview: boolean;
}

export function buildExplanation(
  rule: CompiledRuleVersion,
  versions: ExplanationVersions,
  bpm: BpmCalculation,
  product: ProductRiskCalculation,
  establishment: EstablishmentCalculation,
  total: TotalRiskCalculation | null,
): CalculationExplanation {
  const { percentageDecimals, riskDecimals } = rule.display;
  return {
    versions: {
      engine: ENGINE_VERSION,
      ruleVersion: { id: rule.id, version: rule.version, status: rule.status },
      assignedRuleVersionId: versions.assignedRuleVersionId,
      bpmTemplateVersionId: versions.bpmTemplateVersionId,
      foodCatalogVersionId: versions.foodCatalogVersionId,
      preview: versions.preview,
    },
    bpm: {
      formula: 'porcentaje_bpm = puntos_obtenidos / puntos_posibles × 100 (NA no entra al denominador)',
      counts: { ...bpm.counts },
      answerPoints: {
        C: rule.bpmAnswerPoints.C.toString(),
        CP: rule.bpmAnswerPoints.CP.toString(),
        IT: rule.bpmAnswerPoints.IT.toString(),
      },
      pointsObtained: bpm.pointsObtained.toString(),
      pointsPossible: bpm.pointsPossible.toString(),
      applicableItems: bpm.applicableItems,
      excludedItems: bpm.excludedItems.map((item) => ({ ...item })),
      percentage: bpm.percentage === null ? null : toComputedValue(bpm.percentage, percentageDecimals),
    },
    product: {
      rule: 'riesgo_producto = mayor puntaje entre las subcategorías aplicables (NA no participa)',
      points: {
        BAJO: rule.productRiskPoints.BAJO.toString(),
        MEDIO: rule.productRiskPoints.MEDIO.toString(),
        ALTO: rule.productRiskPoints.ALTO.toString(),
      },
      applicable: product.applicable.map((row) => ({
        subcategoryId: row.subcategoryId,
        subcategoryName: row.subcategoryName,
        categoryName: row.categoryName,
        microbiologicalRisk: row.microbiologicalRisk,
        score: row.score.toString(),
      })),
      excluded: product.excluded.map((row) => ({ ...row })),
      score: product.score === null ? null : product.score.toString(),
      level: product.level,
      determinedBy: product.determinedBy.map((row) => ({ ...row })),
    },
    establishment: {
      formula: 'RE = Σ (puntos del factor × peso)',
      factors: establishment.factors.map((factor) => explainFactor(factor, percentageDecimals)),
      weightSum: rule.weightSum.toString(),
      value: establishment.total === null ? null : toComputedValue(establishment.total, riskDecimals),
    },
    total: {
      formula: 'RT = riesgo del producto × riesgo del establecimiento',
      value: total === null ? null : toComputedValue(total.value, riskDecimals),
      range:
        total === null
          ? null
          : {
              level: total.range.level,
              frequency: total.range.frequency,
              months: total.range.months,
              label: describeRange(total.range.range),
            },
    },
    rounding: {
      mode: 'HALF_UP',
      percentageDecimals,
      riskDecimals,
      storedDecimals: STORED_DECIMALS,
      note: 'Las clasificaciones usan el valor exacto; el redondeo solo se aplica al mostrar.',
    },
  };
}
