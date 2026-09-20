export type RiskEngineErrorCode =
  | 'VERSION_INVALIDA'
  | 'VERSION_NO_PUBLICADA'
  | 'ENTRADA_INVALIDA'
  | 'ENTRADA_DUPLICADA'
  | 'RESPUESTAS_INCOMPLETAS'
  | 'RESPUESTA_NO_PERMITIDA'
  | 'FACTOR_SIN_RESPUESTA'
  | 'OPCION_DESCONOCIDA'
  | 'VALOR_FUERA_DE_RANGO'
  | 'CATALOGO_INCONSISTENTE'
  | 'RIESGO_TOTAL_SIN_RANGO'
  | 'VERSION_NO_COINCIDE';

export class RiskEngineError extends Error {
  override readonly name = 'RiskEngineError';

  constructor(
    readonly code: RiskEngineErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }

  toJSON(): { name: string; code: RiskEngineErrorCode; message: string; details: Readonly<Record<string, unknown>> } {
    return { name: this.name, code: this.code, message: this.message, details: this.details };
  }
}
