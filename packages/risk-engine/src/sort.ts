/** Comparaciones deterministas (no dependen del idioma del sistema). */

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const RUNS = /\d+|\D+/g;

/** Compara dos tramos de dígitos por su valor, sin pasar por Number (no pierde precisión). */
function compareDigitValues(a: string, b: string): number {
  const x = a.replace(/^0+(?=\d)/, '');
  const y = b.replace(/^0+(?=\d)/, '');
  return x.length - y.length || compareText(x, y);
}

/** Números antes que texto; los números por valor. */
function compareRuns(a: string, b: string): number {
  const digitsA = /^\d/.test(a);
  const digitsB = /^\d/.test(b);
  if (digitsA && digitsB) return compareDigitValues(a, b);
  if (digitsA !== digitsB) return digitsA ? -1 : 1;
  return compareText(a, b);
}

function compareSequences<T>(a: readonly T[], b: readonly T[], compare: (x: T, y: T) => number): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const difference = compare(a[i]!, b[i]!);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

const segmentRuns = (segment: string): string[] => segment.match(RUNS) ?? [];

/**
 * Orden natural de códigos jerárquicos: 1.2 < 1.10 < 2.
 * Primero compara los segmentos por su valor ("01" = "1") y, si empatan, por el texto.
 * Así el orden es siempre el mismo, sin importar el orden de entrada.
 */
export function compareCodes(a: string, b: string): number {
  const segmentsA = a.split('.').map(segmentRuns);
  const segmentsB = b.split('.').map(segmentRuns);
  return (
    compareSequences(segmentsA, segmentsB, (x, y) => compareSequences(x, y, compareRuns)) || compareText(a, b)
  );
}
