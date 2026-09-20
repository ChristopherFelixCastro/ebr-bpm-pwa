/**
 * Validación y compilación de una versión de reglas.
 *
 * `validateRuleVersion` sirve al publicar una versión (devuelve la lista de problemas).
 * `compileRuleVersion` la convierte a valores exactos para calcular y lanza
 * `VERSION_INVALIDA` si tiene problemas.
 */
import { Decimal, Ratio } from './decimal.js';
import { RiskEngineError } from './errors.js';
import {
  FACTOR_CODES,
  FREQUENCY_MONTHS,
  INSPECTION_FREQUENCIES,
  RISK_LEVELS,
  type BpmAnswer,
  type FactorCode,
  type InspectionFrequency,
  type NumericRange,
  type RiskLevel,
  type RiskRuleVersion,
  type RuleVersionStatus,
} from './types.js';

export interface RuleIssue {
  /** Ruta del dato con problema, por ejemplo `factors[2].weight`. */
  path: string;
  message: string;
}

export interface CompiledRange {
  min: Decimal | null;
  minInclusive: boolean;
  max: Decimal | null;
  maxInclusive: boolean;
}

export interface CompiledBand {
  code: string;
  label: string;
  points: Decimal;
  range: CompiledRange;
}

export interface CompiledOption {
  code: string;
  label: string;
  points: Decimal;
}

export interface CompiledRangeFactor {
  kind: 'RANGO';
  code: FactorCode;
  name: string;
  weight: Decimal;
  unit: string | null;
  integerOnly: boolean;
  bands: CompiledBand[];
}

export interface CompiledOptionFactor {
  kind: 'OPCION';
  code: FactorCode;
  name: string;
  weight: Decimal;
  options: CompiledOption[];
}

export type CompiledFactor = CompiledRangeFactor | CompiledOptionFactor;

export interface CompiledFrequencyRange {
  level: RiskLevel;
  frequency: InspectionFrequency;
  months: number;
  range: CompiledRange;
}

export interface CompiledRuleVersion {
  id: string;
  version: string;
  status: RuleVersionStatus;
  bpmAnswerPoints: Record<Exclude<BpmAnswer, 'NA'>, Decimal>;
  productRiskPoints: Record<RiskLevel, Decimal>;
  display: { percentageDecimals: number; riskDecimals: number };
  /** En el orden de FACTOR_CODES. */
  factors: CompiledFactor[];
  /** Ordenados de menor a mayor riesgo. */
  frequencyRanges: CompiledFrequencyRange[];
  weightSum: Decimal;
  /** Riesgo total mínimo y máximo que se puede obtener con esta versión. */
  totalRiskBounds: { min: Decimal; max: Decimal };
}

const MAX_DISPLAY_DECIMALS = 10;
/** Máximo de decimales en pesos, puntos y límites de una versión. */
const MAX_RULE_DECIMALS = 6;

/* ------------------------------------------------------------------ */
/* Rangos                                                              */
/* ------------------------------------------------------------------ */

function compareBound(value: Decimal | Ratio, bound: Decimal): -1 | 0 | 1 {
  return value instanceof Decimal ? value.compare(bound) : value.compare(bound);
}

/** ¿El valor está dentro del rango? */
export function rangeContains(range: CompiledRange, value: Decimal | Ratio): boolean {
  if (range.min !== null) {
    const c = compareBound(value, range.min);
    if (c < 0 || (c === 0 && !range.minInclusive)) return false;
  }
  if (range.max !== null) {
    const c = compareBound(value, range.max);
    if (c > 0 || (c === 0 && !range.maxInclusive)) return false;
  }
  return true;
}

