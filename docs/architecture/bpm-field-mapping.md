# Mapa de campos de la ficha BPM al modelo

La ficha BPM es una fuente de captura y no una estructura de base de datos. Las
selecciones y datos que puedan cambiar se guardan además en la inspección o en un
snapshot histórico para que una modificación posterior no cambie el resultado.

| Campo de la ficha | Destino principal | Histórico o regla |
|---|---|---|
| Nombre del establecimiento | `establishments.name` | `inspections.establishment_id` fija el establecimiento inspeccionado. |
| Calle, municipio | `establishments.address_text`, `municipality_code` | Dirección se copia a snapshot de informe al emitirlo. |
| DPS/DAS | `establishments.health_jurisdiction_code` | Jurisdicción sanitaria independiente de municipio; catálogo pendiente de fuente oficial. |
| Teléfono, correo, RNC | `companies` o `establishments` | RNC en empresa; teléfono/correo según propietario funcional confirmado. |
| Permiso sanitario y vencimiento | `establishments.sanitary_permit_number`, `sanitary_permit_expires_at` | Snapshot en informe/inspección si se usa en la decisión. |
| Fecha de inicio de operaciones | `establishments.operations_started_at` | Perfil permanente. |
| Productos elaborados | `establishment_foods` | Las subcategorías confirmadas van a `inspection_food_snapshots`. |
| Categoría de alimento | `establishment_foods` | Confirmación y puntaje aplicado en `inspection_food_snapshots`. |
| Producción anual y volumen | `establishment_operational_profiles.annual_production` | Valor aplicado se conserva en `inspection_scores.input_snapshot`. |
| Comercialización y mercado objetivo | `establishment_operational_profiles.commercialization_scope`, `market_target` | Valor aplicado como opción de factor INABIE/riesgo en snapshot de cálculo. |
| Número de empleados, hombres, mujeres | `establishment_operational_profiles.employee_count`, `male_employee_count`, `female_employee_count` | Snapshot de inspección si se requiere en informe. |
| HACCP y nivel de implementación | `establishment_operational_profiles.haccp_status`, `haccp_implementation_level` | Selección usada por la inspección en snapshot de cálculo. |
| Plan de muestreo y ámbito | `establishment_operational_profiles.sampling_plan_status`, `sampling_plan_scope` | Selección usada por la inspección en snapshot de cálculo. |
| Suplidor INABIE y distribución | `establishment_operational_profiles.inabie_supplier_status`, `inabie_distribution_scope` | Selección usada por la inspección en snapshot de cálculo. |
| Propietario | `contacts` + `company_contacts` | Relación `PROPIETARIO`. |
| Representante | `contacts` + `company_contacts` o `establishment_contacts` | Relación `REPRESENTANTE`. |
| Cédula, teléfono celular, correo de contactos | `contacts` | Aplican políticas de visibilidad y retención pendientes. |
| Fecha última inspección y calificación | Consulta de inspección previa | No se duplica: se obtiene de `inspections` e `inspection_scores`. |
| Fecha de inspección actual | `inspections.scheduled_at`, `started_at` o `submitted_at` | Según el hito correspondiente. |
| Oficial DPS/DAS | `inspection_participants` tipo `OFICIAL_DPS_DAS` | Snapshot de firmante en `reports`. |
| Técnico DIGEMAPS | `inspection_assignments.evaluator_id` y/o `inspection_participants` tipo `TECNICO_DIGEMAPS` | Snapshot de firmante en `reports`. |
| Motivo de inspección | `requests.reason` o `cases.origin/priority` | La inspección conserva la relación con su caso. |
| Resultado BPM por criterio | `evaluation_responses.response_value` | `C`, `CP`, `IT`, `NA`; no se copian fórmulas Excel. |
| Observación por criterio | `evaluation_responses.observation` | Histórica por versión y auditoría. |
| Pregunta BPM | `bpm_template_items` con `item_kind=CRITERION` | Proviene de `AllItems I`; es evaluable y conserva código, jerarquía y fila fuente. |
| Instrucción de llenado | `bpm_criterion_guidance_items` | Proviene de `Guía de Llenado`; se agrupa bajo la pregunta y conserva archivo, hoja y fila. |
| Nivel de criticidad de la instrucción | `bpm_criterion_guidance_items.criticality` | `CRITICA`, `MAYOR`, `MENOR` o `NULL`; no se agrega automáticamente al criterio. |
| Subtotales, total y porcentaje BPM | `inspection_scores` | Cálculo versionado, no fórmula persistida de Excel. |
| Calificación final y recomendación | `inspection_scores` y `reports` | No activa cierre automático. |
| Medidas correctivas/recomendaciones | `reviews.comment`, `review_items.reason`, `reports` | No existe módulo independiente en el alcance inicial. |
| Fecha próxima visita | Campo de programación de nueva inspección a añadir | Requiere crear o programar una nueva inspección, no modificar la cerrada. |
| Firmas, elaboró, revisó, aprobó | `inspection_participants` y `reports` | Tipo y nombre del firmante se preservan en el documento emitido. |

## Regla de preservación histórica

Los atributos operativos del establecimiento cambian independientemente de una
inspección, por ello se agrupan en `establishment_operational_profiles` con
vigencia. La inspección nunca depende del valor actual: cada dato elegido para la
regla se persiste en `inspection_scores.input_snapshot`.
