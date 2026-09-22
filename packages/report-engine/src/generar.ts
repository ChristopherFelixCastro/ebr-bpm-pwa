import PDFDocument from 'pdfkit';
import type { DatosInformeOficial } from './tipos.js';
import { ErrorInforme } from './errores.js';

const colores = {
  primario: '#155e75',
  texto: '#17252b',
  tenue: '#5f747c',
  borde: '#d9e3e6',
  fondo: '#f4f7f8',
};

function exigirTexto(valor: string, etiqueta: string): void {
  if (!valor.trim()) throw new ErrorInforme('DATOS_INCOMPLETOS', `Falta el dato obligatorio: ${etiqueta}.`);
}

export function validarDatosInforme(datos: DatosInformeOficial): void {
  exigirTexto(datos.numeroInforme, 'número de informe');
  exigirTexto(datos.versionPlantilla, 'versión de plantilla');
  exigirTexto(datos.empresa.razonSocial, 'razón social');
  exigirTexto(datos.establecimiento.nombre, 'establecimiento');
  exigirTexto(datos.inspeccion.codigo, 'código de inspección');
  exigirTexto(datos.aprobacion.aprobadoPor, 'persona que aprobó');
  if (datos.resultado.preview) throw new ErrorInforme('RESULTADO_PRELIMINAR', 'No se puede emitir un informe oficial con un resultado preliminar.');
  if (datos.resultado.status !== 'CALCULADO') throw new ErrorInforme('RESULTADO_NO_CALCULADO', 'El informe oficial requiere un resultado calculado.');
}

function tituloSeccion(documento: PDFKit.PDFDocument, titulo: string): void {
  documento.moveDown(0.7).font('Helvetica-Bold').fontSize(13).fillColor(colores.primario).text(titulo);
  documento.moveDown(0.25).strokeColor(colores.borde).moveTo(documento.x, documento.y).lineTo(540, documento.y).stroke();
  documento.moveDown(0.5).fillColor(colores.texto).font('Helvetica').fontSize(9.5);
}

function parEtiqueta(documento: PDFKit.PDFDocument, etiqueta: string, valor: string): void {
  documento.font('Helvetica-Bold').fillColor(colores.texto).text(`${etiqueta}: `, { continued: true });
  documento.font('Helvetica').fillColor(colores.texto).text(valor || 'No indicado');
}

function agregarPie(documento: PDFKit.PDFDocument, numeroInforme: string): void {
  const rango = documento.bufferedPageRange();
  for (let pagina = rango.start; pagina < rango.start + rango.count; pagina += 1) {
    documento.switchToPage(pagina);
    documento.font('Helvetica').fontSize(8).fillColor(colores.tenue)
      .text(`${numeroInforme} · Página ${pagina + 1} de ${rango.count}`, 50, 760, { width: 495, align: 'center' });
  }
}

