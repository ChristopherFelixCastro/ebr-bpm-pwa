/**
 * Contrato del motor de riesgo (propuesta para acordar con Core).
 *
 * Convención: identificadores en inglés (como las entidades y rutas del SDP) y
 * códigos de dominio en español, en mayúsculas (C/CP/IT/NA, BAJO/MEDIO/ALTO…).
 * Los decimales viajan como texto ("0.16") o número; el motor los convierte a
 * valores exactos.
 */
import type { DecimalInput } from './decimal.js';

/* ------------------------------------------------------------------ */
/* Códigos de dominio                                                  */
/* ------------------------------------------------------------------ */

/** Respuesta de un ítem BPM: Cumple, Cumplimiento Parcial, Incumplimiento Total, No Aplica. */
export type BpmAnswer = 'C' | 'CP' | 'IT' | 'NA';
export const BPM_ANSWERS: readonly BpmAnswer[] = Object.freeze(['C', 'CP', 'IT', 'NA'] as const);

/** De menor a mayor. */
export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';
export const RISK_LEVELS: readonly RiskLevel[] = Object.freeze(['BAJO', 'MEDIO', 'ALTO'] as const);

/** De menos a más frecuente. */
export type InspectionFrequency = 'ANUAL' | 'SEMESTRAL' | 'TRIMESTRAL';
export const INSPECTION_FREQUENCIES: readonly InspectionFrequency[] = Object.freeze([
  'ANUAL',
  'SEMESTRAL',
  'TRIMESTRAL',
] as const);

/** Meses entre inspecciones de cada frecuencia. */
export const FREQUENCY_MONTHS: Readonly<Record<InspectionFrequency, number>> = Object.freeze({
  ANUAL: 12,
  SEMESTRAL: 6,
  TRIMESTRAL: 3,
});

/** Los seis factores de categorización del establecimiento, en el orden del SDP. */
export const FACTOR_CODES = Object.freeze([
  'VOLUMEN_PRODUCCION',
  'HACCP',
  'CUMPLIMIENTO_BPM',
  'PROVEEDOR_INABIE',
  'RECHAZOS_SANITARIOS',
  'PLAN_MUESTREO',
] as const);
export type FactorCode = (typeof FACTOR_CODES)[number];

/** El cumplimiento BPM no lo contesta nadie: sale del cálculo de la ficha. */
export type AnsweredFactorCode = Exclude<FactorCode, 'CUMPLIMIENTO_BPM'>;

export type RuleVersionStatus = 'BORRADOR' | 'PUBLICADA';

/* ------------------------------------------------------------------ */
/* Versión de reglas (risk_rule_versions, risk_factors, frequency_ranges) */
/* ------------------------------------------------------------------ */

/**
 * Intervalo numérico. `null` en un extremo significa sin límite.
 * Ejemplo: { min: '60', minInclusive: false, max: '70', maxInclusive: true } es (60, 70].
 */
export interface NumericRange {
  min: DecimalInput | null;
  minInclusive: boolean;
  max: DecimalInput | null;
  maxInclusive: boolean;
}

/** Tramo de un factor numérico (por ejemplo, "Pequeño: de 200,000 a menos de 800,000"). Hasta 6 decimales. */
export interface FactorBand {
  code: string;
  label: string;
  points: DecimalInput;
  range: NumericRange;
}

/** Opción de un factor de selección (por ejemplo, "HACCP en el 75 % de las líneas"). */
export interface FactorOption {
  code: string;
  label: string;
  points: DecimalInput;
}

interface FactorRuleBase {
  code: FactorCode;
  name: string;
  /** Peso del factor (las seis sumas deben dar exactamente 1). */
  weight: DecimalInput;
}

/** Factor que se puntúa según el tramo donde cae un valor numérico. */
export interface RangeFactorRule extends FactorRuleBase {
  kind: 'RANGO';
  /** Unidad para mostrar ("unidades por mes", "%"). En CUMPLIMIENTO_BPM solo se admite "%". */
  unit?: string;
  /** Si es true, el valor debe ser entero (por ejemplo, la cantidad de rechazos). No aplica al BPM. */
  integerOnly?: boolean;
  bands: FactorBand[];
}

/** Factor que se puntúa según la opción elegida. */
export interface OptionFactorRule extends FactorRuleBase {
  kind: 'OPCION';
  options: FactorOption[];
}

export type FactorRule = RangeFactorRule | OptionFactorRule;

/**
 * Rango de riesgo total que define el nivel y la frecuencia de inspección.
 * Debe haber uno por nivel; a más riesgo, más frecuencia.
 */
export interface FrequencyRangeRule {
  level: RiskLevel;
  frequency: InspectionFrequency;
  /** Meses hasta la próxima inspección; debe coincidir con la frecuencia (12, 6 o 3). */
  months: number;
  range: NumericRange;
}

