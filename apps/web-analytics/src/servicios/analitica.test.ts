import { describe, expect, it } from 'vitest';
import { ServicioAnaliticaDemostracion } from './analitica';

describe('ServicioAnaliticaDemostracion', () => {
  it('calcula el resumen a partir de las evaluaciones disponibles', async () => {
    const servicio = new ServicioAnaliticaDemostracion();
    const resumen = await servicio.obtenerResumen();
    expect(resumen.pendientesRevision).toBe(1);
    expect(resumen.porNivel).toEqual({ BAJO: 1, MEDIO: 1, ALTO: 1 });
  });

  it('filtra por texto, estado y nivel de riesgo', async () => {
    const servicio = new ServicioAnaliticaDemostracion();
    const pagina = await servicio.listarEvaluaciones({ busqueda: 'cibao', estado: 'EN_REVISION', nivelRiesgo: 'MEDIO' });
    expect(pagina.total).toBe(1);
    expect(pagina.items[0]?.codigo).toBe('EBR-2026-0017');
  });

  it('exige comentario e ítems al solicitar una corrección', async () => {
    const servicio = new ServicioAnaliticaDemostracion();
    await expect(servicio.revisarEvaluacion('eva-2026-0017', {
      accion: 'SOLICITAR_CORRECCION',
      comentario: 'Corregir el programa documentado.',
      itemsSenalados: [],
    })).rejects.toThrow('Debe seleccionar al menos un ítem');
  });

  it('aprueba una evaluación y conserva la revisión trazable', async () => {
    const servicio = new ServicioAnaliticaDemostracion();
    const actualizada = await servicio.revisarEvaluacion('eva-2026-0017', {
      accion: 'APROBAR',
      comentario: 'Resultado y evidencias revisados.',
      itemsSenalados: [],
    });
    expect(actualizada.estado).toBe('APROBADA');
    expect(actualizada.revisiones.at(-1)?.accion).toBe('APROBADA');
  });

  it('exige aprobación e informe oficial antes del cierre', async () => {
    const servicio = new ServicioAnaliticaDemostracion();
    await expect(servicio.cerrarExpediente('eva-2026-0017')).rejects.toThrow('Solo se puede cerrar');
    const informe = await servicio.emitirInforme('eva-2026-0012');
    expect(informe.informe?.estado).toBe('OFICIAL');
    const cerrada = await servicio.cerrarExpediente('eva-2026-0012');
    expect(cerrada.estado).toBe('CERRADA');
    expect(cerrada.fechaCierre).toBeTruthy();
  });
});