export async function generarInformeOficial(datos: DatosInformeOficial): Promise<Buffer> {
  validarDatosInforme(datos);
  const fechaEmision = new Date(datos.fechaEmision);
  const documento = new PDFDocument({
    size: 'LETTER',
    margins: { top: 48, right: 50, bottom: 54, left: 50 },
    bufferPages: true,
    info: {
      Title: `Informe oficial ${datos.numeroInforme}`,
      Author: 'Sistema EBR/BPM',
      Subject: 'Resultado de evaluación basada en riesgo y buenas prácticas de manufactura',
      CreationDate: fechaEmision,
      ModDate: fechaEmision,
    },
  });

  const fragmentos: Buffer[] = [];
  documento.on('data', (fragmento: Buffer) => fragmentos.push(fragmento));
  const terminado = new Promise<Buffer>((resolver, rechazar) => {
    documento.on('end', () => resolver(Buffer.concat(fragmentos)));
    documento.on('error', rechazar);
  });

  documento.rect(0, 0, 612, 112).fill(colores.primario);
  documento.fillColor('#ffffff').font('Helvetica-Bold').fontSize(19).text('INFORME OFICIAL EBR/BPM', 50, 45);
  documento.font('Helvetica').fontSize(10).text(`${datos.numeroInforme} · Plantilla ${datos.versionPlantilla}`, 50, 76);
  documento.fillColor(colores.texto).y = 132;

  tituloSeccion(documento, 'Identificación');
  parEtiqueta(documento, 'Empresa', datos.empresa.razonSocial);
  parEtiqueta(documento, 'Nombre comercial', datos.empresa.nombreComercial ?? 'No indicado');
  parEtiqueta(documento, 'RNC', datos.empresa.rnc);
  parEtiqueta(documento, 'Establecimiento', datos.establecimiento.nombre);
  parEtiqueta(documento, 'Dirección', datos.establecimiento.direccion);
  parEtiqueta(documento, 'Inspección', `${datos.inspeccion.codigo} · ${datos.inspeccion.fecha}`);
  parEtiqueta(documento, 'Origen', datos.inspeccion.origen);
  parEtiqueta(documento, 'Técnico', datos.inspeccion.tecnico);

  tituloSeccion(documento, 'Resumen ejecutivo');
  const resultado = datos.resultado;
  documento.save().roundedRect(50, documento.y, 495, 74, 8).fill(colores.fondo).restore();
  const yResumen = documento.y + 13;
  const campos = [
    ['Cumplimiento BPM', `${resultado.bpmPercentage.display} %`],
    ['Riesgo del producto', resultado.productRisk.display],
    ['Riesgo del establecimiento', resultado.establishmentRisk.display],
    ['Riesgo total', resultado.totalRisk.display],
    ['Nivel', resultado.riskLevel],
    ['Frecuencia', `${resultado.frequency} (${resultado.frequencyMonths} meses)`],
  ];
  campos.forEach(([etiqueta, valor], indice) => {
    const columna = indice % 3;
    const fila = Math.floor(indice / 3);
    documento.font('Helvetica').fontSize(7.5).fillColor(colores.tenue).text(etiqueta!, 65 + columna * 160, yResumen + fila * 31, { width: 145 });
    documento.font('Helvetica-Bold').fontSize(10).fillColor(colores.texto).text(valor!, 65 + columna * 160, yResumen + 11 + fila * 31, { width: 145 });
  });
  documento.y = yResumen + 72;

  tituloSeccion(documento, 'Hallazgos y no conformidades');
  if (datos.hallazgos.length === 0) {
    documento.text('No se registraron hallazgos para este informe.');
  } else {
    datos.hallazgos.forEach((hallazgo) => {
      documento.font('Helvetica-Bold').text(`${hallazgo.codigo} · ${hallazgo.descripcion}`);
      documento.font('Helvetica').fillColor(colores.tenue).text(`Respuesta: ${hallazgo.respuesta} · Criticidad: ${hallazgo.criticidad ?? 'No indicada'}`);
      if (hallazgo.observacion) documento.fillColor(colores.texto).text(hallazgo.observacion);
      documento.moveDown(0.45);
    });
  }

  tituloSeccion(documento, 'Recomendaciones');
  if (datos.recomendaciones.length === 0) documento.text('Sin recomendaciones adicionales.');
  datos.recomendaciones.forEach((recomendacion) => documento.text(`• ${recomendacion}`, { indent: 8 }));

  tituloSeccion(documento, 'Evidencias autorizadas');
  if (datos.evidencias.length === 0) documento.text('No se adjuntaron evidencias autorizadas.');
  datos.evidencias.forEach((evidencia) => documento.text(`${evidencia.tipo}: ${evidencia.nombre} · Referencia ${evidencia.referencia}`));

  tituloSeccion(documento, 'Trazabilidad');
  parEtiqueta(documento, 'Versión del motor', resultado.engineVersion);
  parEtiqueta(documento, 'Versión de reglas', resultado.ruleVersion.version);
  parEtiqueta(documento, 'Versión de plantilla BPM', resultado.bpmTemplateVersionId);
  parEtiqueta(documento, 'Versión de catálogo alimentario', resultado.foodCatalogVersionId);
  parEtiqueta(documento, 'Aprobado por', `${datos.aprobacion.aprobadoPor} · ${datos.aprobacion.fechaAprobacion}`);
  parEtiqueta(documento, 'Comentario de aprobación', datos.aprobacion.comentario);
  if (datos.cierre) parEtiqueta(documento, 'Cierre', `${datos.cierre.cerradoPor} · ${datos.cierre.fechaCierre}`);

  agregarPie(documento, datos.numeroInforme);
  documento.end();
  return terminado;
}

export function nombreArchivoInforme(numeroInforme: string): string {
  const seguro = numeroInforme.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${seguro || 'informe-ebr-bpm'}.pdf`;
}
