# Arquitectura

Aqui se registran decisiones tecnicas, modelo de datos, contratos y diagramas del sistema.

- [Modelo lógico de datos](data-model.md)
- [Mapa de la ficha BPM](bpm-field-mapping.md)
- [Estrategia de migraciones](migration-strategy.md)

## Informes oficiales de inspección

Los informes se construyen desde una plantilla HTML/CSS determinista del backend y se renderizan con `puppeteer-core`. El proceso desactiva JavaScript e impide solicitudes remotas. En Render debe instalarse Chromium y configurarse `PDF_CHROMIUM_EXECUTABLE_PATH`; en Windows de desarrollo se detecta Microsoft Edge si la variable está vacía.

El PDF se guarda bajo el scope privado `official-report`, con tamaño y SHA-256 persistidos. Los DTO ordinarios no exponen ruta ni hash. La descarga solo se entrega mediante una URL firmada de 60 segundos. Si Storage acepta el objeto pero la transacción falla, el servicio elimina el objeto nuevo; una regeneración archiva el registro anterior y elimina su objeto después del commit.

El flujo institucional es `SUBMITTED → PENDING_REVIEW → APPROVED`, o bien `RETURNED_FOR_CORRECTION → RESUBMITTED` dentro del mismo ciclo. La corrección solo abre los criterios señalados; los demás criterios, factores, alimentos, evidencias, agenda y asignación permanecen bloqueados por API y PostgreSQL. Un informe `OFFICIAL` bloquea revisiones, desbloqueos, recálculos, sustitución y eliminación. El cierre posterior reutiliza `close_inspection()` y conserva los historiales de revisión, agenda, asignación y caso.
