# Modelo lógico de datos EBR BPM

## Alcance y principios

Este documento es la fuente de diseño para las migraciones SQL. PostgreSQL local se
creará exclusivamente desde migraciones versionadas en Git; Supabase de desarrollo
recibirá después exactamente esas mismas migraciones.

- Las claves primarias son UUID técnicos. Los códigos visibles no son claves.
- Las versiones BPM, de alimentos y de reglas solo pasan de `DRAFT` a `PUBLISHED`.
  Una versión publicada es inmutable.
- Las escrituras operativas usan control optimista mediante `version` entero.
- No se borran datos históricos. Los recursos archivables usan `deleted_at`.

## Diagrama relacional

```text
roles --< users --< refresh_tokens
                --< user_authorization_documents

companies --< establishments --< establishment_foods >-- food_subcategories --< food_categories
    |               |                    |
    |               |                    +-- food_catalog_versions
    |               +--< establishment_operational_profiles
    |               +--< establishment_contacts >-- contacts
    +--< company_contacts >-- contacts

requests --< request_documents
    |
cases --< inspections --< inspection_assignments
 |          |   |--< inspection_food_snapshots
 |          |   |--< inspection_participants >-- users / contacts
 |          |   |--< inspection_state_transitions
 |          |   |--< evaluation_responses >-- bpm_items --< bpm_template_versions
 |          |   |--< evidence
 |          |   |--< reviews --< review_items
 |          |   |--< inspection_scores
 |          |   |--< reports
 |          |   +--< sync_operations
 |          +-- risk_rule_versions --< risk_factors --< risk_factor_options
 |                                  +--< frequency_ranges
 +-- health_alerts
 +-- complaints
 +-- case_closures

audit_events -- registra acciones técnicas sobre cualquier entidad
```

## Tablas y campos

