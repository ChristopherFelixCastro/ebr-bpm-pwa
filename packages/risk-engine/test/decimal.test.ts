import { describe, expect, it } from 'vitest';
import { Decimal, Ratio } from '../src/index.js';
import { expectEngineError } from './helpers.js';

const d = (value: string | number) => Decimal.parse(value);

describe('Decimal', () => {
  it.each([
    ['0.16', '0.16'],
    ['1.50', '1.5'],
    ['007', '7'],
    ['1e3', '1000'],
    ['1.2345e2', '123.45'],
    ['1e-7', '0.0000001'],
    [-2.5, '-2.5'],
    [' 3.6 ', '3.6'],
    [0, '0'],
  ])('convierte %s → %s', (input, expected) => {
    expect(d(input).toString()).toBe(expected);
  });

  it.each(['', 'abc', '1.2.3', '1,67', '.5', 'NaN'])('rechaza el texto "%s"', (input) => {
    expectEngineError(() => d(input), 'ENTRADA_INVALIDA');
  });

  it.each(['1e999999999', '1e-61', '1'.repeat(61)])('rechaza entradas desmedidas (%s)', (input) => {
    expectEngineError(() => d(input), 'ENTRADA_INVALIDA');
  });

  it('acepta números grandes razonables y su texto se puede volver a leer', () => {
    expect(d('1e59').toString()).toBe(`1${'0'.repeat(59)}`);
    expect(d('9'.repeat(60)).toString()).toBe('9'.repeat(60));
    const tiny = d(`0.${'0'.repeat(59)}1`);
    expect(d(tiny.toString()).equals(tiny)).toBe(true);
    expectEngineError(() => d('1e60'), 'ENTRADA_INVALIDA');
  });

  it.each([-1, 1.5, 101, Number.NaN])('rechaza %s como cantidad de decimales', (decimals) => {
    expectEngineError(() => d('1.25').toFixed(decimals), 'ENTRADA_INVALIDA');
    expectEngineError(() => d('1.25').round(decimals), 'ENTRADA_INVALIDA');
  });

  it('fromScaled construye sin pasar por texto', () => {
    expect(Decimal.fromScaled(13931n, 4).toString()).toBe('1.3931');
    expect(Decimal.fromScaled(1500n, 3).toString()).toBe('1.5');
    expectEngineError(() => Decimal.fromScaled(1n, -1), 'ENTRADA_INVALIDA');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rechaza el número %s', (input) => {
    expectEngineError(() => d(input), 'ENTRADA_INVALIDA');
  });

  it('suma y multiplica sin errores de punto flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(d('0.1').add(d('0.2')).toString()).toBe('0.3');
    expect(d('0.16').multiply(d('1.67')).toString()).toBe('0.2672');

    const weights = ['0.16', '0.09', '0.56', '0.05', '0.06', '0.08'];
    expect(weights.reduce((sum, w) => sum + Number(w), 0)).not.toBe(1);
    expect(weights.reduce((sum, w) => sum.add(d(w)), Decimal.ZERO).equals(Decimal.ONE)).toBe(true);
  });

  it('compara valores con distinta escala', () => {
    expect(d('3.60').compare(d('3.6'))).toBe(0);
    expect(d('3.6001').compare(d('3.6'))).toBe(1);
    expect(d('-1').compare(d('0.5'))).toBe(-1);
  });

  it.each([
    ['3.125', 2, '3.13'],
    ['2.675', 2, '2.68'],
    ['1.005', 2, '1.01'],
    ['-3.125', 2, '-3.13'],
    ['3.124', 2, '3.12'],
    ['2', 2, '2.00'],
    ['0.5', 0, '1'],
  ])('redondea HALF_UP %s a %i decimales → %s', (value, decimals, expected) => {
    expect(d(value).toFixed(decimals)).toBe(expected);
  });

  it('el redondeo con número de JavaScript daría otro resultado', () => {
    expect((2.675).toFixed(2)).toBe('2.67');
    expect(d('2.675').toFixed(2)).toBe('2.68');
  });

  it.each([
    ['2.5', '2', '3'],
    ['-2.5', '-3', '-2'],
    ['3', '3', '3'],
    ['0.001', '0', '1'],
  ])('floor y ceil de %s', (value, floor, ceil) => {
    expect(d(value).floor().toString()).toBe(floor);
    expect(d(value).ceil().toString()).toBe(ceil);
  });
});

describe('Ratio', () => {
  it('mantiene el porcentaje periódico exacto y solo redondea al mostrar', () => {
    const percentage = Ratio.divide(d('25'), d('39')).multiply(Decimal.HUNDRED);
    expect(percentage.toFixed(2)).toBe('64.10');
    expect(percentage.toText(10)).toEqual({ text: '64.1025641026', exact: false });
    expect(percentage.compare(d('64.1025641026'))).toBe(-1);
    expect(percentage.compare(d('64.1025641025'))).toBe(1);
  });

  it('da el texto exacto cuando la fracción es un decimal finito', () => {
    expect(Ratio.of(1n, 8n).toText(2)).toEqual({ text: '0.125', exact: true });
    expect(Ratio.divide(d('2.5'), d('4')).multiply(Decimal.HUNDRED).toText(10)).toEqual({ text: '62.5', exact: true });
    expect(Ratio.of(-6n, -4n).toText(10)).toEqual({ text: '1.5', exact: true });
  });

  it('compara contra decimales', () => {
    expect(Ratio.of(3n, 5n).multiply(Decimal.HUNDRED).equals(d('60'))).toBe(true);
    expect(Ratio.of(2n, 3n).compare(d('0.6667'))).toBe(-1);
  });

  it('redondea fracciones con denominadores enormes sin límite de dígitos', () => {
    const huge = Ratio.of(1n, 10n ** 80n + 1n).multiply(Decimal.HUNDRED);
    expect(huge.toFixed(2)).toBe('0.00');
    expect(huge.toText(10)).toEqual({ text: '0', exact: false });
    expect(Ratio.of(1n, 2n ** 70n).toText(10).exact).toBe(true);
  });

  it('no permite dividir entre cero', () => {
    expectEngineError(() => Ratio.divide(d('1'), Decimal.ZERO), 'ENTRADA_INVALIDA');
  });
});
