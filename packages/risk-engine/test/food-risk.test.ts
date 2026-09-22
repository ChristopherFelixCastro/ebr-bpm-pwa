import { describe, expect, it } from 'vitest';
import { calculateProductRisk as calculate, type FoodSubcategorySnapshot } from '../src/index.js';
import { compiledV1, expectEngineError, subcategory } from './helpers.js';

const points = compiledV1().productRiskPoints;
const calculateProductRisk = (rows: FoodSubcategorySnapshot[]) => calculate(rows, points);

describe('Riesgo del producto', () => {
  it('toma el mayor puntaje aplicable y deja fuera los NA', () => {
    const result = calculateProductRisk([
      subcategory('queso', 'MEDIO'),
      subcategory('pure', null, 'Frutas'),
      subcategory('leche', 'ALTO'),
      subcategory('pan', 'BAJO', 'Panadería'),
    ]);
    expect(result.status).toBe('CALCULADO');
    expect(result.score?.toString()).toBe('3');
    expect(result.level).toBe('ALTO');
    expect(result.determinedBy.map((row) => row.subcategoryId)).toEqual(['leche']);
    expect(result.excluded.map((row) => row.subcategoryId)).toEqual(['pure']);
    expect(result.applicable).toHaveLength(3);
  });

  it('sin subcategorías de riesgo alto el máximo es medio', () => {
    const result = calculateProductRisk([subcategory('pan', 'BAJO'), subcategory('queso', 'MEDIO')]);
    expect(result.score?.toString()).toBe('2');
    expect(result.level).toBe('MEDIO');
  });

  it('si varias empatan en el máximo, las lista todas', () => {
    const result = calculateProductRisk([
      subcategory('yogur', 'ALTO'),
      subcategory('embutido', 'ALTO', 'Cárnicos'),
      subcategory('pan', 'BAJO'),
    ]);
    expect(result.determinedBy.map((row) => row.subcategoryId)).toEqual(['embutido', 'yogur']);
  });

  it('si ninguna aplica no inventa un puntaje (ni cero)', () => {
    const result = calculateProductRisk([subcategory('pure', null), subcategory('pulpa', null)]);
    expect(result.status).toBe('SIN_RIESGO_PRODUCTO_APLICABLE');
    expect(result.score).toBeNull();
    expect(result.level).toBeNull();
    expect(result.determinedBy).toEqual([]);
    expect(result.excluded).toHaveLength(2);
  });

  it('una lista vacía tampoco tiene riesgo aplicable', () => {
    expect(calculateProductRisk([]).status).toBe('SIN_RIESGO_PRODUCTO_APLICABLE');
  });

  it('el orden de entrada no cambia el resultado', () => {
    const rows = [subcategory('c', 'BAJO'), subcategory('a', 'ALTO'), subcategory('b', null), subcategory('d', 'ALTO')];
    expect(calculateProductRisk([...rows].reverse())).toEqual(calculateProductRisk(rows));
  });

  it.each([
    ['nivel sin puntaje', { ...subcategory('x', 'ALTO'), score: null }],
    ['puntaje sin nivel', { ...subcategory('x', null), score: '2' }],
  ])('rechaza un %s', (_, row) => {
    expectEngineError(() => calculateProductRisk([row]), 'CATALOGO_INCONSISTENTE');
  });

  it.each([
    ['ALTO con puntaje 1', { ...subcategory('a', 'ALTO'), score: '1' }],
    ['BAJO con puntaje 7', { ...subcategory('a', 'BAJO'), score: '7' }],
    ['MEDIO con puntaje 2.5', { ...subcategory('a', 'MEDIO'), score: 2.5 }],
    ['BAJO con puntaje 0', { ...subcategory('a', 'BAJO'), score: '0' }],
    ['BAJO con puntaje negativo', { ...subcategory('a', 'BAJO'), score: -1 }],
  ])('rechaza un puntaje que no es el oficial (%s)', (_, row) => {
    const error = expectEngineError(() => calculateProductRisk([row]), 'CATALOGO_INCONSISTENTE');
    expect(error.details).toMatchObject({ subcategoryId: 'a' });
  });

  it('acepta el puntaje oficial como número o como texto', () => {
    const rows = [{ ...subcategory('a', 'ALTO'), score: 3 }, { ...subcategory('b', 'MEDIO'), score: '2.0' }];
    expect(calculateProductRisk(rows).score?.toString()).toBe('3');
  });

  it.each([
    ['texto vacío', { ...subcategory('a', 'ALTO'), microbiologicalRisk: '', score: '' }],
    ['claves ausentes', { subcategoryId: 'a', subcategoryName: 'Purés', categoryName: 'Frutas' }],
    ['espacios', { ...subcategory('a', 'ALTO'), microbiologicalRisk: ' ', score: null }],
  ])('un valor vacío en la matriz (%s) equivale a No aplica', (_, row) => {
    const result = calculateProductRisk([row as unknown as FoodSubcategorySnapshot, subcategory('b', 'BAJO')]);
    expect(result.excluded.map((excluded) => excluded.subcategoryId)).toEqual(['a']);
    expect(result.score?.toString()).toBe('1');
  });

  it('rechaza subcategorías repetidas', () => {
    expectEngineError(() => calculateProductRisk([subcategory('a', 'ALTO'), subcategory('a', 'ALTO')]), 'ENTRADA_DUPLICADA');
  });

  it.each([
    ['puntaje no numérico', { ...subcategory('a', 'BAJO'), score: 'alto' }],
    ['nivel desconocido', { ...subcategory('a', 'BAJO'), microbiologicalRisk: 'MUY_ALTO' }],
    ['sin nombre', { ...subcategory('a', 'BAJO'), subcategoryName: '' }],
  ])('rechaza una fila con %s', (_, row) => {
    expectEngineError(() => calculateProductRisk([row as FoodSubcategorySnapshot]), 'ENTRADA_INVALIDA');
  });
});
