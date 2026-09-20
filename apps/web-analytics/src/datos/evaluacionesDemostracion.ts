import { calculateInspectionRisk } from '@ebr-bpm/risk-engine';
import type { BpmAnswer, CalculatedResult, RiskLevel, RiskRuleVersion } from '@ebr-bpm/risk-engine';
import reglaInicial from '@ebr-bpm/risk-engine/rules/regla-inicial.v1.json';
import type { EvaluacionAnalitica } from '../dominio/modelos';

interface EscenarioRiesgo {
  id: string;
  respuestaBpm: BpmAnswer;
  riesgoProducto: RiskLevel;
  volumen: string;
  haccp: string;
  proveedorInabie: string;
  rechazos: string;
  planMuestreo: string;
}

function calcularEscenario(escenario: EscenarioRiesgo): CalculatedResult {
  const resultado = calculateInspectionRisk({
    inspectionId: escenario.id,
    ruleVersionId: 'regla-riesgo-v1',
    bpm: {
      templateVersionId: 'bpm-2024-10',
      items: [{ itemId: 'item-1.1.1', code: '1.1.1', answer: escenario.respuestaBpm }],
    },
    products: {
      catalogVersionId: 'alimentos-2026-08',
      subcategories: [{
        subcategoryId: `sub-${escenario.riesgoProducto.toLocaleLowerCase('es')}`,
        subcategoryName: `Producto de riesgo ${escenario.riesgoProducto.toLocaleLowerCase('es')}`,
        categoryName: 'Categoría alimentaria de demostración',
        microbiologicalRisk: escenario.riesgoProducto,
        score: reglaInicial.productRiskPoints[escenario.riesgoProducto],
      }],
    },
    factorAnswers: {
      VOLUMEN_PRODUCCION: { value: escenario.volumen },
      HACCP: { option: escenario.haccp },
      PROVEEDOR_INABIE: { option: escenario.proveedorInabie },
      RECHAZOS_SANITARIOS: { value: escenario.rechazos },
      PLAN_MUESTREO: { option: escenario.planMuestreo },
    },
  }, reglaInicial as RiskRuleVersion);

  if (resultado.status !== 'CALCULADO') throw new Error(`El escenario ${escenario.id} debe ser calculable.`);
  return resultado;
}

const resultadoMedio = calcularEscenario({
  id: 'eva-2026-0017', respuestaBpm: 'C', riesgoProducto: 'ALTO', volumen: '150000',
  haccp: 'NO_IMPLEMENTADO', proveedorInabie: 'REGIONAL', rechazos: '1', planMuestreo: 'MATERIAS_PRIMAS',
});

const resultadoBajo = calcularEscenario({
  id: 'eva-2026-0012', respuestaBpm: 'C', riesgoProducto: 'BAJO', volumen: '100000',
  haccp: 'TODAS_LAS_LINEAS', proveedorInabie: 'NO_SUPLIDOR', rechazos: '0', planMuestreo: 'COMPLETO',
});

const resultadoAlto = calcularEscenario({
  id: 'eva-2026-0008', respuestaBpm: 'IT', riesgoProducto: 'ALTO', volumen: '3000000',
  haccp: 'NO_IMPLEMENTADO', proveedorInabie: 'NACIONAL', rechazos: '3', planMuestreo: 'INEXISTENTE',
});

export const evaluacionesDemostracion: EvaluacionAnalitica[] = [
  {
    id: 'eva-2026-0017', codigo: 'EBR-2026-0017',
    empresa: { id: 'emp-1', razonSocial: 'Alimentos del Cibao, SRL', nombreComercial: 'Sabores del Cibao', rnc: '1-31-24567-8' },
    establecimiento: 'Planta Santiago Norte', direccion: 'Av. Industrial 45, Santiago', tecnico: 'María Rodríguez',
    fechaInspeccion: '2026-09-18', estado: 'EN_REVISION', resultado: resultadoMedio,
    items: [
      { id: 'item-1.1.1', codigo: '1.1.1', descripcion: 'Ubicación y alrededores del establecimiento', respuesta: 'C', corregible: false },
      { id: 'item-2.1.1', codigo: '2.1.1', descripcion: 'Conocimiento y responsabilidad del personal', respuesta: 'CP', observacion: 'Falta evidencia de capacitación para dos operarios.', criticidad: 'MAYOR', corregible: true },
      { id: 'item-3.1.1', codigo: '3.1.1', descripcion: 'Programa documentado de limpieza y desinfección', respuesta: 'IT', observacion: 'El programa no contiene frecuencias verificables.', criticidad: 'CRITICA', corregible: true },
      { id: 'item-5.3', codigo: '5.3', descripcion: 'Control de peligros durante el proceso', respuesta: 'NA', corregible: false },
    ],
    revisiones: [],
  },
  {
    id: 'eva-2026-0012', codigo: 'EBR-2026-0012',
    empresa: { id: 'emp-2', razonSocial: 'Procesadora Nacional, SA', nombreComercial: 'Procesadora Nacional', rnc: '1-01-98412-2' },
    establecimiento: 'Planta Herrera', direccion: 'Zona Industrial de Herrera, Santo Domingo Oeste', tecnico: 'José Pérez',
    fechaInspeccion: '2026-09-15', estado: 'APROBADA', resultado: resultadoBajo, items: [],
    revisiones: [{ id: 'rev-12-1', fecha: '2026-09-16T15:00:00Z', accion: 'APROBADA', comentario: 'Evaluación revisada y conforme.', revisor: 'Coordinación Nacional', itemsSenalados: [] }],
  },
  {
    id: 'eva-2026-0008', codigo: 'EBR-2026-0008',
    empresa: { id: 'emp-3', razonSocial: 'Conservas del Sur, SRL', nombreComercial: 'Conservas del Sur', rnc: '1-32-74125-6' },
    establecimiento: 'Planta Baní', direccion: 'Carretera Sánchez km 4, Baní', tecnico: 'Ana Méndez',
    fechaInspeccion: '2026-09-10', estado: 'CERRADA', resultado: resultadoAlto, items: [],
    revisiones: [{ id: 'rev-8-1', fecha: '2026-09-11T14:30:00Z', accion: 'APROBADA', comentario: 'Aprobada después de verificar los hallazgos.', revisor: 'Coordinación Nacional', itemsSenalados: [] }],
    informe: { id: 'inf-8', numero: 'INF-EBR-2026-0008', fechaEmision: '2026-09-11T15:00:00Z', versionPlantilla: '1', estado: 'OFICIAL', hashSha256: 'demostracion-sin-documento-real' },
    fechaCierre: '2026-09-11T16:00:00Z',
  },
];
