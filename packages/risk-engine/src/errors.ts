/**
 * Errores del motor. Cada error lleva un código estable para que la API lo traduzca
 * a una respuesta HTTP (por ejemplo, 422) sin depender del texto del mensaje.
 */
export type RiskEngineErrorCode =
  /** La versión de reglas no pasa la validación de publicación. */
  | 'VERSION_INVALIDA'
  /** Se intentó calcular con una versión que no está publicada. */
  | 'VERSION_NO_PUBLICADA'
  /** Un dato de entrada no tiene el formato o el tipo esperado. */
  | 'ENTRADA_INVALIDA'
  /** Un ítem BPM o una subcategoría aparece más de una vez. */
  | 'ENTRADA_DUPLICADA'
  /** Hay ítems BPM sin respuesta. */
  | 'RESPUESTAS_INCOMPLETAS'
  /** Un ítem que no admite cumplimiento parcial tiene respuesta CP. */
  | 'RESPUESTA_NO_PERMITIDA'
  /** Falta la respuesta de un factor de categorización. */
  | 'FACTOR_SIN_RESPUESTA'
  /** La opción elegida no existe en la versión de reglas. */
  | 'OPCION_DESCONOCIDA'
  /** Ningún rango de la versión contiene el valor recibido. */
  | 'VALOR_FUERA_DE_RANGO'
  /** El nivel y el puntaje de las subcategorías no concuerdan. */
  | 'CATALOGO_INCONSISTENTE'
  /** Ningún rango de frecuencia contiene el riesgo total. */
  | 'RIESGO_TOTAL_SIN_RANGO'
  /** La versión de reglas no es la asignada a la inspección. */
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

  /** Para responder el error como JSON sin perder el mensaje. */
  toJSON(): { name: string; code: RiskEngineErrorCode; message: string; details: Readonly<Record<string, unknown>> } {
    return { name: this.name, code: this.code, message: this.message, details: this.details };
  }
}
