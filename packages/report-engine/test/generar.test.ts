import { describe, expect, it } from 'vitest';
import { calculateInspectionRisk } from '@ebr-bpm/risk-engine';
import type { CalculatedResult, RiskRuleVersion } from '@ebr-bpm/risk-engine';
import reglaInicial from '@ebr-bpm/risk-engine/rules/regla-inicial.v1.json' with { type: 'json' };
import { ErrorInforme, generarInformeOficial, nombreArchivoInforme } from '../src/index.js';
import type { DatosInformeOficial } from '../src/index.js';

function resultadoCalculado(): CalculatedResult {
  const resultado = calculateInspectionRisk({
    inspectionId: 'eva-prueba',
    ruleVersionId: 'regla-riesgo-v1',
    bpm: {
      templateVersionId: 'plantilla-1',
      items: [
        { itemId: 'item-1', code: '1.1', answer: 'C' },
        { itemId: 'item-2', code: '1.2', answer: 'CP' },
      ],
    },
    products: {
      catalogVersionId: 'catalogo-1',
      subcategories: [{ subcategoryId: 'sub-1', subcategoryName: 'Producto de prueba', categoryName: 'Categoría', microbiologicalRisk: 'ALTO', score: '3' }],
    },
    factorAnswers: {
      VOLUMEN_PRODUCCION: { value: '150000' },
      HACCP: { option: 'NO_IMPLEMENTADO' },
      PROVEEDOR_INABIE: { option: 'REGIONAL' },
      RECHAZOS_SANITARIOS: { value: '1' },
      PLAN_MUESTREO: { option: 'MATERIAS_PRIMAS' },
    },
  }, reglaInicial as RiskRuleVersion);
  if (resultado.status !== 'CALCULADO') throw new Error('El fixture debe ser calculable.');
  return resultado;
}

function datos(): DatosInformeOficial {
  return {
    numeroInforme: 'INF-EBR-2026-0017',
    versionPlantilla: '1',
    fechaEmision: '2026-09-19T20:00:00.000Z',
    estado: 'OFICIAL',
    empresa: { razonSocial: 'Alimentos de Prueba, SRL', nombreComercial: 'Alimentos de Prueba', rnc: '1-00-00000-1' },
    establecimiento: { nombre: 'Planta principal', direccion: 'Santo Domingo' },
    inspeccion: { codigo: 'EBR-2026-0017', fecha: '2026-09-18', origen: 'Programación institucional', tecnico: 'Técnico de prueba' },
    resultado: resultadoCalculado(),
    hallazgos: [{ codigo: '3.1.1', descripcion: 'Programa de limpieza', respuesta: 'IT', criticidad: 'CRITICA', observacion: 'Falta documentar la frecuencia.' }],
    recomendaciones: ['Documentar y ejecutar el programa de limpieza.'],
    evidencias: [{ nombre: 'Fotografía del área', tipo: 'FOTOGRAFIA', referencia: 'evidencia-1' }],
    aprobacion: { aprobadoPor: 'Coordinación Nacional', fechaAprobacion: '2026-09-19', comentario: 'Resultado verificado.' },
  };
}

describe('generarInformeOficial', () => {
  it('genera un PDF válido y no vacío', async () => {
    const pdf = await generarInformeOficial(datos());
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(3000);
    expect(pdf.subarray(-20).toString('ascii')).toContain('%%EOF');
  });

  it('rechaza un resultado preliminar', async () => {
    const entrada = datos();
    entrada.resultado = { ...entrada.resultado, preview: true };
    await expect(generarInformeOficial(entrada)).rejects.toMatchObject({ codigo: 'RESULTADO_PRELIMINAR' } satisfies Partial<ErrorInforme>);
  });

  it('construye un nombre de archivo seguro', () => {
    expect(nombreArchivoInforme('Informe EBR / Núm. 17')).toBe('Informe-EBR-Num-17.pdf');
  });
});
