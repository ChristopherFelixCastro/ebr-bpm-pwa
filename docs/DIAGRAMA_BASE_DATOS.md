# Diagrama de la base de datos de SIRA Tech

Esquema PostgreSQL consultado en modo **solo lectura**. Se encontraron **63 tablas**. Última migración aplicada: **0040_report_content**.

Cada bloque muestra las tablas principales de un área. `PK` identifica la clave primaria y `FK` una referencia a otra tabla. Las líneas representan claves foráneas reales de PostgreSQL. Para mantener cada vista legible, las referencias a tablas de otra área se explican en el mapa general y no se repiten en cada bloque.

## Mapa general

```mermaid
flowchart LR
  US[Usuarios y empresas] --> SO[Solicitudes y casos]
  SO --> AS[Asignación y agenda]
  AS --> IN[Inspección]
  CO[Plantillas BPM, reglas EBR y catálogos] --> IN
  IN --> CA[Cálculo de riesgo]
  CA --> RE[Revisión]
  RE --> RP[Informe PDF]
  RP --> CI[Cierre del expediente]
  US --> MA[Correo y auditoría]
  SO --> MA

```

## Identidad, empresas y contactos

```mermaid
erDiagram
  roles {
    uuid id PK
    text code
    text name
  }
  users {
    uuid id PK
    uuid role_id FK
    text full_name
    enum status
  }
  refresh_tokens {
    uuid id PK
    uuid user_id FK
    uuid replaced_by_id FK
  }
  password_reset_tokens {
    uuid id PK
    uuid user_id FK
  }
  user_authorization_documents {
    uuid id PK
    uuid user_id FK
    uuid uploaded_by_user_id FK
    uuid reviewed_by_user_id FK
    uuid archived_by_user_id FK
    character_varying file_name
    enum status
  }
  user_company_memberships {
    uuid id PK
    uuid user_id FK
    uuid company_id FK
  }
  companies {
    uuid id PK
    text legal_name
    text trade_name
  }
  establishments {
    uuid id PK
    uuid company_id FK
    text name
    enum status
  }
  establishment_operational_profiles {
    uuid id PK
    uuid establishment_id FK
  }
  contacts {
    uuid id PK
    text full_name
  }
  company_contacts {
    uuid id PK
    uuid company_id FK
    uuid contact_id FK
  }
  establishment_contacts {
    uuid id PK
    uuid establishment_id FK
    uuid contact_id FK
  }
  companies ||--o{ company_contacts : company_id
  contacts ||--o{ company_contacts : contact_id
  contacts ||--o{ establishment_contacts : contact_id
  establishments ||--o{ establishment_contacts : establishment_id
  establishments ||--o{ establishment_operational_profiles : establishment_id
  companies ||--o{ establishments : company_id
  users ||--o{ password_reset_tokens : user_id
  users ||--o{ refresh_tokens : user_id
  users ||--o{ user_authorization_documents : archived_by_user_id
  users ||--o{ user_authorization_documents : reviewed_by_user_id
  users ||--o{ user_authorization_documents : uploaded_by_user_id
  users ||--o{ user_authorization_documents : user_id
  companies ||--o{ user_company_memberships : company_id
  users ||--o{ user_company_memberships : user_id
  roles ||--o{ users : role_id
```

## Solicitudes y origen de casos

```mermaid
erDiagram
  company_requests {
    uuid id PK
    uuid company_id FK
    uuid establishment_id FK
    uuid created_by_user_id FK
    text reason
    enum status
  }
  request_documents {
    uuid id PK
    uuid request_id FK
    uuid validated_by_user_id FK
    uuid archived_by_user_id FK
    character_varying file_name
    enum status
  }
  request_contacts {
    uuid id PK
    uuid request_id FK
    uuid contact_id FK
    uuid removed_by_user_id FK
  }
  request_status_transitions {
    uuid id PK
    uuid request_id FK
    uuid changed_by_user_id FK
    text reason
  }
  cases {
    uuid id PK
    uuid request_id FK
    uuid company_id FK
    uuid establishment_id FK
    enum origin
    enum status
  }
  institutional_program_cases {
    uuid case_id PK
    uuid created_by_user_id FK
    text reason
  }
  health_alerts {
    uuid case_id PK
    uuid decided_by_user_id FK
    uuid created_by_user_id FK
    character_varying alert_number
    enum decision
  }
  complaints {
    uuid case_id PK
    uuid decided_by_user_id FK
    uuid created_by_user_id FK
    enum decision
  }
  case_status_transitions {
    uuid id PK
    uuid case_id FK
    uuid changed_by_user_id FK
    text reason
  }
  cases ||--o{ case_status_transitions : case_id
  company_requests ||--o| cases : request_id
  cases ||--o| complaints : case_id
  cases ||--o| health_alerts : case_id
  cases ||--o| institutional_program_cases : case_id
  company_requests ||--o{ request_contacts : request_id
  company_requests ||--o{ request_documents : request_id
  company_requests ||--o{ request_status_transitions : request_id
```

