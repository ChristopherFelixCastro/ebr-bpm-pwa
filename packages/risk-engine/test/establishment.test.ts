import { describe, expect, it } from 'vitest';
import {
  calculateEstablishmentRisk,
  Decimal,
  Ratio,
  type FactorAnswers,
  type FactorCalculation,
} from '../src/index.js';
import { compiledV1, expectEngineError, referenceAnswers } from './helpers.js';

const rule = compiledV1();
const percent = (value: string) => Decimal.parse(value).toRatio();
const PERCENT_85 = percent('85');

const calculate = (answers: FactorAnswers, bpm: Ratio | null = PERCENT_85) =>
  calculateEstablishmentRisk(rule, answers, bpm);

const factor = (factors: FactorCalculation[], code: string) => factors.find((f) => f.factor.code === code)!;

const allOptions = (volume: string, rejections: number, option: 'best' | 'worst'): FactorAnswers => ({
  VOLUMEN_PRODUCCION: { value: volume },
  HACCP: { option: option === 'best' ? 'TODAS_LAS_LINEAS' : 'NO_IMPLEMENTADO' },
  PROVEEDOR_INABIE: { option: option === 'best' ? 'NO_SUPLIDOR' : 'NACIONAL' },
  RECHAZOS_SANITARIOS: { value: rejections },
  PLAN_MUESTREO: { option: option === 'best' ? 'COMPLETO' : 'INEXISTENTE' },
});

