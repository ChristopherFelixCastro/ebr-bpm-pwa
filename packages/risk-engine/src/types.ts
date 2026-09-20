import type { DecimalInput } from './decimal.js';

export type BpmAnswer = 'C' | 'CP' | 'IT' | 'NA';
export const BPM_ANSWERS: readonly BpmAnswer[] = Object.freeze(['C', 'CP', 'IT', 'NA'] as const);

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';
export const RISK_LEVELS: readonly RiskLevel[] = Object.freeze(['BAJO', 'MEDIO', 'ALTO'] as const);

export type InspectionFrequency = 'ANUAL' | 'SEMESTRAL' | 'TRIMESTRAL';
export const INSPECTION_FREQUENCIES: readonly InspectionFrequency[] = Object.freeze([
  'ANUAL',
  'SEMESTRAL',
  'TRIMESTRAL',
] as const);

export const FREQUENCY_MONTHS: Readonly<Record<InspectionFrequency, number>> = Object.freeze({
  ANUAL: 12,
  SEMESTRAL: 6,
  TRIMESTRAL: 3,
});

export const FACTOR_CODES = Object.freeze([
  'VOLUMEN_PRODUCCION',
  'HACCP',
  'CUMPLIMIENTO_BPM',
  'PROVEEDOR_INABIE',
  'RECHAZOS_SANITARIOS',
  'PLAN_MUESTREO',
] as const);
export type FactorCode = (typeof FACTOR_CODES)[number];

export type AnsweredFactorCode = Exclude<FactorCode, 'CUMPLIMIENTO_BPM'>;

export type RuleVersionStatus = 'BORRADOR' | 'PUBLICADA';

export interface NumericRange {
  min: DecimalInput | null;
  minInclusive: boolean;
  max: DecimalInput | null;
  maxInclusive: boolean;
}

export interface FactorBand {
  code: string;
  label: string;
  points: DecimalInput;
  range: NumericRange;
}

export interface FactorOption {
  code: string;
  label: string;
  points: DecimalInput;
}

interface FactorRuleBase {
  code: FactorCode;
  name: string;
  weight: DecimalInput;
}

export interface RangeFactorRule extends FactorRuleBase {
  kind: 'RANGO';
  unit?: string;
  integerOnly?: boolean;
  bands: FactorBand[];
}

export interface OptionFactorRule extends FactorRuleBase {
  kind: 'OPCION';
  options: FactorOption[];
}

export type FactorRule = RangeFactorRule | OptionFactorRule;

export interface FrequencyRangeRule {
  level: RiskLevel;
  frequency: InspectionFrequency;
  months: number;
  range: NumericRange;
}

export interface RiskRuleVersion {
  id: string;
  version: string;
  status: RuleVersionStatus;
  name?: string;
  bpmAnswerPoints: Record<Exclude<BpmAnswer, 'NA'>, DecimalInput>;
  productRiskPoints: Record<RiskLevel, DecimalInput>;
  display: {
    percentageDecimals: number;
    riskDecimals: number;
  };
  factors: FactorRule[];
  frequencyRanges: FrequencyRangeRule[];
}

export interface BpmItemSnapshot {
  itemId: string;
  code: string;
  allowsPartial?: boolean | null;
  answer: BpmAnswer | null;
}

export interface FoodSubcategorySnapshot {
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  microbiologicalRisk: RiskLevel | null;
  score: DecimalInput | null;
}

export type FactorAnswer = { value: DecimalInput; option?: never } | { option: string; value?: never };

export type FactorAnswers = Partial<Record<AnsweredFactorCode, FactorAnswer>>;

export interface InspectionSnapshot {
  inspectionId: string;
  ruleVersionId: string;
  bpm: {
    templateVersionId: string;
    items: BpmItemSnapshot[];
  };
  products: {
    catalogVersionId: string;
    subcategories: FoodSubcategorySnapshot[];
  };
  factorAnswers: FactorAnswers;
}

export interface CalculateOptions {
  allowDraft?: boolean;
}

export interface ComputedValue {
  value: string;
  exact: boolean;
  display: string;
}

export type NotCalculableReason = 'SIN_CRITERIOS_APLICABLES' | 'SIN_RIESGO_PRODUCTO_APLICABLE';

export interface ItemRef {
  itemId: string;
  code: string;
}

export interface SubcategoryRef {
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
}

export interface BpmExplanation {
  formula: string;
  counts: Record<BpmAnswer, number>;
  answerPoints: Record<Exclude<BpmAnswer, 'NA'>, string>;
  pointsObtained: string;
  pointsPossible: string;
  applicableItems: number;
  excludedItems: ItemRef[];
  percentage: ComputedValue | null;
}

export interface ProductExplanation {
  rule: string;
  points: Record<RiskLevel, string>;
  applicable: Array<SubcategoryRef & { microbiologicalRisk: RiskLevel; score: string }>;
  excluded: SubcategoryRef[];
  score: string | null;
  level: RiskLevel | null;
  determinedBy: SubcategoryRef[];
}

export interface FactorExplanation {
  code: FactorCode;
  name: string;
  input:
    | { kind: 'VALOR'; value: ComputedValue; unit?: string }
    | { kind: 'OPCION'; option: string }
    | { kind: 'SIN_VALOR' };
  selected: { code: string; label: string; range?: string } | null;
  points: string | null;
  weight: string;
  contribution: string | null;
}

export interface EstablishmentExplanation {
  formula: string;
  factors: FactorExplanation[];
  weightSum: string;
  value: ComputedValue | null;
}

export interface TotalExplanation {
  formula: string;
  value: ComputedValue | null;
  range: { level: RiskLevel; frequency: InspectionFrequency; months: number; label: string } | null;
}

export interface CalculationExplanation {
  versions: {
    engine: string;
    ruleVersion: { id: string; version: string; status: RuleVersionStatus };
    assignedRuleVersionId: string;
    bpmTemplateVersionId: string;
    foodCatalogVersionId: string;
    preview: boolean;
  };
  bpm: BpmExplanation;
  product: ProductExplanation;
  establishment: EstablishmentExplanation;
  total: TotalExplanation;
  rounding: {
    mode: 'HALF_UP';
    percentageDecimals: number;
    riskDecimals: number;
    storedDecimals: number;
    note: string;
  };
}

interface CalculationResultBase {
  inspectionId: string;
  engineVersion: string;
  preview: boolean;
  ruleVersion: { id: string; version: string; status: RuleVersionStatus };
  assignedRuleVersionId: string;
  bpmTemplateVersionId: string;
  foodCatalogVersionId: string;
  bpmPercentage: ComputedValue | null;
  productRisk: ComputedValue | null;
  establishmentRisk: ComputedValue | null;
  explanation: CalculationExplanation;
}

export interface CalculatedResult extends CalculationResultBase {
  status: 'CALCULADO';
  bpmPercentage: ComputedValue;
  productRisk: ComputedValue;
  establishmentRisk: ComputedValue;
  totalRisk: ComputedValue;
  riskLevel: RiskLevel;
  frequency: InspectionFrequency;
  frequencyMonths: number;
}

export interface NotCalculableResult extends CalculationResultBase {
  status: 'NO_CALCULABLE';
  reasons: NotCalculableReason[];
  totalRisk: null;
  riskLevel: null;
  frequency: null;
  frequencyMonths: null;
}

export type CalculationResult = CalculatedResult | NotCalculableResult;
