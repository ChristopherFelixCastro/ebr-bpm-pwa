import { describe, expect, it } from 'vitest';
import { compileRuleVersion, describeRange, Decimal, validateRuleVersion, type RiskRuleVersion } from '../src/index.js';
import { cloneJson, expectEngineError, ruleV1 } from './helpers.js';

type Mutable = Record<string, any>;
type Bands = any[];

function issuesAfter(change: (rule: Mutable) => void): string[] {
  const rule = ruleV1() as unknown as Mutable;
  change(rule);
  return validateRuleVersion(rule as RiskRuleVersion).map((issue) => `${issue.path}: ${issue.message}`);
}

const factorIndex = (rule: Mutable, code: string): number => rule.factors.findIndex((f: Mutable) => f.code === code);
const volume = (rule: Mutable): Mutable => rule.factors[factorIndex(rule, 'VOLUMEN_PRODUCCION')];

describe('Versión de reglas', () => {
  it('la regla inicial v1 es válida y sus pesos suman exactamente 1', () => {
    expect(validateRuleVersion(ruleV1())).toEqual([]);
    const compiled = compileRuleVersion(ruleV1());
    expect(compiled.weightSum.toString()).toBe('1');
    expect(compiled.factors.map((f) => [f.code, f.weight.toString()])).toEqual([
      ['VOLUMEN_PRODUCCION', '0.16'],
      ['HACCP', '0.09'],
      ['CUMPLIMIENTO_BPM', '0.56'],
      ['PROVEEDOR_INABIE', '0.05'],
      ['RECHAZOS_SANITARIOS', '0.06'],
      ['PLAN_MUESTREO', '0.08'],
    ]);
    expect(compiled.display).toEqual({ percentageDecimals: 2, riskDecimals: 4 });
  });

  it('acepta pesos, puntos y límites como números', () => {
    const rule = ruleV1() as unknown as Mutable;
    const toNumber = (value: unknown) => (value === null ? null : Number(value));
    for (const factor of rule.factors) {
      factor.weight = Number(factor.weight);
      for (const row of factor.kind === 'RANGO' ? factor.bands : factor.options) {
        row.points = Number(row.points);
        if (row.range) {
          row.range.min = toNumber(row.range.min);
          row.range.max = toNumber(row.range.max);
        }
      }
    }
    for (const key of Object.keys(rule.bpmAnswerPoints)) rule.bpmAnswerPoints[key] = Number(rule.bpmAnswerPoints[key]);
    for (const key of Object.keys(rule.productRiskPoints)) rule.productRiskPoints[key] = Number(rule.productRiskPoints[key]);
    expect(validateRuleVersion(rule as RiskRuleVersion)).toEqual([]);
    expect(JSON.stringify(compileRuleVersion(rule as RiskRuleVersion))).toBe(JSON.stringify(compileRuleVersion(ruleV1())));
  });

  it.each([
    ['0.99', '0.15'],
    ['1.01', '0.17'],
  ])('rechaza pesos que suman %s', (sum, volumeWeight) => {
    const issues = issuesAfter((rule) => {
      volume(rule).weight = volumeWeight;
    });
    expect(issues).toEqual([`factors: Los pesos suman ${sum}; deben sumar exactamente 1`]);
  });

  it.each([['0'], ['-0.16'], ['1.5'], ['1,6'], [null]])('rechaza el peso %s', (weight) => {
    const issues = issuesAfter((rule) => {
      volume(rule).weight = weight;
    });
    expect(issues.some((issue) => issue.startsWith('factors[0].weight'))).toBe(true);
  });

  it('exige los seis factores, sin repetir ni inventar', () => {
    expect(issuesAfter((rule) => rule.factors.splice(factorIndex(rule, 'HACCP'), 1))).toContain(
      'factors: Falta el factor HACCP',
    );
    expect(issuesAfter((rule) => rule.factors.push(cloneJson(rule.factors[1])))).toContain(
      'factors: Factor repetido: HACCP',
    );
    expect(issuesAfter((rule) => (rule.factors[1].code = 'TEMPERATURA'))).toContain(
      'factors[1].code: Factor desconocido: TEMPERATURA',
    );
  });

  it('el cumplimiento BPM tiene que ser un factor de rango', () => {
    const issues = issuesAfter((rule) => {
      const bpm = rule.factors[factorIndex(rule, 'CUMPLIMIENTO_BPM')];
      bpm.kind = 'OPCION';
      bpm.options = [{ code: 'ALTO', label: 'Alto', points: '1' }];
    });
    expect(issues.some((issue) => issue.includes('CUMPLIMIENTO_BPM debe ser RANGO'))).toBe(true);
  });

  it.each([
    ['un hueco', (b: Bands) => (b[1].range.max = '700000'), 'Hueco entre rangos'],
    ['un solapamiento', (b: Bands) => (b[2].range.min = '700000'), 'Rangos solapados'],
    ['un límite en dos tramos', (b: Bands) => (b[1].range.maxInclusive = true), 'Los dos rangos incluyen el límite'],
    ['un límite en ningún tramo', (b: Bands) => (b[2].range.minInclusive = false), 'Ningún rango incluye el límite'],
    ['un tope final', (b: Bands) => (b[3].range.max = '9000000'), 'Los rangos no cubren valores'],
    ['un inicio mayor que 0', (b: Bands) => (b[0].range.min = '10'), 'Los rangos no cubren desde 0'],
    ['un rango vacío', (b: Bands) => (b[0].range.max = '0'), 'Rango vacío'],
    ['un código repetido', (b: Bands) => (b[1].code = 'MICRO'), 'Código de tramo repetido'],
    ['puntos en cero', (b: Bands) => (b[1].points = '0'), 'Debe ser mayor que 0'],
  ])('detecta %s en los tramos de volumen', (_, change, message) => {
    const issues = issuesAfter((rule) => change(volume(rule).bands));
    expect(issues.some((issue) => issue.includes(message))).toBe(true);
  });

  it('detecta opciones repetidas o sin nombre', () => {
    const issues = issuesAfter((rule) => {
      const haccp = rule.factors[factorIndex(rule, 'HACCP')];
      haccp.options[1].code = haccp.options[0].code;
      haccp.options[2].label = '';
    });
    expect(issues).toContain('factors[1].options: Código de opción repetido: TODAS_LAS_LINEAS');
    expect(issues).toContain('factors[1].options[2].label: Debe ser un texto no vacío');
  });

  it('detecta problemas en los rangos de frecuencia', () => {
    expect(issuesAfter((rule) => (rule.frequencyRanges[1].range.min = '3.7'))).toEqual([
      'frequencyRanges[1].range: Hueco entre rangos: ≥ 1 y ≤ 3.6 / > 3.7 y ≤ 6.3',
    ]);
    expect(issuesAfter((rule) => (rule.frequencyRanges[2].level = 'MEDIO'))).toEqual(
      expect.arrayContaining(['frequencyRanges: Nivel repetido: MEDIO']),
    );
    expect(issuesAfter((rule) => (rule.frequencyRanges[0].months = 1.5))).toContain(
      'frequencyRanges[0].months: Debe ser un entero mayor que 0',
    );
    expect(issuesAfter((rule) => (rule.frequencyRanges[2].months = 24))).toEqual([
      'frequencyRanges[2].months: TRIMESTRAL corresponde a 3 meses',
    ]);
  });

  it('exige un rango por nivel y frecuencias crecientes con el riesgo', () => {
    expect(issuesAfter((rule) => rule.frequencyRanges.splice(2, 1))).toEqual(
      expect.arrayContaining(['frequencyRanges: Falta el rango del nivel ALTO']),
    );
    const inverted = issuesAfter((rule) => {
      rule.frequencyRanges[0].frequency = 'TRIMESTRAL';
      rule.frequencyRanges[0].months = 3;
      rule.frequencyRanges[2].frequency = 'ANUAL';
      rule.frequencyRanges[2].months = 12;
    });
    expect(inverted).toContain('frequencyRanges: La frecuencia SEMESTRAL no puede ir después de TRIMESTRAL');
  });

  it('exige que todo riesgo total posible tenga un rango', () => {
    const cheaper = issuesAfter((rule) => {
      for (const factor of rule.factors) {
        const rows = factor.kind === 'RANGO' ? factor.bands : factor.options;
        rows[0].points = '0.5';
      }
    });
    expect(cheaper).toEqual([
      'frequencyRanges: El riesgo total puede valer 0.5, que queda por debajo del primer rango (≥ 1 y ≤ 3.6)',
    ]);
    const lateStart = issuesAfter((rule) => (rule.frequencyRanges[0].range.min = '2'));
    expect(lateStart).toEqual([
      'frequencyRanges: El riesgo total puede valer 1, que queda por debajo del primer rango (≥ 2 y ≤ 3.6)',
    ]);
  });

  it('rechaza niveles que ninguna combinación puede alcanzar', () => {
    expect(issuesAfter((rule) => (rule.productRiskPoints = { BAJO: '4', MEDIO: '5', ALTO: '6' }))).toEqual([
      'frequencyRanges: El nivel BAJO no se puede alcanzar: el riesgo total va de 4 a 18',
    ]);
    expect(issuesAfter((rule) => (rule.productRiskPoints = { BAJO: '1', MEDIO: '2', ALTO: '2.1' }))).toEqual([
      'frequencyRanges: El nivel ALTO no se puede alcanzar: el riesgo total va de 1 a 6.3',
    ]);
    const bounds = compileRuleVersion(ruleV1()).totalRiskBounds;
    expect([bounds.min.toString(), bounds.max.toString()]).toEqual(['1', '9']);
  });

  it('acepta columnas vacías (null) en unit e integerOnly', () => {
    const issues = issuesAfter((rule) => {
      for (const factor of rule.factors) {
        if (factor.kind !== 'RANGO') continue;
        factor.unit ??= null;
        factor.integerOnly ??= null;
      }
    });
    expect(issues).toEqual([]);
  });

  it('valida el puntaje del riesgo del producto', () => {
    expect(issuesAfter((rule) => (rule.productRiskPoints.MEDIO = '1'))).toContain(
      'productRiskPoints.MEDIO: Debe ser mayor que el puntaje de BAJO',
    );
    expect(issuesAfter((rule) => (rule.productRiskPoints.BAJO = '0'))).toContain(
      'productRiskPoints.BAJO: Debe ser mayor que 0',
    );
    expect(issuesAfter((rule) => delete rule.productRiskPoints.ALTO)).toContain(
      'productRiskPoints.ALTO: Debe ser un número o un texto decimal',
    );
  });

  it('el factor BPM no admite integerOnly ni otra unidad', () => {
    const issues = issuesAfter((rule) => {
      const bpm = rule.factors[factorIndex(rule, 'CUMPLIMIENTO_BPM')];
      bpm.integerOnly = true;
      bpm.unit = 'puntos';
    });
    expect(issues).toEqual([
      'factors[2].integerOnly: El porcentaje BPM no tiene por qué ser entero',
      'factors[2].unit: La unidad del cumplimiento BPM es "%"',
    ]);
  });

  it('limita los decimales de pesos, puntos y límites', () => {
    expect(issuesAfter((rule) => (volume(rule).bands[1].points = '1.6666667'))).toEqual([
      'factors[0].bands[1].points: Admite como máximo 6 decimales',
    ]);
  });

  it('detecta niveles en desorden', () => {
    const issues = issuesAfter((rule) => {
      rule.frequencyRanges[0].level = 'ALTO';
      rule.frequencyRanges[2].level = 'BAJO';
    });
    expect(issues).toContain('frequencyRanges: El nivel MEDIO no puede ir después de ALTO');
  });

  it('valida el puntaje de las respuestas BPM', () => {
    expect(issuesAfter((rule) => (rule.bpmAnswerPoints.CP = '2'))).toContain(
      'bpmAnswerPoints.CP: Debe estar entre el puntaje de IT y el de C',
    );
    expect(issuesAfter((rule) => (rule.bpmAnswerPoints.IT = '1'))).toContain(
      'bpmAnswerPoints.IT: Debe ser menor que el puntaje de C',
    );
    expect(issuesAfter((rule) => (rule.bpmAnswerPoints.C = '0'))).toContain('bpmAnswerPoints.C: Debe ser mayor que 0');
  });

  it('valida los decimales de presentación y el estado', () => {
    expect(issuesAfter((rule) => (rule.display.riskDecimals = 11))).toEqual([
      'display.riskDecimals: Debe ser un entero entre 0 y 10',
    ]);
    expect(issuesAfter((rule) => (rule.status = 'ACTIVA'))).toEqual(['status: Debe ser BORRADOR o PUBLICADA']);
    expect(issuesAfter((rule) => (rule.id = ''))).toEqual(['id: Debe ser un texto no vacío']);
  });

  it.each([[null], [{}], [[]], ['regla']])('no se cae con una versión sin forma (%j)', (value) => {
    const issues = validateRuleVersion(value as unknown as RiskRuleVersion);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('compileRuleVersion lanza VERSION_INVALIDA con la lista de problemas', () => {
    const rule = ruleV1() as unknown as Mutable;
    volume(rule).weight = '0.2';
    const error = expectEngineError(() => compileRuleVersion(rule as RiskRuleVersion), 'VERSION_INVALIDA');
    expect(error.details.issues).toEqual([
      { path: 'factors', message: 'Los pesos suman 1.04; deben sumar exactamente 1' },
    ]);
  });
});

describe('Texto de los rangos', () => {
  const range = (min: string | null, minInclusive: boolean, max: string | null, maxInclusive: boolean) => ({
    min: min === null ? null : Decimal.parse(min),
    minInclusive,
    max: max === null ? null : Decimal.parse(max),
    maxInclusive,
  });

  it.each([
    [range('60', false, '70', true), { unit: '%' }, '> 60 % y ≤ 70 %'],
    [range(null, false, '60', true), { unit: '%' }, '≤ 60 %'],
    [range('200000', true, '800000', false), { unit: 'unidades por mes' }, '≥ 200,000 y < 800,000 unidades por mes'],
    [range('2000000', false, null, false), {}, '> 2,000,000'],
    [range('1', true, '2', false), { integerOnly: true }, '= 1'],
    [range('3', true, null, false), { integerOnly: true }, '≥ 3'],
    [range('0', false, '5', false), { integerOnly: true }, '≥ 1 y ≤ 4'],
    [range(null, false, null, false), {}, 'cualquier valor'],
  ])('%j → %s', (value, options, expected) => {
    expect(describeRange(value, options)).toBe(expected);
  });
});