/** Número con separador de miles: 2000000 → 2,000,000. */
export function formatNumber(value: Decimal): string {
  const [integerPart = '0', fractionPart] = value.toString().split('.');
  const negative = integerPart.startsWith('-');
  const digits = negative ? integerPart.slice(1) : integerPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${fractionPart === undefined ? '' : `.${fractionPart}`}`;
}

export interface DescribeRangeOptions {
  /** Unidad para mostrar. "%" se escribe junto a cada número; las demás, una vez al final. */
  unit?: string | null;
  /** Si el valor siempre es entero, [1, 2) se escribe "= 1" y [3, ∞) "≥ 3". */
  integerOnly?: boolean;
}

/** Texto del rango: "> 60 % y ≤ 70 %", "≥ 200,000 y < 800,000 unidades por mes", "= 1". */
export function describeRange(range: CompiledRange, options: DescribeRangeOptions = {}): string {
  const unit = options.unit ?? null;
  const percent = unit === '%';
  const show = (value: Decimal): string => (percent ? `${formatNumber(value)} %` : formatNumber(value));
  const suffix = unit === null || unit === '' || percent ? '' : ` ${unit}`;

  let { min, max, minInclusive, maxInclusive } = range;
  if (options.integerOnly === true) {
    // En un dominio entero, (a, …) es [a+1, …) y (…, b) es (…, b-1].
    if (min !== null) {
      min = minInclusive ? min.ceil() : min.floor().add(Decimal.ONE);
      minInclusive = true;
    }
    if (max !== null) {
      max = maxInclusive ? max.floor() : max.ceil().subtract(Decimal.ONE);
      maxInclusive = true;
    }
  }

  if (min !== null && max !== null && min.equals(max) && minInclusive && maxInclusive) {
    return `= ${show(min)}${suffix}`;
  }
  const lower = min === null ? null : `${minInclusive ? '≥' : '>'} ${show(min)}`;
  const upper = max === null ? null : `${maxInclusive ? '≤' : '<'} ${show(max)}`;
  if (lower !== null && upper !== null) return `${lower} y ${upper}${suffix}`;
  const single = lower ?? upper;
  return single === null ? 'cualquier valor' : `${single}${suffix}`;
}

function compareByLowerBound(a: CompiledRange, b: CompiledRange): number {
  if (a.min === null || b.min === null) {
    return a.min === b.min ? 0 : a.min === null ? -1 : 1;
  }
  const c = a.min.compare(b.min);
  if (c !== 0) return c;
  return a.minInclusive === b.minInclusive ? 0 : a.minInclusive ? -1 : 1;
}

/**
 * Revisa que los rangos no se solapen, no dejen huecos y lleguen hasta +∞.
 * Con `coverFromZero`, además deben empezar en 0 (inclusive) o antes.
 */
function checkContiguous(
  ranges: ReadonlyArray<{ range: CompiledRange; path: string }>,
  issues: RuleIssue[],
  basePath: string,
  coverFromZero: boolean,
): void {
  if (ranges.length === 0) return;
  const sorted = [...ranges].sort((a, b) => compareByLowerBound(a.range, b.range));
  const first = sorted[0]!;
  if (coverFromZero && first.range.min !== null) {
    const c = first.range.min.compare(Decimal.ZERO);
    if (c > 0 || (c === 0 && !first.range.minInclusive)) {
      issues.push({ path: basePath, message: 'Los rangos no cubren desde 0' });
    }
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    const describe = `${describeRange(previous.range)} / ${describeRange(current.range)}`;
    if (previous.range.max === null || current.range.min === null) {
      issues.push({ path: current.path, message: `Rangos solapados: ${describe}` });
      continue;
    }
    const c = previous.range.max.compare(current.range.min);
    if (c < 0) {
      issues.push({ path: current.path, message: `Hueco entre rangos: ${describe}` });
    } else if (c > 0) {
      issues.push({ path: current.path, message: `Rangos solapados: ${describe}` });
    } else if (previous.range.maxInclusive && current.range.minInclusive) {
      issues.push({ path: current.path, message: `Los dos rangos incluyen el límite: ${describe}` });
    } else if (!previous.range.maxInclusive && !current.range.minInclusive) {
      issues.push({ path: current.path, message: `Ningún rango incluye el límite: ${describe}` });
    }
  }
  const last = sorted[sorted.length - 1]!;
  if (last.range.max !== null) {
    issues.push({
      path: last.path,
      message: `Los rangos no cubren valores ${last.range.maxInclusive ? 'mayores que' : 'desde'} ${formatNumber(last.range.max)}`,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Lectura defensiva (la versión puede venir de JSON o de la base)     */
/* ------------------------------------------------------------------ */

class Reader {
  readonly issues: RuleIssue[] = [];

  issue(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  text(value: unknown, path: string): string {
    if (typeof value === 'string' && value.trim() !== '') return value;
    this.issue(path, 'Debe ser un texto no vacío');
    return '';
  }

  decimal(value: unknown, path: string): Decimal | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
      this.issue(path, 'Debe ser un número o un texto decimal');
      return null;
    }
    let parsed: Decimal;
    try {
      parsed = Decimal.parse(value, path);
    } catch {
      this.issue(path, `"${String(value)}" no es un decimal válido`);
      return null;
    }
    if (parsed.scale > MAX_RULE_DECIMALS) {
      this.issue(path, `Admite como máximo ${MAX_RULE_DECIMALS} decimales`);
      return null;
    }
    return parsed;
  }

  positive(value: unknown, path: string): Decimal {
    const parsed = this.decimal(value, path);
    if (parsed !== null && !parsed.isPositive()) this.issue(path, 'Debe ser mayor que 0');
    return parsed ?? Decimal.ONE;
  }

  boolean(value: unknown, path: string): boolean {
    if (typeof value === 'boolean') return value;
    this.issue(path, 'Debe ser true o false');
    return false;
  }

  array(value: unknown, path: string): unknown[] {
    if (Array.isArray(value) && value.length > 0) return value;
    this.issue(path, 'Debe ser una lista con al menos un elemento');
    return [];
  }

  record(value: unknown, path: string): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    this.issue(path, 'Debe ser un objeto');
    return {};
  }

  unique(codes: unknown[], path: string, what: string): void {
    const seen = new Set<unknown>();
    for (const code of codes) {
      if (code === '' || code === undefined) continue;
      if (seen.has(code)) this.issue(path, `${what} repetido: ${String(code)}`);
      seen.add(code);
    }
  }

  range(value: unknown, path: string): CompiledRange {
    const raw = this.record(value, path) as Partial<Record<keyof NumericRange, unknown>>;
    const min = raw.min === null ? null : this.decimal(raw.min, `${path}.min`);
    const max = raw.max === null ? null : this.decimal(raw.max, `${path}.max`);
    const range: CompiledRange = {
      min,
      minInclusive: this.boolean(raw.minInclusive, `${path}.minInclusive`),
      max,
      maxInclusive: this.boolean(raw.maxInclusive, `${path}.maxInclusive`),
    };
    if (min !== null && max !== null) {
      const c = min.compare(max);
      if (c > 0 || (c === 0 && !(range.minInclusive && range.maxInclusive))) {
        this.issue(path, `Rango vacío: ${describeRange(range)}`);
      }
    }
    return range;
  }
}

/* ------------------------------------------------------------------ */
/* Análisis de la versión                                              */
/* ------------------------------------------------------------------ */

const factorOrder = (code: FactorCode): number => {
  const index = FACTOR_CODES.indexOf(code);
  return index === -1 ? FACTOR_CODES.length : index;
};

const byPointsThenCode = (a: CompiledOption, b: CompiledOption): number =>
  a.points.compare(b.points) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

function readFactor(r: Reader, value: unknown, path: string): CompiledFactor | null {
  const raw = r.record(value, path);
  const code = raw.code as FactorCode;
  if (!FACTOR_CODES.includes(code)) {
    r.issue(`${path}.code`, `Factor desconocido: ${String(raw.code)}`);
  }
  const name = r.text(raw.name, `${path}.name`);
  const weight = r.decimal(raw.weight, `${path}.weight`) ?? Decimal.ZERO;
  if (!weight.isPositive() || weight.compare(Decimal.ONE) > 0) {
    r.issue(`${path}.weight`, 'El peso debe ser mayor que 0 y como máximo 1');
  }

  if (raw.kind === 'RANGO') {
    const bands = r.array(raw.bands, `${path}.bands`).map((bandValue, index): CompiledBand => {
      const bandPath = `${path}.bands[${index}]`;
      const band = r.record(bandValue, bandPath);
      return {
        code: r.text(band.code, `${bandPath}.code`),
        label: r.text(band.label, `${bandPath}.label`),
        points: r.positive(band.points, `${bandPath}.points`),
        range: r.range(band.range, `${bandPath}.range`),
      };
    });
    r.unique(
      bands.map((band) => band.code),
      `${path}.bands`,
      'Código de tramo',
    );
    checkContiguous(
      bands.map((band, index) => ({ range: band.range, path: `${path}.bands[${index}].range` })),
      r.issues,
      `${path}.bands`,
      true,
    );
    // null (columna vacía en la base) cuenta como ausente.
    const unit = raw.unit ?? undefined;
    const integerOnly = raw.integerOnly ?? undefined;
    if (unit !== undefined && typeof unit !== 'string') r.issue(`${path}.unit`, 'Debe ser texto');
    if (integerOnly !== undefined && typeof integerOnly !== 'boolean') {
      r.issue(`${path}.integerOnly`, 'Debe ser true o false');
    }
    if (code === 'CUMPLIMIENTO_BPM') {
      if (integerOnly === true) r.issue(`${path}.integerOnly`, 'El porcentaje BPM no tiene por qué ser entero');
      if (unit !== undefined && unit !== '%') r.issue(`${path}.unit`, 'La unidad del cumplimiento BPM es "%"');
    }
    return {
      kind: 'RANGO',
      code,
      name,
      weight,
      unit: typeof unit === 'string' ? unit : null,
      integerOnly: integerOnly === true,
      bands: [...bands].sort((a, b) => compareByLowerBound(a.range, b.range)),
    };
  }

  if (raw.kind === 'OPCION') {
    if (code === 'CUMPLIMIENTO_BPM') {
      r.issue(`${path}.kind`, 'CUMPLIMIENTO_BPM debe ser RANGO: su valor sale del porcentaje de la ficha');
    }
    const options = r.array(raw.options, `${path}.options`).map((optionValue, index): CompiledOption => {
      const optionPath = `${path}.options[${index}]`;
      const option = r.record(optionValue, optionPath);
      return {
        code: r.text(option.code, `${optionPath}.code`),
        label: r.text(option.label, `${optionPath}.label`),
        points: r.positive(option.points, `${optionPath}.points`),
      };
    });
    r.unique(
      options.map((option) => option.code),
      `${path}.options`,
      'Código de opción',
    );
    return { kind: 'OPCION', code, name, weight, options: [...options].sort(byPointsThenCode) };
  }

  r.issue(`${path}.kind`, 'Debe ser RANGO u OPCION');
  return null;
}

function readFrequencyRanges(r: Reader, value: unknown): CompiledFrequencyRange[] {
  const ranges = r.array(value, 'frequencyRanges').map((item, index): CompiledFrequencyRange => {
    const path = `frequencyRanges[${index}]`;
    const raw = r.record(item, path);
    const level = raw.level as RiskLevel;
    if (!RISK_LEVELS.includes(level)) r.issue(`${path}.level`, 'Debe ser BAJO, MEDIO o ALTO');
    const frequency = raw.frequency as InspectionFrequency;
    const knownFrequency = INSPECTION_FREQUENCIES.includes(frequency);
    if (!knownFrequency) r.issue(`${path}.frequency`, 'Debe ser ANUAL, SEMESTRAL o TRIMESTRAL');
    const months = raw.months;
    if (typeof months !== 'number' || !Number.isInteger(months) || months <= 0) {
      r.issue(`${path}.months`, 'Debe ser un entero mayor que 0');
    } else if (knownFrequency && months !== FREQUENCY_MONTHS[frequency]) {
      r.issue(`${path}.months`, `${frequency} corresponde a ${FREQUENCY_MONTHS[frequency]} meses`);
    }
    return {
      level,
      frequency,
      months: typeof months === 'number' ? months : 0,
      range: r.range(raw.range, `${path}.range`),
    };
  });

  r.unique(
    ranges.map((range) => range.level),
    'frequencyRanges',
    'Nivel',
  );
  r.unique(
    ranges.map((range) => range.frequency),
    'frequencyRanges',
    'Frecuencia',
  );
  for (const level of RISK_LEVELS) {
    if (!ranges.some((range) => range.level === level)) r.issue('frequencyRanges', `Falta el rango del nivel ${level}`);
  }
  checkContiguous(
    ranges.map((range, index) => ({ range: range.range, path: `frequencyRanges[${index}].range` })),
    r.issues,
    'frequencyRanges',
    false,
  );

  // A más riesgo, nivel más alto e inspección más frecuente.
  const ordered = [...ranges].sort((a, b) => compareByLowerBound(a.range, b.range));
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1]!;
    const current = ordered[i]!;
    if (RISK_LEVELS.indexOf(current.level) <= RISK_LEVELS.indexOf(previous.level)) {
      r.issue('frequencyRanges', `El nivel ${current.level} no puede ir después de ${previous.level}`);
    }
    if (INSPECTION_FREQUENCIES.indexOf(current.frequency) <= INSPECTION_FREQUENCIES.indexOf(previous.frequency)) {
      r.issue('frequencyRanges', `La frecuencia ${current.frequency} no puede ir después de ${previous.frequency}`);
    }
  }
  return ordered;
}

/** ¿Hay algún valor de [min, max] dentro del rango? */
function overlaps(range: CompiledRange, min: Decimal, max: Decimal): boolean {
  const belowMax =
    range.min === null || range.min.compare(max) < 0 || (range.min.equals(max) && range.minInclusive);
  const aboveMin =
    range.max === null || range.max.compare(min) > 0 || (range.max.equals(min) && range.maxInclusive);
  return belowMax && aboveMin;
}

/**
 * El riesgo total mínimo alcanzable no puede quedar por debajo del primer rango
 * (los rangos son contiguos y el último no tiene tope, así que el resto está cubierto),
 * y cada nivel debe poder alcanzarse con alguna combinación.
 */
function checkReachability(
  r: Reader,
  ranges: readonly CompiledFrequencyRange[],
  bounds: { min: Decimal; max: Decimal },
): void {
  const lowest = ranges[0];
  if (lowest?.range.min != null) {
    const c = bounds.min.compare(lowest.range.min);
    if (c < 0 || (c === 0 && !lowest.range.minInclusive)) {
      r.issue(
        'frequencyRanges',
        `El riesgo total puede valer ${bounds.min.toString()}, que queda por debajo del primer rango (${describeRange(lowest.range)})`,
      );
    }
  }
  for (const range of ranges) {
    if (!overlaps(range.range, bounds.min, bounds.max)) {
      r.issue(
        'frequencyRanges',
        `El nivel ${range.level} no se puede alcanzar: el riesgo total va de ${bounds.min.toString()} a ${bounds.max.toString()}`,
      );
    }
  }
}

function analyze(rule: RiskRuleVersion): { compiled: CompiledRuleVersion; issues: RuleIssue[] } {
  const r = new Reader();
  const root = r.record(rule, '$');

  const id = r.text(root.id, 'id');
  const version = r.text(root.version, 'version');
  let status: RuleVersionStatus = 'BORRADOR';
  if (root.status === 'BORRADOR' || root.status === 'PUBLICADA') {
    status = root.status;
  } else {
    r.issue('status', 'Debe ser BORRADOR o PUBLICADA');
  }

  const displayRaw = r.record(root.display, 'display');
  const decimalsOf = (key: 'percentageDecimals' | 'riskDecimals'): number => {
    const value = displayRaw[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_DISPLAY_DECIMALS) {
      return value;
    }
    r.issue(`display.${key}`, `Debe ser un entero entre 0 y ${MAX_DISPLAY_DECIMALS}`);
    return 2;
  };
  const display = { percentageDecimals: decimalsOf('percentageDecimals'), riskDecimals: decimalsOf('riskDecimals') };

  // Puntaje de las respuestas BPM: 0 ≤ IT ≤ CP ≤ C, IT < C y C > 0.
  const answers = r.record(root.bpmAnswerPoints, 'bpmAnswerPoints');
  const pointsC = r.decimal(answers.C, 'bpmAnswerPoints.C') ?? Decimal.ONE;
  const pointsCP = r.decimal(answers.CP, 'bpmAnswerPoints.CP') ?? Decimal.ZERO;
  const pointsIT = r.decimal(answers.IT, 'bpmAnswerPoints.IT') ?? Decimal.ZERO;
  if (!pointsC.isPositive()) r.issue('bpmAnswerPoints.C', 'Debe ser mayor que 0');
  if (pointsIT.isNegative()) r.issue('bpmAnswerPoints.IT', 'No puede ser negativo');
  if (pointsCP.compare(pointsIT) < 0 || pointsCP.compare(pointsC) > 0) {
    r.issue('bpmAnswerPoints.CP', 'Debe estar entre el puntaje de IT y el de C');
  }
  if (pointsIT.compare(pointsC) >= 0) r.issue('bpmAnswerPoints.IT', 'Debe ser menor que el puntaje de C');

  // Puntaje del riesgo del producto: positivo y creciente (BAJO < MEDIO < ALTO).
  const productRaw = r.record(root.productRiskPoints, 'productRiskPoints');
  const productRiskPoints = {} as Record<RiskLevel, Decimal>;
  RISK_LEVELS.forEach((level, index) => {
    const points = r.positive(productRaw[level], `productRiskPoints.${level}`);
    productRiskPoints[level] = points;
    const lower = index === 0 ? null : productRiskPoints[RISK_LEVELS[index - 1]!];
    if (lower !== null && lower !== undefined && points.compare(lower) <= 0) {
      r.issue(`productRiskPoints.${level}`, `Debe ser mayor que el puntaje de ${RISK_LEVELS[index - 1]}`);
    }
  });

  // Factores (se ordenan como en FACTOR_CODES para que el resultado no dependa del orden de las filas).
  const factors = r
    .array(root.factors, 'factors')
    .map((value, index) => readFactor(r, value, `factors[${index}]`))
    .filter((factor): factor is CompiledFactor => factor !== null)
    .sort((a, b) => factorOrder(a.code) - factorOrder(b.code));
  r.unique(
    factors.map((factor) => factor.code),
    'factors',
    'Factor',
  );
  for (const code of FACTOR_CODES) {
    if (!factors.some((factor) => factor.code === code)) r.issue('factors', `Falta el factor ${code}`);
  }
  const weightSum = factors.reduce((sum, factor) => sum.add(factor.weight), Decimal.ZERO);
  if (!weightSum.equals(Decimal.ONE)) {
    r.issue('factors', `Los pesos suman ${weightSum.toString()}; deben sumar exactamente 1`);
  }

  const frequencyRanges = readFrequencyRanges(r, root.frequencyRanges);

  // Todo riesgo total posible debe caer en algún rango: se revisa el mínimo alcanzable
  // (los rangos ya son contiguos y el último no tiene tope).
  const pointsOf = (factor: CompiledFactor): Decimal[] =>
    factor.kind === 'RANGO' ? factor.bands.map((band) => band.points) : factor.options.map((option) => option.points);
  const extreme = (values: Decimal[], pick: 'min' | 'max'): Decimal =>
    values.reduce((best, value) => ((pick === 'min' ? value.compare(best) < 0 : value.compare(best) > 0) ? value : best), values[0] ?? Decimal.ZERO);
  const establishmentBounds = (pick: 'min' | 'max'): Decimal =>
    factors.reduce((sum, factor) => sum.add(extreme(pointsOf(factor), pick).multiply(factor.weight)), Decimal.ZERO);
  const productPoints = RISK_LEVELS.map((level) => productRiskPoints[level]);
  const totalRiskBounds = {
    min: extreme(productPoints, 'min').multiply(establishmentBounds('min')),
    max: extreme(productPoints, 'max').multiply(establishmentBounds('max')),
  };
  if (r.issues.length === 0) checkReachability(r, frequencyRanges, totalRiskBounds);

  return {
    compiled: {
      id,
      version,
      status,
      bpmAnswerPoints: { C: pointsC, CP: pointsCP, IT: pointsIT },
      productRiskPoints,
      display,
      factors,
      frequencyRanges,
      weightSum,
      totalRiskBounds,
    },
    issues: r.issues,
  };
}

/** Lista de problemas de una versión de reglas. Vacía = se puede publicar. */
export function validateRuleVersion(rule: RiskRuleVersion): RuleIssue[] {
  return analyze(rule).issues;
}

/** Convierte la versión a valores exactos. Lanza `VERSION_INVALIDA` con la lista de problemas. */
export function compileRuleVersion(rule: RiskRuleVersion): CompiledRuleVersion {
  const { compiled, issues } = analyze(rule);
  if (issues.length > 0) {
    throw new RiskEngineError('VERSION_INVALIDA', `La versión de reglas tiene ${issues.length} problema(s)`, {
      issues,
    });
  }
  return compiled;
}
