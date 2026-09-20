import type { CalculatedResult } from '@ebr-bpm/risk-engine';

export interface HallazgoInforme {
  codigo: string;
  descripcion: string;
  respuesta: 'C' | 'CP' | 'IT' | 'NA';
  criticidad?: 'CRITICA' | 'MAYOR' | 'MENOR';
  observacion?: string;
}

export interface EvidenciaInforme {
  nombre: string;
  tipo: 'FOTOGRAFIA' | 'DOCUMENTO' | 'VIDEO' | 'OTRA';
  referencia: string;
}

export interface DatosInformeOficial {
  numeroInforme: string;
  versionPlantilla: string;
  fechaEmision: string;
  estado: 'OFICIAL';
  empresa: {
    razonSocial: string;
    nombreComercial?: string;
    rnc: string;
  };
  establecimiento: {
    nombre: string;
    direccion: string;
  };
  inspeccion: {
    codigo: string;
    fecha: string;
    origen: string;
    tecnico: string;
  };
  resultado: CalculatedResult;
  hallazgos: HallazgoInforme[];
  recomendaciones: string[];
  evidencias: EvidenciaInforme[];
  aprobacion: {
    aprobadoPor: string;
    fechaAprobacion: string;
    comentario: string;
  };
  cierre?: {
    cerradoPor: string;
    fechaCierre: string;
  };
}
