
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const RUNS = /\d+|\D+/g;

function compareDigitValues(a: string, b: string): number {
  const x = a.replace(/^0+(?=\d)/, '');
  const y = b.replace(/^0+(?=\d)/, '');
  return x.length - y.length || compareText(x, y);
}

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

export function compareCodes(a: string, b: string): number {
  const segmentsA = a.split('.').map(segmentRuns);
  const segmentsB = b.split('.').map(segmentRuns);
  return (
    compareSequences(segmentsA, segmentsB, (x, y) => compareSequences(x, y, compareRuns)) || compareText(a, b)
  );
}
