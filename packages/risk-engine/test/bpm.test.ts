import { describe, expect, it } from 'vitest';
import { calculateBpmCompliance, Decimal, type BpmItemSnapshot } from '../src/index.js';
import { bpmItems, compiledV1, expectEngineError } from './helpers.js';

const points = compiledV1().bpmAnswerPoints;
const calculate = (items: BpmItemSnapshot[]) => calculateBpmCompliance(items, points);

describe('Cumplimiento BPM', () => {
  it('combina C, CP, IT y NA: NA no entra al denominador', () => {
    const result = calculate(bpmItems({ C: 2, CP: 1, IT: 1, NA: 2 }));
    expect(result.status).toBe('CALCULADO');
    expect(result.counts).toEqual({ C: 2, CP: 1, IT: 1, NA: 2 });
    expect(result.pointsObtained.toString()).toBe('2.5');
    expect(result.pointsPossible.toString()).toBe('4');
    expect(result.applicableItems).toBe(4);
    expect(result.percentage?.toText(10)).toEqual({ text: '62.5', exact: true });
    expect(result.excludedItems.map((item) => item.code)).toEqual(['1.5', '1.6']);
  });

  it('agregar ítems NA no cambia el porcentaje', () => {
    const without = calculate(bpmItems({ C: 7, CP: 2, IT: 3 }));
    const withNa = calculate(bpmItems({ C: 7, CP: 2, IT: 3, NA: 20 }));
    expect(withNa.percentage?.equals(without.percentage!)).toBe(true);
  });

  it('con todos los ítems NA no inventa un porcentaje', () => {
    const result = calculate(bpmItems({ NA: 45 }));
    expect(result.status).toBe('SIN_CRITERIOS_APLICABLES');
    expect(result.percentage).toBeNull();
    expect(result.pointsPossible.toString()).toBe('0');
    expect(result.excludedItems).toHaveLength(45);
  });

  it('una plantilla vacía tampoco tiene criterios aplicables', () => {
    expect(calculate([]).status).toBe('SIN_CRITERIOS_APLICABLES');
  });

  it('45 respuestas C dan 100 %', () => {
    expect(calculate(bpmItems({ C: 45 })).percentage?.toText(10).text).toBe('100');
  });

  it('guarda el porcentaje periódico con 10 decimales y lo muestra con 2 (25 puntos de 39)', () => {
    const result = calculate(bpmItems({ C: 21, CP: 8, IT: 10, NA: 6 }));
    expect(result.pointsObtained.toString()).toBe('25');
    expect(result.applicableItems).toBe(39);
    expect(result.percentage?.toText(10)).toEqual({ text: '64.1025641026', exact: false });
    expect(result.percentage?.toFixed(2)).toBe('64.10');
  });

  it('redondea la mitad hacia arriba al mostrar (0.5 de 16 = 3.125 %)', () => {
    const result = calculate(bpmItems({ CP: 1, IT: 15 }));
    expect(result.percentage?.toText(10).text).toBe('3.125');
    expect(result.percentage?.toFixed(2)).toBe('3.13');
  });

  it('el porcentaje no depende de la escala de puntos de la versión', () => {
    const doubled = { C: Decimal.parse('2'), CP: Decimal.ONE, IT: Decimal.ZERO };
    const items = bpmItems({ C: 5, CP: 3, IT: 2, NA: 1 });
    const base = calculate(items);
    const scaled = calculateBpmCompliance(items, doubled);
    expect(scaled.pointsObtained.toString()).toBe('13');
    expect(scaled.pointsPossible.toString()).toBe('20');
    expect(scaled.percentage?.equals(base.percentage!)).toBe(true);
  });

  it('ordena los NA excluidos por código natural', () => {
    const items: BpmItemSnapshot[] = [
      { itemId: 'a', code: '1.10', answer: 'NA' },
      { itemId: 'b', code: '1.2', answer: 'NA' },
      { itemId: 'c', code: '1.1', answer: 'NA' },
      { itemId: 'd', code: '2', answer: 'C' },
    ];
    expect(calculate(items).excludedItems.map((item) => item.code)).toEqual(['1.1', '1.2', '1.10']);
  });

  it('exige responder todos los ítems', () => {
    const items = bpmItems({ C: 3 });
    items.push({ itemId: 'x', code: '7.1', answer: null }, { itemId: 'y', code: '2.4', answer: null });
    const error = expectEngineError(() => calculate(items), 'RESPUESTAS_INCOMPLETAS');
    expect(error.details.items).toEqual([
      { itemId: 'y', code: '2.4' },
      { itemId: 'x', code: '7.1' },
    ]);
  });

  it('rechaza CP en un ítem que no lo admite', () => {
    const items: BpmItemSnapshot[] = [
      { itemId: 'a', code: '1.2.3', allowsPartial: false, answer: 'CP' },
      { itemId: 'b', code: '1.1', allowsPartial: true, answer: 'CP' },
    ];
    const error = expectEngineError(() => calculate(items), 'RESPUESTA_NO_PERMITIDA');
    expect(error.details.items).toEqual([{ itemId: 'a', code: '1.2.3' }]);
  });

  it('acepta C, IT y NA en ítems sin cumplimiento parcial', () => {
    const items: BpmItemSnapshot[] = [
      { itemId: 'a', code: '1', allowsPartial: false, answer: 'C' },
      { itemId: 'b', code: '2', allowsPartial: false, answer: 'IT' },
      { itemId: 'c', code: '3', allowsPartial: false, answer: 'NA' },
    ];
    expect(calculate(items).percentage?.toText(2).text).toBe('50');
  });

  it('un ítem sin la clave answer cuenta como sin responder', () => {
    const items = [{ itemId: 'a', code: '3.1' }] as unknown as BpmItemSnapshot[];
    const error = expectEngineError(() => calculate(items), 'RESPUESTAS_INCOMPLETAS');
    expect(error.details.items).toEqual([{ itemId: 'a', code: '3.1' }]);
  });

  it('allowsPartial en null equivale a permitir CP', () => {
    const items: BpmItemSnapshot[] = [{ itemId: 'a', code: '1', allowsPartial: null, answer: 'CP' }];
    expect(calculate(items).percentage?.toText(2).text).toBe('50');
  });

  it('el error de respuesta inválida no expone la constante BPM_ANSWERS', () => {
    const error = expectEngineError(
      () => calculate([{ itemId: 'a', code: '1', answer: 'X' } as unknown as BpmItemSnapshot]),
      'ENTRADA_INVALIDA',
    );
    (error.details.allowed as string[]).length = 0;
    expect(calculate(bpmItems({ C: 1 })).status).toBe('CALCULADO');
  });

  it('rechaza ítems repetidos', () => {
    const items = bpmItems({ C: 2 });
    items.push({ ...items[0]! });
    expectEngineError(() => calculate(items), 'ENTRADA_DUPLICADA');
  });

  it.each([
    ['respuesta desconocida', { itemId: 'a', code: '1', answer: 'X' }],
    ['sin itemId', { itemId: '', code: '1', answer: 'C' }],
    ['sin código', { itemId: 'a', code: ' ', answer: 'C' }],
    ['allowsPartial que no es booleano', { itemId: 'a', code: '1', allowsPartial: 'no', answer: 'C' }],
  ])('rechaza un ítem con %s', (_, item) => {
    expectEngineError(() => calculate([item as unknown as BpmItemSnapshot]), 'ENTRADA_INVALIDA');
  });

  it('rechaza una lista que no es lista', () => {
    expectEngineError(() => calculate({} as unknown as BpmItemSnapshot[]), 'ENTRADA_INVALIDA');
  });
});
