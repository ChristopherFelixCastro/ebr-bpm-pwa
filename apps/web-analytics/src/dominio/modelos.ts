import type { CalculationResult } from '@ebr-bpm/risk-engine';

export type EstadoEvaluacion =
  | 'EN_REVISION'
  | 'DEVUELTA'
  | 'REENVIADA'
  | 'APROBADA'
  | 'CERRADA';

export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO';

export interface EmpresaResumen {
  id: string;
  razonSocial: string;
  nombreComercial: string;
  rnc: string;
}

export interface ItemBpmResumen {
  id: string;
  codigo: string;
  descripcion: string;
  respuesta: 'C' | 'CP' | 'IT' | 'NA';
  observacion?: string;
  criticidad?: 'CRITICA' | 'MAYOR' | 'MENOR';
  corregible: boolean;
}

export interface RevisionEvaluacion {
  id: string;
  fecha: string;
  accion: 'APROBADA' | 'DEVUELTA' | 'CORRECCION_SOLICITADA' | 'REENVIADA';
  comentario: string;
  revisor: string;
  itemsSenalados: string[];
}

export interface InformeOficial {
  id: string;
  numero: string;
  fechaEmision: string;
  versionPlantilla: string;
  estado: 'BORRADOR' | 'OFICIAL';
  urlDescargaTemporal?: string;
  hashSha256?: string;
}

export interface EvaluacionAnalitica {
  id: string;
  codigo: string;
  empresa: EmpresaResumen;
  establecimiento: string;
  direccion: string;
  tecnico: string;
  fechaInspeccion: string;
  estado: EstadoEvaluacion;
  resultado: CalculationResult;
  items: ItemBpmResumen[];
  revisiones: RevisionEvaluacion[];
  informe?: InformeOficial;
  fechaCierre?: string;
}

export interface FiltrosEvaluaciones {
  busqueda?: string;
  estado?: EstadoEvaluacion | '';
  nivelRiesgo?: NivelRiesgo | '';
  desde?: string;
  hasta?: string;
}

export interface ResumenPanel {
  pendientesRevision: number;
  devolucionesPendientes: number;
  informesEmitidos: number;
  cierresRecientes: number;
  porNivel: Record<NivelRiesgo, number>;
}

export interface SolicitudRevision {
  accion: 'APROBAR' | 'DEVOLVER' | 'SOLICITAR_CORRECCION';
  comentario: string;
  itemsSenalados: string[];
}

export interface ResultadoPaginado<T> {
  pagina: number;
  tamanoPagina: number;
  total: number;
  items: T[];
}