| Tabla | Campos principales | Reglas de integridad |
|---|---|---|
| `roles` | `id`, `code`, `name`, `is_universal`, `is_active` | Código único; solo un rol universal activo. |
| `users` | `id`, `role_id`, `full_name`, `identity_document`, `email`, `phone`, `password_hash`, `status`, `version` | Un único rol por usuario; email único. |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by_id` | Nunca se conserva token legible. |
| `user_authorization_documents` | `id`, `user_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `sha256`, `status`, `uploaded_by_user_id`, `uploaded_at`, `reviewed_by_user_id`, `reviewed_at`, `rejection_reason`, `archived_by_user_id`, `archived_at`, `version` | Carta de autorización de la cuenta (migración 0034), distinta de la carta de una solicitud BPM: PDF, JPEG o PNG, máximo 5 MB, con hash SHA-256. Una sola carta activa por cuenta; reemplazar archiva la anterior y se conserva el historial (no se borra). Revisión `PENDING → VALID/REJECTED` con motivo; la cuenta no revisa su propia carta. Un trigger impide la transición de `users.status` a `APPROVED` sin una carta `VALID`; no invalida cuentas aprobadas antes de la migración. |
| `companies` | `id`, `legal_name`, `rnc`, `trade_name`, `address_text`, `phone`, `email`, `economic_activity_code`, `status`, `version` | RNC único al estar presente y validado. |
| `establishments` | `id`, `company_id`, `name`, `establishment_type_code`, `address_text`, `province_code`, `municipality_code`, `health_jurisdiction_code`, `sanitary_permit_number`, `sanitary_permit_expires_at`, `operations_started_at`, `status`, `version` | La jurisdicción sanitaria no se deriva del municipio. Los códigos externos se validarán cuando exista fuente oficial. |
| `contacts` | `id`, `full_name`, `identity_document`, `phone`, `email`, `version` | Contacto reutilizable. |
| `company_contacts` | `company_id`, `contact_id`, `relationship_type`, `is_primary` | Relación legal, calidad o principal. |
| `establishment_contacts` | `establishment_id`, `contact_id`, `relationship_type`, `is_primary` | Relación específica del establecimiento. |
| `food_catalog_versions` | `id`, `version_number`, `status`, `drafted_at`, `published_at`, `published_by` | Una publicada no cambia. |
| `food_categories` | `id`, `catalog_version_id`, `source_code`, `name`, `display_order` | Única por versión y código/nombre normalizado. |
| `food_subcategories` | `id`, `category_id`, `source_row`, `name`, `microbiological_risk`, `risk_score`, `display_order` | Riesgo `LOW/MEDIUM/HIGH` o nulo; puntaje 1/2/3 o nulo. |
| `establishment_foods` | `id`, `establishment_id`, `food_subcategory_id`, `is_active`, `declared_at`, `version` | Perfil habitual, no histórico de inspección. |
| `establishment_operational_profiles` | `id`, `establishment_id`, `annual_production`, `market_target`, `commercialization_scope`, `employee_count`, `male_employee_count`, `female_employee_count`, `haccp_status`, `haccp_implementation_level`, `sampling_plan_status`, `sampling_plan_scope`, `inabie_supplier_status`, `inabie_distribution_scope`, `effective_from`, `effective_to`, `version` | Perfil operativo con vigencia; no sustituye el snapshot de cálculo de inspección. |
| `requests` | `id`, `company_id`, `establishment_id`, `request_type`, `reason`, `observations`, `status`, `submitted_at`, `version` | Borrador o enviada. |
| `request_documents` | `id`, `request_id`, `document_type`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `status`, `deleted_at` | Obligatorios pendientes de definición funcional. |
| `cases` | `id`, `request_id`, `origin`, `company_id`, `establishment_id`, `priority`, `status`, `opened_at`, `closed_at`, `version` | Un caso puede conservar varias inspecciones. |
| `health_alerts` | `id`, `case_id`, `alert_number`, `alert_date`, `product_description`, `description`, `decision` | Origen LAPCH. |
| `complaints` | `id`, `case_id`, `complaint_type`, `received_at`, `complainant_data`, `description`, `decision` | Visibilidad sujeta a política de datos sensibles. |
| `inspections` | `id`, `case_id`, `establishment_id`, `scheduled_at`, `started_at`, `submitted_at`, `status`, `bpm_template_version_id`, `food_catalog_version_id`, `risk_rule_version_id`, `version` | Fija las tres versiones aplicadas. |
| `inspection_assignments` | `id`, `inspection_id`, `evaluator_id`, `assigned_by`, `assigned_at`, `unassigned_at`, `reason` | Una sola asignación activa. |
| `inspection_participants` | `id`, `inspection_id`, `participant_type`, `user_id`, `contact_id`, `display_name_snapshot`, `starts_at`, `ends_at`, `is_signatory`, `signature_role`, `version` | Tipos: `EVALUADOR`, `OFICIAL_DPS_DAS`, `TECNICO_DIGEMAPS`, `ELABORO`, `REVISO`, `APROBO`. Exactamente uno de usuario/contacto puede estar informado; el nombre se conserva para informes. |
| `inspection_state_transitions` | `id`, `inspection_id`, `from_status`, `to_status`, `reason`, `performed_by`, `occurred_at` | Historial funcional legible; no duplica auditoría técnica. |
| `inspection_food_snapshots` | `id`, `inspection_id`, `food_subcategory_id`, `catalog_version_id`, `category_name`, `subcategory_name`, `microbiological_risk`, `risk_score`, `confirmed_by`, `confirmed_at` | Registra subcategorías confirmadas y puntaje aplicado ese día. |
| `bpm_template_versions` | `id`, `version_number`, `name`, `status`, `drafted_at`, `published_at`, `published_by` | Publicada e inmutable. |
| `bpm_items` | `id`, `template_version_id`, `parent_id`, `item_code`, `title`, `description`, `node_type`, `display_order`, `is_evaluable`, `default_criticality` | Árbol normalizado; solo ítems evaluables tienen respuesta. |
| `evaluation_responses` | `id`, `inspection_id`, `bpm_item_id`, `response_value`, `numeric_score`, `criticality`, `observation`, `version`, `answered_by`, `answered_at` | Una respuesta por ítem/inspección. Valores `C/CP/IT/NA`; criticidad `CRITICA/MAYOR/MENOR` o nula. |
| `evidence` | `id`, `inspection_id`, `evaluation_response_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `upload_status`, `captured_at`, `latitude`, `longitude`, `deleted_at`, `version` | Activa si `deleted_at IS NULL`; máximo 10 activas por inspección y 5 MB por archivo. |
| `risk_rule_versions` | `id`, `version_number`, `status`, `formula_description`, `drafted_at`, `published_at`, `published_by` | Regla publicada, reproducible e inmutable. |
| `risk_factors` | `id`, `risk_rule_version_id`, `code`, `name`, `weight`, `display_order` | Seis factores ponderados. |
| `risk_factor_options` | `id`, `risk_factor_id`, `label`, `score`, `display_order`, `is_active` | Opciones y puntos aplicables por factor. |
| `frequency_ranges` | `id`, `risk_rule_version_id`, `lower_bound`, `upper_bound`, `lower_inclusive`, `upper_inclusive`, `frequency_code`, `label` | Representa límites exactos, incluido límite superior abierto. |
| `inspection_scores` | `id`, `inspection_id`, `calculation_number`, `status`, `is_current`, `risk_rule_version_id`, `product_risk_score`, `establishment_risk_score`, `total_risk_score`, `bpm_score`, `bpm_percentage`, `frequency_code`, `input_snapshot`, `calculated_at`, `calculated_by` | Nunca se sobreescribe. Único por inspección/número y único vigente por inspección. |
| `reviews` | `id`, `inspection_id`, `review_number`, `decision`, `comment`, `reviewed_by`, `reviewed_at` | Histórico de aprobar, devolver y reenviar. |
| `review_items` | `id`, `review_id`, `bpm_item_id`, `reason`, `resolved_at`, `resolved_by` | Solo estos ítems se pueden editar durante corrección. |
| `reports` | `id`, `inspection_id`, `review_id`, `report_number`, `storage_path`, `generated_at`, `generated_by`, `status` | Informe oficial inmutable. |
| `case_closures` | `id`, `case_id`, `inspection_id`, `report_id`, `final_result`, `closed_at`, `closed_by` | No hay cierre externo automático. |
| `sync_operations` | `id`, `operation_id`, `user_id`, `inspection_id`, `operation_type`, `payload_hash`, `entity_version`, `status`, `processed_at`, `error_code` | `operation_id` único e idempotente. |
| `audit_events` | `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_data`, `after_data`, `correlation_id`, `occurred_at` | Append-only, con datos sanitizados. `correlation_id` identifica una solicitud HTTP u operación distribuida, no una fila de `requests`. |

## Reglas de cálculo y frecuencia

El riesgo de producto es el máximo `risk_score` aplicable de las filas activas de
`inspection_food_snapshots`. Los vacíos son `NA` y no participan. El riesgo de
establecimiento resulta de los seis factores ponderados de la regla publicada.
El riesgo total es `riesgo_producto * riesgo_establecimiento`.

La versión inicial de `frequency_ranges` debe crear estas filas:

| Límite inferior | Incluye inferior | Límite superior | Incluye superior | Frecuencia |
|---:|:---:|---:|:---:|---|
| 1.0 | Sí | 3.6 | Sí | Anual |
| 3.6 | No | 6.3 | Sí | Semestral |
| 6.3 | No | nulo | No | Trimestral |

Un `CHECK` exigirá que el límite superior sea mayor que el inferior cuando exista.
La migración añadirá una restricción de exclusión por versión para impedir rangos
solapados. PostgreSQL puede generar un `numrange` para dicha exclusión a partir de
los límites y banderas; la tabla conserva las banderas explícitas para auditoría y
portabilidad de contrato.

Cada recálculo inserta una fila nueva en `inspection_scores`: incrementa
`calculation_number`, deja el cálculo anterior como `SUPERSEDED` y marca el nuevo
como `CURRENT` e `is_current=true`. El snapshot de entrada contiene respuestas,
factores, alimentos confirmados y versiones utilizadas. Una restricción parcial
garantizará un solo cálculo vigente por inspección.

## BPM, corrección y evidencia

`C=1`, `CP=0.5`, `IT=0`, `NA=NULL`. Los `NA` no integran el denominador. La
criticidad no comparte nomenclatura con la respuesta: `CRITICA`, `MAYOR` o `MENOR`.
Su uso adicional en filtros o priorización sigue pendiente de decisión; nunca
produce cierre automático.

Las plantillas BPM publicadas se relacionan directamente con respuestas mediante
`bpm_item_id`; no se duplica el árbol en una tabla de snapshots. Las devoluciones
generan `reviews` y `review_items`, y la API permite editar exclusivamente los
ítems abiertos. Reenvíos, devoluciones y revisiones permanecen en el historial.

La evidencia eliminada lógicamente se conserva con `deleted_at`, no aparece en
consultas normales y no cuenta para el máximo de diez. El límite se aplicará con
validación transaccional y un trigger de base de datos para evitar carreras.

## Restricciones relacionales obligatorias

- `bpm_items.parent_id` solo puede referir un ítem de la misma
  `bpm_template_version_id`. Se implementará mediante clave única y foránea
  compuestas `(id, template_version_id)`.
- `evaluation_responses.bpm_item_id` debe pertenecer a la plantilla fijada por su
  inspección. Las claves compuestas incluirán inspección y versión de plantilla; un
  trigger completará la validación si una dependencia no puede expresarse de modo
  declarativo.
- `inspection_food_snapshots.food_subcategory_id` debe pertenecer al catálogo
  alimentario fijado por su inspección. Se aplicará con claves compuestas de
  catálogo/subcategoría y la versión de la inspección.
- `cases.request_id` admite nulo. Para `REQUEST` exige solicitud y prohíbe alerta y
  denuncia; para `HEALTH_ALERT` exige alerta únicamente; para `COMPLAINT` exige
  denuncia únicamente; `INSTITUTIONAL_PROGRAM` prohíbe los tres vínculos. La
  migración aplicará restricciones y triggers diferibles cuando el orden de inserción
  lo requiera.

## Auditoría y datos sensibles

`audit_events` registra el mínimo necesario para trazabilidad. Antes de persistir
`before_data` o `after_data`, la capa de auditoría elimina o reemplaza con
`[REDACTED]` contraseñas, hashes de contraseña, refresh tokens, cabeceras de
autorización, enlaces firmados, rutas de descarga temporal, documentos de identidad
completos, coordenadas exactas y cualquier contenido binario/documental. Para datos
sensibles solo se guarda, cuando sea indispensable, una referencia técnica o un
valor enmascarado. La auditoría no sustituye las tablas funcionales de historial.

## Pendientes funcionales

1. Si `CRITICA/MAYOR/MENOR` será solo reportable o también habilitará filtros y
   priorización.
2. Retención y visibilidad de identidad, denunciante, geolocalización, evidencias e
   informes.
3. Fuente oficial de provincia, municipio, actividad económica y tipo de
   establecimiento.
4. Tipos y cantidades de adjuntos obligatorios para solicitudes BPM.