/** Versión publicada de las reglas de cálculo. El motor nunca usa constantes propias. */
export interface RiskRuleVersion {
  /** Identificador técnico (por ejemplo, el uuid de la fila). */
  id: string;
  /** Etiqueta visible de la versión ("1", "2026-09"…). */
  version: string;
  status: RuleVersionStatus;
  name?: string;
  /** Puntaje de cada respuesta BPM. NA no tiene puntaje porque no participa. */
  bpmAnswerPoints: Record<Exclude<BpmAnswer, 'NA'>, DecimalInput>;
  /** Puntaje oficial del riesgo microbiológico de un producto (bajo 1, medio 2, alto 3). */
  productRiskPoints: Record<RiskLevel, DecimalInput>;
  /**
   * Decimales para presentar (HALF_UP). La clasificación usa siempre el valor exacto.
   * Con 2 decimales, riesgos como 3.6006 (MEDIO) y 3.5997 (BAJO) se verían iguales ("3.60"),
   * por eso los riesgos usan 4 en la versión inicial: con esos puntajes y pesos, 4 decimales
   * muestran el valor exacto.
   */
  display: {
    /** Porcentaje BPM. */
    percentageDecimals: number;
    /** Riesgo del producto, del establecimiento y total. */
    riskDecimals: number;
  };
  factors: FactorRule[];
  frequencyRanges: FrequencyRangeRule[];
}

/* ------------------------------------------------------------------ */
/* Instantánea de la inspección                                        */
/* ------------------------------------------------------------------ */

/** Ítem de la plantilla BPM asignada a la inspección, con su respuesta. */
export interface BpmItemSnapshot {
  /** Clave técnica del ítem (bpm_items.id). */
  itemId: string;
  /** Código visible ("1.1.2"). */
  code: string;
  /** false si el ítem solo admite C, IT o NA. Ausente o null equivale a true. */
  allowsPartial?: boolean | null;
  /** null (o ausente) = sin responder. */
  answer: BpmAnswer | null;
}

/** Subcategoría alimentaria que elabora el establecimiento, tomada de la versión del catálogo. */
export interface FoodSubcategorySnapshot {
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  /** Riesgo microbiológico de la matriz. null (o "" o ausente) = No aplica; nunca se convierte en cero. */
  microbiologicalRisk: RiskLevel | null;
  /**
   * Puntaje de la matriz. Debe coincidir con `productRiskPoints` de la versión de reglas,
   * y ser null (o "" o ausente) cuando el nivel es No aplica.
   */
  score: DecimalInput | null;
}

/** Respuesta de un factor: un valor numérico o el código de una opción, nunca las dos cosas (undefined cuenta como ausente). */
export type FactorAnswer = { value: DecimalInput; option?: never } | { option: string; value?: never };

export type FactorAnswers = Partial<Record<AnsweredFactorCode, FactorAnswer>>;

/** Datos base de una inspección enviada, tal como los guarda Core. */
export interface InspectionSnapshot {
  inspectionId: string;
  /** Versión de reglas asignada a la inspección (debe ser la que se pasa al motor). */
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
  /**
   * Vista previa del administrador: permite una versión en borrador o distinta de la asignada.
   * El resultado sale con `preview: true` y no debe guardarse como oficial.
   */
  allowDraft?: boolean;
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

/**
 * Valor para guardar y mostrar.
 * - `value`: texto exacto si `exact` es true; si no (por ejemplo 25/39), redondeado HALF_UP a
 *   10 decimales, sin ceros finales.
 * - `display`: texto para mostrar, con separador de miles. Los valores calculados se redondean
 *   HALF_UP con los decimales de la versión (`display`); los datos capturados (volumen,
 *   rechazos) se muestran tal cual.
 */
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
  /** Puntaje de cada nivel en la versión usada. */
  points: Record<RiskLevel, string>;
  applicable: Array<SubcategoryRef & { microbiologicalRisk: RiskLevel; score: string }>;
  excluded: SubcategoryRef[];
  score: string | null;
  level: RiskLevel | null;
  /** Subcategorías que definieron el máximo. */
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
  /** puntos × peso. */
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
  /** Versiones usadas, para que la explicación se pueda guardar o mostrar sola. */
  versions: {
    engine: string;
    ruleVersion: { id: string; version: string; status: RuleVersionStatus };
    /** Versión de reglas asignada a la inspección (igual a ruleVersion.id salvo en vista previa). */
    assignedRuleVersionId: string;
    bpmTemplateVersionId: string;
    foodCatalogVersionId: string;
    /** true si se calculó en vista previa: no es un resultado oficial. */
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
  /** true si se calculó con `allowDraft` (vista previa): Core no debe guardarlo como oficial. */
  preview: boolean;
  /** Versión de reglas usada. */
  ruleVersion: { id: string; version: string; status: RuleVersionStatus };
  /** Versión de reglas asignada a la inspección. */
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