describe('Riesgo del establecimiento', () => {
  it('caso de referencia: RE = 1.3931', () => {
    const result = calculate(referenceAnswers());
    expect(result.status).toBe('CALCULADO');
    expect(result.total?.toString()).toBe('1.3931');
    expect(
      result.factors.map((f) => [f.factor.code, f.selected?.code, f.points?.toString(), f.contribution?.toString()]),
    ).toEqual([
      ['VOLUMEN_PRODUCCION', 'MICRO', '1', '0.16'],
      ['HACCP', 'NO_IMPLEMENTADO', '3', '0.27'],
      ['CUMPLIMIENTO_BPM', 'MAS_DE_80', '1', '0.56'],
      ['PROVEEDOR_INABIE', 'REGIONAL', '2.33', '0.1165'],
      ['RECHAZOS_SANITARIOS', 'UNO', '1.67', '0.1002'],
      ['PLAN_MUESTREO', 'MATERIAS_PRIMAS', '2.33', '0.1864'],
    ]);
  });

  it('el mejor caso da 1 y el peor da 3', () => {
    expect(calculate(allOptions('1000', 0, 'best'), percent('100')).total?.toString()).toBe('1');
    expect(calculate(allOptions('5000000', 7, 'worst'), percent('10')).total?.toString()).toBe('3');
  });

  it.each([
    ['0', 'MICRO'],
    ['199999', 'MICRO'],
    ['199999.99', 'MICRO'],
    ['200000', 'PEQUENO'],
    ['799000', 'PEQUENO'],
    ['799500', 'PEQUENO'],
    ['799999.99', 'PEQUENO'],
    ['800000', 'MEDIANO'],
    ['2000000', 'MEDIANO'],
    ['2000000.01', 'GRANDE'],
    ['15000000', 'GRANDE'],
  ])('volumen %s → %s', (volume, band) => {
    const answers = { ...referenceAnswers(), VOLUMEN_PRODUCCION: { value: volume } };
    expect(factor(calculate(answers).factors, 'VOLUMEN_PRODUCCION').selected?.code).toBe(band);
  });

  it('acepta el volumen como número o como texto', () => {
    const asText = calculate({ ...referenceAnswers(), VOLUMEN_PRODUCCION: { value: '850000' } });
    const asNumber = calculate({ ...referenceAnswers(), VOLUMEN_PRODUCCION: { value: 850000 } });
    expect(asNumber.total?.toString()).toBe(asText.total?.toString());
  });

  it.each([
    ['0', Ratio.of(0n, 1n), 'HASTA_60', '3'],
    ['60', percent('60'), 'HASTA_60', '3'],
    ['60.01', Ratio.of(6001n, 100n), 'DE_60_A_70', '2.33'],
    ['70', percent('70'), 'DE_60_A_70', '2.33'],
    ['70.05', Ratio.of(1401n, 20n), 'DE_70_A_80', '1.67'],
    ['80', percent('80'), 'DE_70_A_80', '1.67'],
    ['80.333…', Ratio.of(241n, 3n), 'MAS_DE_80', '1'],
    ['100', percent('100'), 'MAS_DE_80', '1'],
  ])('BPM %s %% → %s (%s puntos)', (_, bpm, band, points) => {
    const bpmFactor = factor(calculate(referenceAnswers(), bpm).factors, 'CUMPLIMIENTO_BPM');
    expect(bpmFactor.selected?.code).toBe(band);
    expect(bpmFactor.points?.toString()).toBe(points);
  });

  it('un porcentaje periódico apenas encima de 80 cuenta como más de 80', () => {
    const bpmFactor = factor(calculate(referenceAnswers(), Ratio.of(241n, 3n)).factors, 'CUMPLIMIENTO_BPM');
    expect(bpmFactor.input).toMatchObject({ kind: 'VALOR' });
    expect(bpmFactor.selected?.code).toBe('MAS_DE_80');
  });

  it.each([
    [0, 'NINGUNO'],
    [1, 'UNO'],
    [2, 'DOS'],
    [3, 'MAS_DE_DOS'],
    [10, 'MAS_DE_DOS'],
    ['2', 'DOS'],
  ])('%s rechazos → %s', (rejections, band) => {
    const answers = { ...referenceAnswers(), RECHAZOS_SANITARIOS: { value: rejections } };
    expect(factor(calculate(answers).factors, 'RECHAZOS_SANITARIOS').selected?.code).toBe(band);
  });

  it('los rechazos deben ser enteros', () => {
    const answers = { ...referenceAnswers(), RECHAZOS_SANITARIOS: { value: 1.5 } };
    expectEngineError(() => calculate(answers), 'ENTRADA_INVALIDA');
  });

  it.each([
    ['VOLUMEN_PRODUCCION', -1],
    ['RECHAZOS_SANITARIOS', -2],
  ])('%s negativo queda fuera de todo tramo', (code, value) => {
    const answers = { ...referenceAnswers(), [code]: { value } };
    const error = expectEngineError(() => calculate(answers), 'VALOR_FUERA_DE_RANGO');
    expect(error.details.factor).toBe(code);
  });

  it('rechaza una opción que no existe en la versión', () => {
    const answers = { ...referenceAnswers(), HACCP: { option: 'PARCIAL' } };
    const error = expectEngineError(() => calculate(answers), 'OPCION_DESCONOCIDA');
    expect(error.details.allowed).toEqual(['TODAS_LAS_LINEAS', 'LINEAS_75', 'LINEAS_25', 'NO_IMPLEMENTADO']);
  });

  it('una clave en undefined cuenta como ausente', () => {
    const answers = {
      ...referenceAnswers(),
      HACCP: { option: 'NO_IMPLEMENTADO', value: undefined },
      VOLUMEN_PRODUCCION: { value: '150000', option: undefined },
    } as unknown as FactorAnswers;
    expect(calculate(answers).total?.toString()).toBe('1.3931');
  });

  it('exige la respuesta de cada factor', () => {
    const answers = referenceAnswers();
    delete answers.PLAN_MUESTREO;
    const error = expectEngineError(() => calculate(answers), 'FACTOR_SIN_RESPUESTA');
    expect(error.details.factor).toBe('PLAN_MUESTREO');
  });

  it.each([
    ['un valor en un factor de opción', { HACCP: { value: 3 } }],
    ['una opción en un factor de rango', { VOLUMEN_PRODUCCION: { option: 'MICRO' } }],
    ['valor y opción a la vez', { HACCP: { option: 'NO_IMPLEMENTADO', value: 3 } }],
    ['una respuesta que no es objeto', { HACCP: 'NO_IMPLEMENTADO' }],
    ['un volumen no numérico', { VOLUMEN_PRODUCCION: { value: 'mucho' } }],
    ['el cumplimiento BPM contestado a mano', { CUMPLIMIENTO_BPM: { value: 90 } }],
    ['un factor desconocido', { TEMPERATURA: { value: 4 } }],
  ])('rechaza %s', (_, patch) => {
    const answers = { ...referenceAnswers(), ...patch } as unknown as FactorAnswers;
    expectEngineError(() => calculate(answers), 'ENTRADA_INVALIDA');
  });

  it('sin porcentaje BPM no calcula el RE, pero puntúa los demás factores', () => {
    const result = calculate(referenceAnswers(), null);
    expect(result.status).toBe('SIN_CUMPLIMIENTO_BPM');
    expect(result.total).toBeNull();
    const bpm = factor(result.factors, 'CUMPLIMIENTO_BPM');
    expect(bpm.input).toEqual({ kind: 'SIN_VALOR' });
    expect(bpm.points).toBeNull();
    expect(factor(result.factors, 'HACCP').points?.toString()).toBe('3');
  });
});
