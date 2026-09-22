export class ErrorInforme extends Error {
  constructor(
    public readonly codigo: 'DATOS_INCOMPLETOS' | 'RESULTADO_PRELIMINAR' | 'RESULTADO_NO_CALCULADO',
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorInforme';
  }
}