## Asignación y agenda

```mermaid
erDiagram
  case_assignments {
    uuid id PK
    uuid case_id FK
    uuid evaluator_user_id FK
    uuid assigned_by_user_id FK
    uuid unassigned_by_user_id FK
  }
  case_assignment_transitions {
    uuid id PK
    uuid case_assignment_id FK
    uuid case_id FK
    uuid from_evaluator_user_id FK
    uuid to_evaluator_user_id FK
    uuid performed_by_user_id FK
    enum event_type
    text reason
  }
  case_schedule_entries {
    uuid id PK
    uuid case_id FK
    uuid case_assignment_id FK
    uuid rescheduled_from_schedule_id FK
    uuid scheduled_by_user_id FK
    uuid cancelled_by_user_id FK
    enum status
  }
  case_schedule_transitions {
    uuid id PK
    uuid schedule_entry_id FK
    uuid case_id FK
    uuid previous_schedule_entry_id FK
    uuid performed_by_user_id FK
    enum event_type
    text reason
  }
  case_assignments ||--o{ case_assignment_transitions : case_assignment_id
  case_assignments ||--o{ case_schedule_entries : case_assignment_id
  case_schedule_entries ||--o{ case_schedule_transitions : previous_schedule_entry_id
  case_schedule_entries ||--o{ case_schedule_transitions : schedule_entry_id
```

## Catálogos, plantillas BPM y reglas EBR

```mermaid
erDiagram
  catalog_definitions {
    uuid id PK
    uuid current_published_version_id FK
    character_varying code
    character_varying name
  }
  catalog_versions {
    uuid id PK
    uuid catalog_id FK
    uuid published_by_user_id FK
    uuid retired_by_user_id FK
    integer version_number
    enum status
  }
  catalog_entries {
    uuid id PK
    uuid catalog_version_id FK
    uuid parent_entry_id FK
    character_varying code
    character_varying name
  }
  bpm_templates {
    uuid id PK
    uuid current_published_version_id FK
    character_varying code
    character_varying name
  }
  bpm_template_versions {
    uuid id PK
    uuid template_id FK
    uuid published_by_user_id FK
    uuid retired_by_user_id FK
    integer version_number
    enum status
  }
  bpm_template_items {
    uuid id PK
    uuid template_version_id FK
    uuid parent_item_id FK
    text title
  }
  bpm_criterion_guidance_items {
    uuid id PK
    uuid template_version_id FK
    uuid criterion_item_id FK
  }
  risk_rule_sets {
    uuid id PK
    uuid current_published_version_id FK
    character_varying code
    character_varying name
  }
  risk_rule_versions {
    uuid id PK
    uuid risk_rule_set_id FK
    uuid published_by_user_id FK
    uuid retired_by_user_id FK
    integer version_number
    enum status
  }
  risk_factors {
    uuid id PK
    uuid risk_rule_version_id FK
    character_varying code
    character_varying name
  }
  risk_factor_options {
    uuid id PK
    uuid risk_factor_id FK
    character_varying code
  }
  food_risk_categories {
    uuid id PK
    uuid risk_rule_version_id FK
    character_varying code
    character_varying name
  }
  food_risk_subcategories {
    uuid id PK
    uuid category_id FK
    character_varying name
    smallint risk_score
  }
  inspection_frequency_ranges {
    uuid id PK
    uuid risk_rule_version_id FK
    enum frequency
  }
  official_import_runs {
    uuid id PK
    uuid actor_user_id FK
    uuid bpm_template_version_id FK
    uuid catalog_version_id FK
    uuid risk_rule_version_id FK
    enum status
  }
  official_import_files {
    uuid id PK
    uuid import_run_id FK
    character_varying file_name
  }
  bpm_template_items ||--o{ bpm_criterion_guidance_items : criterion_item_id
  bpm_template_items ||--o{ bpm_criterion_guidance_items : template_version_id
  bpm_template_versions ||--o{ bpm_criterion_guidance_items : template_version_id
  bpm_template_versions ||--o{ bpm_template_items : template_version_id
  bpm_templates ||--o{ bpm_template_versions : template_id
  bpm_template_versions ||--o{ bpm_templates : current_published_version_id
  catalog_versions ||--o{ catalog_definitions : current_published_version_id
  catalog_versions ||--o{ catalog_entries : catalog_version_id
  catalog_definitions ||--o{ catalog_versions : catalog_id
  risk_rule_versions ||--o{ food_risk_categories : risk_rule_version_id
  food_risk_categories ||--o{ food_risk_subcategories : category_id
  risk_rule_versions ||--o{ inspection_frequency_ranges : risk_rule_version_id
  official_import_runs ||--o{ official_import_files : import_run_id
  bpm_template_versions ||--o{ official_import_runs : bpm_template_version_id
  catalog_versions ||--o{ official_import_runs : catalog_version_id
  risk_rule_versions ||--o{ official_import_runs : risk_rule_version_id
  risk_factors ||--o{ risk_factor_options : risk_factor_id
  risk_rule_versions ||--o{ risk_factors : risk_rule_version_id
  risk_rule_versions ||--o{ risk_rule_sets : current_published_version_id
  risk_rule_sets ||--o{ risk_rule_versions : risk_rule_set_id
```

