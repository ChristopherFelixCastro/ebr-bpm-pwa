/**
 * Aritmética decimal exacta.
 *
 * Los pesos, puntajes y límites se guardan como enteros (bigint) con una escala
 * decimal. Así 0.16 × 1.67 da 0.2672 exacto y el límite 3.6 se compara sin los
 * errores del punto flotante (en JavaScript, 0.1 + 0.2 no es 0.3).
 *
 * El porcentaje BPM se maneja como fracción (`Ratio`) porque puede ser periódico
 * (por ejemplo, 25 / 39). Solo se redondea al presentar o guardar el valor.
 *
 * Regla única de redondeo: HALF_UP (la mitad se aleja del cero): 3.125 → 3.13.
 */
import { RiskEngineError } from './errors.js';

/** Número o texto decimal. Se recomienda texto ("0.16") para no depender del punto flotante. */
export type DecimalInput = number | string;

const DECIMAL_PATTERN = /^([+-])?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;
/** Límites para no aceptar entradas desmedidas como "1e999999999". */
const MAX_TEXT_LENGTH = 200;
const MAX_DIGITS = 60;
const MAX_SCALE = 60;
const MAX_DECIMALS_ARGUMENT = 100;

const pow10 = (n: number): bigint => 10n ** BigInt(n);
const abs = (n: bigint): bigint => (n < 0n ? -n : n);
const sign = (n: bigint): bigint => (n < 0n ? -1n : n > 0n ? 1n : 0n);

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

/** Divide y redondea HALF_UP (la mitad se aleja del cero). `divisor` debe ser positivo. */
function divideHalfUp(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;
  return abs(remainder) * 2n >= divisor ? quotient + sign(dividend) : quotient;
}

function checkDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS_ARGUMENT) {
    throw new RiskEngineError('ENTRADA_INVALIDA', `Cantidad de decimales inválida: ${decimals}`, { decimals });
  }
}

function formatScaled(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = abs(units).toString();
  if (scale === 0) return (negative ? '-' : '') + digits;
  const padded = digits.padStart(scale + 1, '0');
  const integerPart = padded.slice(0, padded.length - scale);
  const fractionPart = padded.slice(padded.length - scale);
  return `${negative ? '-' : ''}${integerPart}.${fractionPart}`;
}

export class Decimal {
  private constructor(
    /** Valor multiplicado por 10^scale. */
    readonly units: bigint,
    /** Cantidad de decimales representados. */
    readonly scale: number,
  ) {}

  static readonly ZERO = new Decimal(0n, 0);
  static readonly ONE = new Decimal(1n, 0);
  static readonly HUNDRED = new Decimal(100n, 0);

