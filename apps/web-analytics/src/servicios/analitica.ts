import { evaluacionesDemostracion } from '../datos/evaluacionesDemostracion';
import type {
  EvaluacionAnalitica,
  FiltrosEvaluaciones,
  ResultadoPaginado,
  ResumenPanel,
  SolicitudRevision,
} from '../dominio/modelos';

export interface ServicioAnalitica {
  obtenerResumen(): Promise<ResumenPanel>;
  listarEvaluaciones(filtros?: FiltrosEvaluaciones, pagina?: number, tamanoPagina?: number): Promise<ResultadoPaginado<EvaluacionAnalitica>>;
  obtenerEvaluacion(id: string): Promise<EvaluacionAnalitica>;
  revisarEvaluacion(id: string, solicitud: SolicitudRevision): Promise<EvaluacionAnalitica>;
  emitirInforme(id: string): Promise<EvaluacionAnalitica>;
  cerrarExpediente(id: string): Promise<EvaluacionAnalitica>;
}

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function validarRevision(evaluacion: EvaluacionAnalitica, solicitud: SolicitudRevision): void {
  if (!['EN_REVISION', 'REENVIADA'].includes(evaluacion.estado)) {
    throw new Error('La evaluación no está disponible para revisión.');
  }

  if (!solicitud.comentario.trim()) {
    throw new Error('Es obligatorio registrar un comentario de revisión.');
  }

  if (solicitud.accion !== 'APROBAR' && solicitud.itemsSenalados.length === 0) {
    throw new Error('Debe seleccionar al menos un ítem para devolver o solicitar corrección.');
  }

  const permitidos = new Set(evaluacion.items.filter((item) => item.corregible).map((item) => item.id));
  if (solicitud.itemsSenalados.some((id) => !permitidos.has(id))) {
    throw new Error('La solicitud contiene un ítem que no puede corregirse.');
  }
}

export class ServicioAnaliticaDemostracion implements ServicioAnalitica {
  private evaluaciones = clonar(evaluacionesDemostracion);

  async obtenerResumen(): Promise<ResumenPanel> {
    return {
      pendientesRevision: this.evaluaciones.filter((item) => ['EN_REVISION', 'REENVIADA'].includes(item.estado)).length,
      devolucionesPendientes: this.evaluaciones.filter((item) => item.estado === 'DEVUELTA').length,
      informesEmitidos: this.evaluaciones.filter((item) => item.informe?.estado === 'OFICIAL').length,
      cierresRecientes: this.evaluaciones.filter((item) => item.estado === 'CERRADA').length,
      porNivel: {
        BAJO: this.evaluaciones.filter((item) => item.resultado.riskLevel === 'BAJO').length,
        MEDIO: this.evaluaciones.filter((item) => item.resultado.riskLevel === 'MEDIO').length,
        ALTO: this.evaluaciones.filter((item) => item.resultado.riskLevel === 'ALTO').length,
      },
    };
  }

  async listarEvaluaciones(
    filtros: FiltrosEvaluaciones = {},
    pagina = 1,
    tamanoPagina = 10,
  ): Promise<ResultadoPaginado<EvaluacionAnalitica>> {
    const busqueda = filtros.busqueda?.trim().toLocaleLowerCase('es') ?? '';
    const filtradas = this.evaluaciones.filter((item) => {
      const coincideBusqueda = !busqueda || [item.codigo, item.empresa.razonSocial, item.empresa.nombreComercial, item.establecimiento]
        .some((valor) => valor.toLocaleLowerCase('es').includes(busqueda));
      const coincideEstado = !filtros.estado || item.estado === filtros.estado;
      const coincideNivel = !filtros.nivelRiesgo || item.resultado.riskLevel === filtros.nivelRiesgo;
      const coincideDesde = !filtros.desde || item.fechaInspeccion >= filtros.desde;
      const coincideHasta = !filtros.hasta || item.fechaInspeccion <= filtros.hasta;
      return coincideBusqueda && coincideEstado && coincideNivel && coincideDesde && coincideHasta;
    });

    const inicio = (pagina - 1) * tamanoPagina;
    return {
      pagina,
      tamanoPagina,
      total: filtradas.length,
      items: clonar(filtradas.slice(inicio, inicio + tamanoPagina)),
    };
  }

  async obtenerEvaluacion(id: string): Promise<EvaluacionAnalitica> {
    const evaluacion = this.evaluaciones.find((item) => item.id === id);
    if (!evaluacion) throw new Error('No se encontró la evaluación solicitada.');
    return clonar(evaluacion);
  }

  async revisarEvaluacion(id: string, solicitud: SolicitudRevision): Promise<EvaluacionAnalitica> {
    const evaluacion = this.evaluaciones.find((item) => item.id === id);
    if (!evaluacion) throw new Error('No se encontró la evaluación solicitada.');
    validarRevision(evaluacion, solicitud);

    const accion = solicitud.accion === 'APROBAR'
      ? 'APROBADA'
      : solicitud.accion === 'DEVOLVER'
        ? 'DEVUELTA'
        : 'CORRECCION_SOLICITADA';

    evaluacion.estado = solicitud.accion === 'APROBAR' ? 'APROBADA' : 'DEVUELTA';
    evaluacion.revisiones.push({
      id: `revision-${Date.now()}`,
      fecha: new Date().toISOString(),
      accion,
      comentario: solicitud.comentario.trim(),
      revisor: 'Coordinador de demostración',
      itemsSenalados: [...new Set(solicitud.itemsSenalados)],
    });
    return clonar(evaluacion);
  }

  async emitirInforme(id: string): Promise<EvaluacionAnalitica> {
    const evaluacion = this.evaluaciones.find((item) => item.id === id);
    if (!evaluacion) throw new Error('No se encontró la evaluación solicitada.');
    if (evaluacion.estado !== 'APROBADA') throw new Error('Solo se puede emitir un informe para una evaluación aprobada.');
    if (evaluacion.resultado.status !== 'CALCULADO' || evaluacion.resultado.preview) {
      throw new Error('El informe oficial requiere un resultado calculado y no preliminar.');
    }
    if (evaluacion.informe) throw new Error('La evaluación ya tiene un informe emitido.');

    const correlativo = evaluacion.codigo.replace('EBR-', '');
    evaluacion.informe = {
      id: `informe-${evaluacion.id}`,
      numero: `INF-EBR-${correlativo}`,
      fechaEmision: new Date().toISOString(),
      versionPlantilla: '1',
      estado: 'OFICIAL',
      hashSha256: 'pendiente-de-storage-core',
    };
    return clonar(evaluacion);
  }

  async cerrarExpediente(id: string): Promise<EvaluacionAnalitica> {
    const evaluacion = this.evaluaciones.find((item) => item.id === id);
    if (!evaluacion) throw new Error('No se encontró la evaluación solicitada.');
    if (evaluacion.estado !== 'APROBADA') throw new Error('Solo se puede cerrar una evaluación aprobada.');
    if (evaluacion.informe?.estado !== 'OFICIAL') throw new Error('Debe existir un informe oficial antes de cerrar el expediente.');

    evaluacion.estado = 'CERRADA';
    evaluacion.fechaCierre = new Date().toISOString();
    return clonar(evaluacion);
  }
}

export const servicioAnalitica = new ServicioAnaliticaDemostracion();