## Inspección y cálculo

```mermaid
erDiagram
  inspections {
    uuid id PK
    uuid case_id FK
    uuid case_assignment_id FK
    uuid evaluator_user_id FK
    uuid bpm_template_version_id FK
    uuid risk_rule_version_id FK
    uuid created_by_user_id FK
    enum status
  }
  inspection_bpm_responses {
    uuid id PK
    uuid inspection_id FK
    uuid bpm_item_id FK
    enum response_value
  }
  inspection_risk_factor_selections {
    uuid id PK
    uuid inspection_id FK
    uuid risk_factor_id FK
    uuid risk_factor_option_id FK
  }
  inspection_food_snapshots {
    uuid id PK
    uuid inspection_id FK
    uuid food_risk_subcategory_id FK
  }
  inspection_evidence {
    uuid id PK
    uuid inspection_id FK
    uuid uploaded_by_user_id FK
    uuid deleted_by_user_id FK
    uuid validated_by_user_id FK
    uuid bpm_item_id FK
    enum status
  }
  inspection_location_captures {
    uuid id PK
    uuid inspection_id FK
    uuid actor_user_id FK
  }
  inspection_operations {
    uuid operation_id PK
    uuid inspection_id FK
    uuid actor_user_id FK
    enum status
  }
  inspection_calculations {
    uuid id PK
    uuid inspection_id FK
    uuid bpm_template_version_id FK
    uuid risk_rule_version_id FK
    uuid frequency_range_id FK
    uuid calculated_by_user_id FK
    uuid superseded_by_user_id FK
    enum status
    enum frequency
  }
  inspection_calculation_bpm_snapshots {
    uuid id PK
    uuid calculation_id FK
    uuid bpm_item_id FK
    enum response_value
  }
  inspection_calculation_factor_snapshots {
    uuid id PK
    uuid calculation_id FK
    uuid risk_factor_id FK
    uuid risk_factor_option_id FK
  }
  inspection_calculation_food_snapshots {
    uuid id PK
    uuid calculation_id FK
    uuid inspection_food_snapshot_id FK
    uuid food_risk_subcategory_id FK
  }
  inspection_calculation_frequency_snapshots {
    uuid calculation_id PK
    uuid frequency_range_id FK
    enum frequency
  }
  inspections ||--o{ inspection_bpm_responses : inspection_id
  inspection_calculations ||--o{ inspection_calculation_bpm_snapshots : calculation_id
  inspection_calculations ||--o{ inspection_calculation_factor_snapshots : calculation_id
  inspection_calculations ||--o{ inspection_calculation_food_snapshots : calculation_id
  inspection_food_snapshots ||--o{ inspection_calculation_food_snapshots : inspection_food_snapshot_id
  inspection_calculations ||--o| inspection_calculation_frequency_snapshots : calculation_id
  inspections ||--o{ inspection_calculations : inspection_id
  inspections ||--o{ inspection_evidence : inspection_id
  inspections ||--o{ inspection_food_snapshots : inspection_id
  inspections ||--o{ inspection_location_captures : inspection_id
  inspections ||--o{ inspection_operations : inspection_id
  inspections ||--o{ inspection_risk_factor_selections : inspection_id
```

