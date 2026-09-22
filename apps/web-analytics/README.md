# Portal analítico EBR/BPM

Aplicación de Luis para resultados, revisión, informes, cierre e histórico.

> **Integración obligatoria pendiente:** este portal todavía no está conectado al API de Core. Las pantallas operan con un servicio local de demostración para validar el flujo y deben conectarse al cliente OpenAPI y a los endpoints implementados por Christopher antes de considerarse integradas o aptas para producción.

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

## Conexión pendiente con el API de Core

La aplicación necesita los contratos OpenAPI de cálculo, resultado, revisión, informe, cierre, histórico y panel. El servicio de demostración se encuentra aislado para poder reemplazarlo por el cliente real sin cambiar las pantallas. Ninguna pantalla debe acceder directamente a PostgreSQL ni a Storage.

Para completar la integración se requiere:

1. Sustituir el servicio de demostración por el cliente generado desde OpenAPI.
2. Conectar autenticación y autorización para los roles Coordinador y Universal.
3. Persistir resultados, revisiones, informes y cierres mediante Core.
4. Recibir desde Storage las URL temporales autorizadas para descargar informes.
5. Ejecutar la prueba integral con datos reales desde la inspección sincronizada hasta el histórico.
