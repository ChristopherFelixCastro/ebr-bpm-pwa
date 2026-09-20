# Portal analítico EBR/BPM

Aplicación de Luis para resultados, revisión, informes, cierre e histórico.

## Estado actual

- Panel analítico y distribución de riesgo.
- Listado con búsqueda y filtros.
- Resultado explicable con desglose de los seis factores.
- Flujo de revisión con comentario obligatorio y devolución limitada a ítems seleccionados.
- Listados de informes oficiales y expedientes cerrados.
- Servicio de demostración aislado, sustituible por el cliente OpenAPI de Core.

Los datos de demostración nunca se presentan como persistidos u oficiales. La descarga del PDF permanece deshabilitada hasta recibir una URL temporal autorizada de Storage privado.

## Comandos

```bash
npm run dev -w @ebr-bpm/web-analytics
npm run validate -w @ebr-bpm/web-analytics
```

## Integración pendiente con Core

La aplicación necesita los contratos OpenAPI de cálculo, resultado, revisión, informe, cierre, histórico y panel. Ninguna pantalla accede directamente a PostgreSQL ni a Storage.