## Revisión, informes y cierre

```mermaid
erDiagram
  inspection_review_cycles {
    uuid id PK
    uuid inspection_id FK
    uuid reviewer_user_id FK
    uuid resubmitted_by_user_id FK
    uuid approved_by_user_id FK
    uuid initial_calculation_id FK
    uuid current_calculation_id FK
    enum status
  }
  inspection_review_correction_items {
    uuid id PK
    uuid review_cycle_id FK
    uuid bpm_item_id FK
    uuid marked_by_user_id FK
    uuid corrected_by_user_id FK
    enum status
  }
  inspection_review_events {
    uuid id PK
    uuid inspection_id FK
    uuid review_cycle_id FK
    uuid actor_user_id FK
    uuid calculation_id FK
    character_varying event_type
    text reason
  }
  inspection_reports {
    uuid id PK
    uuid inspection_id FK
    uuid calculation_id FK
    uuid generated_by_user_id FK
    uuid official_by_user_id FK
    uuid review_cycle_id FK
    uuid archived_by_user_id FK
    enum status
    character_varying file_name
  }
  inspection_report_participants {
    uuid id PK
    uuid report_id FK
    uuid user_id FK
  }
  inspection_report_contents {
    uuid inspection_id PK
    uuid updated_by_user_id FK
  }
  inspection_closures {
    uuid id PK
    uuid inspection_id FK
    uuid case_id FK
    uuid official_report_id FK
    uuid closed_by_user_id FK
  }
  inspection_reports ||--o{ inspection_closures : official_report_id
  inspection_reports ||--o{ inspection_report_participants : report_id
  inspection_review_cycles ||--o{ inspection_reports : review_cycle_id
  inspection_review_cycles ||--o{ inspection_review_correction_items : review_cycle_id
  inspection_review_cycles ||--o{ inspection_review_events : review_cycle_id
```

## Soporte y trazabilidad

```mermaid
erDiagram
  mail_outbox {
    uuid id PK
    uuid user_id FK
    text kind
    text status
  }
  audit_events {
    uuid id PK
    uuid actor_user_id FK
  }
  schema_migrations {
    integer version PK
    text name
  }
```

## Relaciones entre áreas

- Un usuario tiene un rol y puede pertenecer a una empresa. Una empresa puede tener establecimientos y contactos.
- Una solicitud empresarial apunta a una empresa y un establecimiento. Un caso puede originarse en una solicitud, una denuncia, una alerta LAPCH o un programa institucional.
- Un caso puede tener asignaciones y entradas de agenda. Una inspección pertenece a un caso y a un evaluador; toma versiones concretas de la plantilla BPM y de la regla EBR.
- Las respuestas BPM, selecciones de factores, productos, evidencias y ubicaciones pertenecen a la inspección. Los cálculos guardan instantáneas para preservar el resultado histórico.
- La revisión puede devolver criterios para corrección. Los informes se generan a partir de un cálculo; el cierre exige un informe oficial.

## Cómo intervienen las migraciones

Las migraciones `*.up.sql` crean o modifican tablas, columnas, índices, restricciones y reglas; `*.down.sql` describe el retroceso correspondiente. `schema_migrations` registra qué versiones se aplicaron. **El diagrama representa el estado final de la base consultada, no un archivo SQL aislado.** Al añadir una migración y aplicarla, vuelva a ejecutar `node scripts/generate-db-diagram.mjs` desde la raíz del repositorio para actualizar este documento. El comando solo consulta metadatos y reescribe este Markdown; no modifica datos de la base.

Para verificar antes que la base corresponde a los archivos del proyecto: `npm run db:verify --workspace @ebr-bpm/api`. Si el diagrama muestra una migración anterior a la última del repositorio, aplique primero las pendientes en el entorno correcto.
