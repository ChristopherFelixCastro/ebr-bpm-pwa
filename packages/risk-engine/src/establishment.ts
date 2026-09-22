import { Decimal, Ratio, type DecimalInput } from './decimal.js';
import { RiskEngineError } from './errors.js';
import {
  rangeContains,
  type CompiledBand,
  type CompiledFactor,
  type CompiledOption,
  type CompiledOptionFactor,
  type CompiledRangeFactor,
  type CompiledRuleVersion,
} from './rules.js';
import { FACTOR_CODES, type AnsweredFactorCode, type FactorAnswers } from './types.js';

export type FactorInput =
  | { kind: 'VALOR'; value: Decimal | Ratio }
  | { kind: 'OPCION'; option: string }
  | { kind: 'SIN_VALOR' };

export interface FactorCalculation {
  factor: CompiledFactor;
  input: FactorInput;
  selected: CompiledBand | CompiledOption | null;
  points: Decimal | null;
  contribution: Decimal | null;
}

export interface EstablishmentCalculation {
  status: 'CALCULADO' | 'SIN_CUMPLIMIENTO_BPM';
  factors: FactorCalculation[];
  total: Decimal | null;
}

export function selectBand(factor: CompiledRangeFactor, value: Decimal | Ratio): CompiledBand {
  const band = factor.bands.find((candidate) => rangeContains(candidate.range, value));
  if (band === undefined) {
    const text = value instanceof Decimal ? value.toString() : value.toText(4).text;
    throw new RiskEngineError('VALOR_FUERA_DE_RANGO', `${factor.name}: ningún tramo contiene el valor ${text}`, {
      factor: factor.code,
      value: text,
    });
  }
  return band;
}

export function selectOption(factor: CompiledOptionFactor, code: string): CompiledOption {
  const option = factor.options.find((candidate) => candidate.code === code);
  if (option === undefined) {
    throw new RiskEngineError('OPCION_DESCONOCIDA', `${factor.name}: la opción "${code}" no existe en la versión`, {
      factor: factor.code,
      option: code,
      allowed: factor.options.map((candidate) => candidate.code),
    });
  }
  return option;
}

function readAnswer(factor: CompiledFactor, answers: FactorAnswers): FactorCalculation {
  const answer = answers[factor.code as AnsweredFactorCode];
  if (answer === undefined || answer === null) {
    throw new RiskEngineError('FACTOR_SIN_RESPUESTA', `Falta la respuesta del factor ${factor.name}`, {
      factor: factor.code,
    });
  }
  if (typeof answer !== 'object') {
    throw new RiskEngineError('ENTRADA_INVALIDA', `La respuesta de ${factor.name} debe ser un objeto`, {
      factor: factor.code,
    });
  }

  const given = answer as { value?: unknown; option?: unknown };
  const hasValue = given.value !== undefined;
  const hasOption = given.option !== undefined;

  if (factor.kind === 'RANGO') {
    if (!hasValue || hasOption) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${factor.name} espera { value } con un número`, {
        factor: factor.code,
      });
    }
    const value = Decimal.parse(given.value as DecimalInput, `factorAnswers.${factor.code}.value`);
    if (factor.integerOnly && !value.isInteger()) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `${factor.name} debe ser un número entero`, {
        factor: factor.code,
        value: value.toString(),
      });
    }
    const band = selectBand(factor, value);
    return {
      factor,
      input: { kind: 'VALOR', value },
      selected: band,
      points: band.points,
      contribution: band.points.multiply(factor.weight),
    };
  }

  if (!hasOption || hasValue || typeof given.option !== 'string') {
    throw new RiskEngineError('ENTRADA_INVALIDA', `${factor.name} espera { option } con el código de una opción`, {
      factor: factor.code,
    });
  }
  const option = selectOption(factor, given.option);
  return {
    factor,
    input: { kind: 'OPCION', option: given.option },
    selected: option,
    points: option.points,
    contribution: option.points.multiply(factor.weight),
  };
}

export function calculateEstablishmentRisk(
  rule: CompiledRuleVersion,
  answers: FactorAnswers,
  bpmPercentage: Ratio | null,
): EstablishmentCalculation {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    throw new RiskEngineError('ENTRADA_INVALIDA', 'factorAnswers debe ser un objeto');
  }
  for (const key of Object.keys(answers)) {
    if (key === 'CUMPLIMIENTO_BPM') {
      throw new RiskEngineError(
        'ENTRADA_INVALIDA',
        'CUMPLIMIENTO_BPM no se contesta: el motor lo toma del porcentaje de la ficha',
        { factor: key },
      );
    }
    if (!(FACTOR_CODES as readonly string[]).includes(key)) {
      throw new RiskEngineError('ENTRADA_INVALIDA', `Factor desconocido en factorAnswers: ${key}`, { factor: key });
    }
  }

  const factors = rule.factors.map((factor): FactorCalculation => {
    if (factor.code !== 'CUMPLIMIENTO_BPM') return readAnswer(factor, answers);
    if (factor.kind !== 'RANGO') {
      throw new RiskEngineError('VERSION_INVALIDA', 'CUMPLIMIENTO_BPM debe ser un factor de rango');
    }
    if (bpmPercentage === null) {
      return { factor, input: { kind: 'SIN_VALOR' }, selected: null, points: null, contribution: null };
    }
    const band = selectBand(factor, bpmPercentage);
    return {
      factor,
      input: { kind: 'VALOR', value: bpmPercentage },
      selected: band,
      points: band.points,
      contribution: band.points.multiply(factor.weight),
    };
  });

  const complete = factors.every((factor) => factor.contribution !== null);
  const total = complete
    ? factors.reduce((sum, factor) => sum.add(factor.contribution as Decimal), Decimal.ZERO)
    : null;
  return { status: complete ? 'CALCULADO' : 'SIN_CUMPLIMIENTO_BPM', factors, total };
}
