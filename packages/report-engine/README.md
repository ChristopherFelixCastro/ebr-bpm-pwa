# @ebr-bpm/report-engine

Generador del informe oficial EBR/BPM para ejecutarse exclusivamente del lado servidor.

> **Integración pendiente:** Christopher debe invocar este paquete desde el API de Core, suministrar datos autorizados y conectar la persistencia del PDF con Storage privado. El paquete genera el documento, pero no publica ni almacena archivos por sí mismo.

- Recibe datos autorizados y un resultado final de `@ebr-bpm/risk-engine`.
- Rechaza resultados preliminares o incompletos.
- Produce un `Buffer` PDF; no escribe archivos ni accede directamente a Storage.
- Core es responsable de guardar el PDF, calcular o verificar su hash, registrar metadatos y emitir una URL temporal autorizada.

```ts
const pdf = await generarInformeOficial(datosAprobados);
```

El informe incluye identificación, resumen, hallazgos, recomendaciones, referencias de evidencias y trazabilidad de versiones y aprobación.
