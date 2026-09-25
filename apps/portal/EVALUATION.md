# Evaluación y correcciones en el portal

La vista de Evaluaciones consulta `/v1/analytics/evaluations` para la tabla paginada y `/v1/analytics/summary` para el resumen institucional. El resumen es global y no cambia con los filtros de la tabla. Core limita ambas consultas a `ADMIN`, `COORDINATOR` y `UNIVERSAL`.

La bandeja `/v1/review-corrections` devuelve únicamente las revisiones devueltas de inspecciones asignadas al `EVALUATOR` autenticado. Cada corrección online **sustituye** la respuesta BPM existente y envía su `baseVersion` a Core. Si la versión cambió, el evaluador debe comparar el estado actualizado antes de guardar; su texto local permanece en el formulario.

El portal no ofrece «Eliminar respuesta». Aunque Core conserva un contrato `DELETE`, eliminar una respuesta evaluable obligatoria impide completar el cálculo y bloquea el reenvío. El flujo actual solo permite sustituir respuestas y reenviar cuando todos los criterios devueltos figuran como corregidos en Core. `UNIVERSAL` no es autor de correcciones.