  /** Convierte un número o un texto decimal. Lanza `ENTRADA_INVALIDA` si no es un decimal finito. */
  static parse(input: DecimalInput, field = 'valor'): Decimal {
    let text: string;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) {
        throw new RiskEngineError('ENTRADA_INVALIDA', `${field}: el número no es finito`, {
          field,
          value: String(input),
        });
      }
      text = String(input);
    } else if (typeof input === 'string') {
      text = input.trim();
    } else {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${field}: se esperaba un número o un texto decimal`, {
        field,
      });
    }

    const match = text.length > MAX_TEXT_LENGTH ? null : DECIMAL_PATTERN.exec(text);
    if (!match) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${field}: "${text}" no es un decimal válido`, {
        field,
        value: text,
      });
    }
    const [, signText, integerPart = '0', fractionPart = '', exponentText] = match;
    const exponent = exponentText === undefined ? 0 : Number(exponentText);
    const tooLarge = (): RiskEngineError =>
      new RiskEngineError('ENTRADA_INVALIDA', `${field}: "${text}" es demasiado grande o tiene demasiados decimales`, {
        field,
        value: text,
      });
    if (Math.abs(exponent) > MAX_SCALE + MAX_DIGITS) throw tooLarge();
    let units = BigInt(integerPart + fractionPart);
    let scale = fractionPart.length;
    if (exponent > 0) {
      if (exponent >= scale) {
        units *= pow10(exponent - scale);
        scale = 0;
      } else {
        scale -= exponent;
      }
    } else if (exponent < 0) {
      scale -= exponent;
    }
    if (signText === '-') units = -units;
    const value = new Decimal(units, scale).normalize();
    if (value.scale > MAX_SCALE || abs(value.units).toString().length > MAX_DIGITS) throw tooLarge();
    return value;
  }

  /**
   * Construye el valor units × 10^-scale sin pasar por texto (uso interno y para quien ya
   * tiene enteros exactos). No aplica los límites de `parse`.
   */
  static fromScaled(units: bigint, scale: number): Decimal {
    if (!Number.isSafeInteger(scale) || scale < 0) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `Escala inválida: ${scale}`, { scale });
    }
    return new Decimal(units, scale).normalize();
  }

  static fromInteger(value: number | bigint): Decimal {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${value} no es un entero seguro`, { value });
    }
    return new Decimal(BigInt(value), 0);
  }

  /** Quita los ceros finales de la parte decimal: 1.50 → 1.5. */
  private normalize(): Decimal {
    let { units, scale } = this;
    while (scale > 0 && units % 10n === 0n) {
      units /= 10n;
      scale -= 1;
    }
    return units === this.units && scale === this.scale ? this : new Decimal(units, scale);
  }

  private align(other: Decimal): [bigint, bigint, number] {
    const scale = Math.max(this.scale, other.scale);
    return [this.units * pow10(scale - this.scale), other.units * pow10(scale - other.scale), scale];
  }

  add(other: Decimal): Decimal {
    const [a, b, scale] = this.align(other);
    return new Decimal(a + b, scale).normalize();
  }

  subtract(other: Decimal): Decimal {
    const [a, b, scale] = this.align(other);
    return new Decimal(a - b, scale).normalize();
  }

  multiply(other: Decimal): Decimal {
    return new Decimal(this.units * other.units, this.scale + other.scale).normalize();
  }

  /** -1, 0 o 1. */
  compare(other: Decimal): -1 | 0 | 1 {
    const [a, b] = this.align(other);
    return a < b ? -1 : a > b ? 1 : 0;
  }

  equals(other: Decimal): boolean {
    return this.compare(other) === 0;
  }

  isInteger(): boolean {
    return this.scale === 0;
  }

  isNegative(): boolean {
    return this.units < 0n;
  }

  isPositive(): boolean {
    return this.units > 0n;
  }

  /** Mayor entero que no supera el valor. */
  floor(): Decimal {
    if (this.scale === 0) return this;
    const divisor = pow10(this.scale);
    const quotient = this.units / divisor;
    return new Decimal(this.units < 0n && this.units % divisor !== 0n ? quotient - 1n : quotient, 0);
  }

  /** Menor entero que no es menor que el valor. */
  ceil(): Decimal {
    if (this.scale === 0) return this;
    const divisor = pow10(this.scale);
    const quotient = this.units / divisor;
    return new Decimal(this.units > 0n && this.units % divisor !== 0n ? quotient + 1n : quotient, 0);
  }

  /** Redondea HALF_UP a `decimals` posiciones. */
  round(decimals: number): Decimal {
    checkDecimals(decimals);
    if (this.scale <= decimals) return this;
    const units = divideHalfUp(this.units, pow10(this.scale - decimals));
    return new Decimal(units, decimals).normalize();
  }

  /** Texto con exactamente `decimals` posiciones, redondeado HALF_UP. */
  toFixed(decimals: number): string {
    checkDecimals(decimals);
    const rounded = this.round(decimals);
    return formatScaled(rounded.units * pow10(decimals - rounded.scale), decimals);
  }

  /** Representación exacta, sin ceros finales. */
  toString(): string {
    return formatScaled(this.units, this.scale);
  }

  toJSON(): string {
    return this.toString();
  }

  toRatio(): Ratio {
    return Ratio.of(this.units, pow10(this.scale));
  }
}

/** Fracción exacta, con denominador positivo y reducida. */
export class Ratio {
  private constructor(
    readonly numerator: bigint,
    readonly denominator: bigint,
  ) {}

  static of(numerator: bigint, denominator: bigint): Ratio {
    if (denominator === 0n) {
      throw new RiskEngineError('ENTRADA_INVALIDA', 'División entre cero');
    }
    const s = sign(denominator);
    const divisor = gcd(numerator, denominator) || 1n;
    return new Ratio((numerator * s) / divisor, (denominator * s) / divisor);
  }

  /** a / b sin perder precisión. */
  static divide(a: Decimal, b: Decimal): Ratio {
    const ra = a.toRatio();
    const rb = b.toRatio();
    return Ratio.of(ra.numerator * rb.denominator, ra.denominator * rb.numerator);
  }

  multiply(other: Decimal | Ratio): Ratio {
    const r = other instanceof Decimal ? other.toRatio() : other;
    return Ratio.of(this.numerator * r.numerator, this.denominator * r.denominator);
  }

  compare(other: Decimal | Ratio): -1 | 0 | 1 {
    const r = other instanceof Decimal ? other.toRatio() : other;
    const a = this.numerator * r.denominator;
    const b = r.numerator * this.denominator;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  equals(other: Decimal | Ratio): boolean {
    return this.compare(other) === 0;
  }

  isNegative(): boolean {
    return this.numerator < 0n;
  }

  isInteger(): boolean {
    return this.denominator === 1n;
  }

  /** ¿Se escribe con una cantidad finita de decimales? (el denominador solo tiene factores 2 y 5) */
  isTerminating(): boolean {
    let d = this.denominator;
    while (d % 2n === 0n) d /= 2n;
    while (d % 5n === 0n) d /= 5n;
    return d === 1n;
  }

  /** Decimal redondeado HALF_UP a `decimals` posiciones. */
  toDecimal(decimals: number): Decimal {
    checkDecimals(decimals);
    const units = divideHalfUp(this.numerator * pow10(decimals), this.denominator);
    return Decimal.fromScaled(units, decimals);
  }

  /** Texto con exactamente `decimals` posiciones, redondeado HALF_UP. */
  toFixed(decimals: number): string {
    return this.toDecimal(decimals).toFixed(decimals);
  }

  /**
   * Valor exacto si la fracción es un decimal finito; si no, `maxDecimals` posiciones con HALF_UP.
   * Devuelve también si el texto es exacto.
   */
  toText(maxDecimals: number): { text: string; exact: boolean } {
    checkDecimals(maxDecimals);
    if (this.isTerminating()) {
      // Un denominador 2^a·5^b necesita max(a, b) decimales.
      let decimals = 0;
      let d = this.denominator;
      let twos = 0;
      let fives = 0;
      while (d % 2n === 0n) {
        d /= 2n;
        twos += 1;
      }
      while (d % 5n === 0n) {
        d /= 5n;
        fives += 1;
      }
      decimals = Math.max(twos, fives);
      const units = (this.numerator * pow10(decimals)) / this.denominator;
      return { text: Decimal.fromScaled(units, decimals).toString(), exact: true };
    }
    return { text: this.toDecimal(maxDecimals).toString(), exact: false };
  }
}
