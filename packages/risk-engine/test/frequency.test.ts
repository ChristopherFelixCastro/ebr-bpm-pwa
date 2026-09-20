import { describe, expect, it } from 'vitest';
import { calculateTotalRisk, classifyTotalRisk, Decimal } from '../src/index.js';
import { compiledV1, expectEngineError } from './helpers.js';

const rule = compiledV1();
const d = (value: string) => Decimal.parse(value);

describe('Riesgo total y frecuencia', () => {
  it.each([
    ['1', 'BAJO', 'ANUAL', 12],
    ['3.5997', 'BAJO', 'ANUAL', 12],
    ['3.6', 'BAJO', 'ANUAL', 12],
    ['3.6000001', 'MEDIO', 'SEMESTRAL', 6],
    ['4.1793', 'MEDIO', 'SEMESTRAL', 6],
    ['6.3', 'MEDIO', 'SEMESTRAL', 6],
    ['6.3000001', 'ALTO', 'TRIMESTRAL', 3],
    ['9', 'ALTO', 'TRIMESTRAL', 3],
  ])('RT %s → %s, %s (%i meses)', (value, level, frequency, months) => {
    const range = classifyTotalRisk(rule, d(value));
    expect([range.level, range.frequency, range.months]).toEqual([level, frequency, months]);
  });

  it('un RT menor que el primer rango es un error de datos, no un nivel inventado', () => {
    expectEngineError(() => classifyTotalRisk(rule, d('0.99')), 'RIESGO_TOTAL_SIN_RANGO');
  });

  it('multiplica sin errores de punto flotante en el límite 6.3', () => {
    expect(3 * 2.1).toBeGreaterThan(6.3);
    const total = calculateTotalRisk(rule, d('3'), d('2.1'));
    expect(total.value.toString()).toBe('6.3');
    expect(total.range.frequency).toBe('SEMESTRAL');
  });

  it('caso de referencia: 3 × 1.3931 = 4.1793 → semestral', () => {
    const total = calculateTotalRisk(rule, d('3'), d('1.3931'));
    expect(total.value.toString()).toBe('4.1793');
    expect(total.range.level).toBe('MEDIO');
  });
});
