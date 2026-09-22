import { describe, expect, it } from 'vitest';
import { compareCodes } from '../src/sort.js';

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

describe('Orden natural de códigos', () => {
  it('ordena por valor numérico de cada segmento', () => {
    expect(['2', '1.10', '1.2', '1', '1.1.3', '1.1'].sort(compareCodes)).toEqual(['1', '1.1', '1.1.3', '1.2', '1.10', '2']);
  });

  it('da el mismo orden sin importar el orden de entrada, aunque haya letras', () => {
    const codes = ['4.10', '4.9', '4.1a', '4.1', '4.a', '4.01'];
    const orders = new Set(permutations(codes).map((order) => [...order].sort(compareCodes).join(' ')));
    expect(orders.size).toBe(1);
    expect([...orders][0]).toBe('4.01 4.1 4.1a 4.9 4.10 4.a');
  });

  it('compara segmentos numéricos largos sin perder precisión', () => {
    expect(compareCodes('1.12345678901234567890', '1.12345678901234567891')).toBeLessThan(0);
    expect(compareCodes('1.99999999999999999999', '1.100000000000000000000')).toBeLessThan(0);
  });
});
