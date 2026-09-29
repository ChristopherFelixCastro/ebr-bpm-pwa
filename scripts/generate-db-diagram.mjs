import 'dotenv/config';
import { Client } from 'pg';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const groups = [
  ['Identidad, empresas y contactos', ['roles', 'users', 'refresh_tokens', 'password_reset_tokens', 'user_authorization_documents', 'user_company_memberships', 'companies', 'establishments', 'establishment_operational_profiles', 'contacts', 'company_contacts', 'establishment_contacts']],
  ['Solicitudes y origen de casos', ['company_requests', 'request_documents', 'request_contacts', 'request_status_transitions', 'cases', 'institutional_program_cases', 'health_alerts', 'complaints', 'case_status_transitions']],
  ['Asignación y agenda', ['case_assignments', 'case_assignment_transitions', 'case_schedule_entries', 'case_schedule_transitions']],
  ['Catálogos, plantillas BPM y reglas EBR', ['catalog_definitions', 'catalog_versions', 'catalog_entries', 'bpm_templates', 'bpm_template_versions', 'bpm_template_items', 'bpm_criterion_guidance_items', 'risk_rule_sets', 'risk_rule_versions', 'risk_factors', 'risk_factor_options', 'food_risk_categories', 'food_risk_subcategories', 'inspection_frequency_ranges', 'official_import_runs', 'official_import_files']],
  ['Inspección y cálculo', ['inspections', 'inspection_bpm_responses', 'inspection_risk_factor_selections', 'inspection_food_snapshots', 'inspection_evidence', 'inspection_location_captures', 'inspection_operations', 'inspection_calculations', 'inspection_calculation_bpm_snapshots', 'inspection_calculation_factor_snapshots', 'inspection_calculation_food_snapshots', 'inspection_calculation_frequency_snapshots']],
  ['Revisión, informes y cierre', ['inspection_review_cycles', 'inspection_review_correction_items', 'inspection_review_events', 'inspection_reports', 'inspection_report_participants', 'inspection_report_contents', 'inspection_closures']],
  ['Soporte y trazabilidad', ['mail_outbox', 'audit_events', 'schema_migrations']],
];

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.');
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  await db.query('BEGIN READ ONLY');
  const { rows: tables } = await db.query("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const { rows: columns } = await db.query(`SELECT c.table_name, c.column_name, c.data_type,
      EXISTS (SELECT 1 FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage ku
        ON ku.constraint_name = tc.constraint_name AND ku.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
          AND tc.table_name = c.table_name AND ku.column_name = c.column_name) AS is_pk
      FROM information_schema.columns c WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position`);
  const { rows: foreignKeys } = await db.query(`SELECT src.relname AS source_table, sa.attname AS source_column,
        dst.relname AS target_table, da.attname AS target_column
      FROM pg_constraint fk
      JOIN pg_class src ON src.oid = fk.conrelid
      JOIN pg_namespace sn ON sn.oid = src.relnamespace
      JOIN pg_class dst ON dst.oid = fk.confrelid
      JOIN LATERAL unnest(fk.conkey) WITH ORDINALITY sk(attnum, n) ON true
      JOIN LATERAL unnest(fk.confkey) WITH ORDINALITY tk(attnum, n) ON tk.n = sk.n
      JOIN pg_attribute sa ON sa.attrelid = src.oid AND sa.attnum = sk.attnum
      JOIN pg_attribute da ON da.attrelid = dst.oid AND da.attnum = tk.attnum
      WHERE fk.contype = 'f' AND sn.nspname = 'public'
      ORDER BY src.relname, sa.attname, dst.relname`);
  const { rows: migrations } = await db.query('SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1');
  await db.query('COMMIT');
  const known = new Set(groups.flatMap(([, names]) => names));
  const actual = new Set(tables.map(({ name }) => name));
  const unknown = [...actual].filter((name) => !known.has(name));
  const missing = [...known].filter((name) => !actual.has(name));
  if (unknown.length || missing.length) throw new Error(`Clasificación desactualizada. Sin grupo: ${unknown.join(', ') || 'ninguna'}. Ausentes: ${missing.join(', ') || 'ninguna'}.`);

  const lines = [
    '# Diagrama de la base de datos de SIRA Tech', '',
    `Esquema PostgreSQL consultado en modo **solo lectura**. Se encontraron **${tables.length} tablas**. Última migración aplicada: **${String(migrations[0]?.version).padStart(4, '0')}_${migrations[0]?.name}**.`, '',
    'Cada bloque muestra las tablas principales de un área. `PK` identifica la clave primaria y `FK` una referencia a otra tabla. Las líneas representan claves foráneas reales de PostgreSQL. Para mantener cada vista legible, las referencias a tablas de otra área se explican en el mapa general y no se repiten en cada bloque.', '',
    '## Mapa general', '', '```mermaid', 'flowchart LR',
    '  US[Usuarios y empresas] --> SO[Solicitudes y casos]',
    '  SO --> AS[Asignación y agenda]',
    '  AS --> IN[Inspección]',
    '  CO[Plantillas BPM, reglas EBR y catálogos] --> IN',
    '  IN --> CA[Cálculo de riesgo]',
    '  CA --> RE[Revisión]',
    '  RE --> RP[Informe PDF]',
    '  RP --> CI[Cierre del expediente]',
    '  US --> MA[Correo y auditoría]',
    '  SO --> MA', '', '```', '',
  ];
  const typeOf = (type) => type === 'USER-DEFINED' ? 'enum' : type.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const oneToOne = new Set(['cases.request_id', 'institutional_program_cases.case_id', 'health_alerts.case_id', 'complaints.case_id', 'inspection_calculation_frequency_snapshots.calculation_id', 'inspection_report_contents.inspection_id', 'inspection_closures.inspection_id']);
  const informative = new Set(['name', 'full_name', 'trade_name', 'legal_name', 'code', 'status', 'origin', 'version_number', 'response_value', 'frequency', 'risk_score', 'event_type', 'kind', 'decision', 'alert_number', 'reason', 'title', 'file_name']);
  for (const [title, names] of groups) {
    const set = new Set(names);
    lines.push(`## ${title}`, '', '```mermaid', 'erDiagram');
    for (const name of names) {
      lines.push(`  ${name} {`);
      const tableColumns = columns.filter((column) => column.table_name === name);
      const fkColumns = new Set(foreignKeys.filter((fk) => fk.source_table === name).map((fk) => fk.source_column));
      const selected = tableColumns.filter((column) => column.is_pk || fkColumns.has(column.column_name));
      selected.push(...tableColumns.filter((column) => informative.has(column.column_name) && !selected.includes(column)).slice(0, 2));
      if (!selected.length) selected.push(...tableColumns.slice(0, 1));
      for (const column of selected) lines.push(`    ${typeOf(column.data_type)} ${column.column_name}${column.is_pk ? ' PK' : fkColumns.has(column.column_name) ? ' FK' : ''}`);
      lines.push('  }');
    }
    for (const fk of foreignKeys.filter((item) => set.has(item.source_table) && set.has(item.target_table) && item.source_table !== item.target_table)) {
      lines.push(`  ${fk.target_table} ||--${oneToOne.has(`${fk.source_table}.${fk.source_column}`) ? 'o|' : 'o{'} ${fk.source_table} : ${fk.source_column}`);
    }
    lines.push('```', '');
  }
  lines.push('## Relaciones entre áreas', '',
    '- Un usuario tiene un rol y puede pertenecer a una empresa. Una empresa puede tener establecimientos y contactos.',
    '- Una solicitud empresarial apunta a una empresa y un establecimiento. Un caso puede originarse en una solicitud, una denuncia, una alerta LAPCH o un programa institucional.',
    '- Un caso puede tener asignaciones y entradas de agenda. Una inspección pertenece a un caso y a un evaluador; toma versiones concretas de la plantilla BPM y de la regla EBR.',
    '- Las respuestas BPM, selecciones de factores, productos, evidencias y ubicaciones pertenecen a la inspección. Los cálculos guardan instantáneas para preservar el resultado histórico.',
    '- La revisión puede devolver criterios para corrección. Los informes se generan a partir de un cálculo; el cierre exige un informe oficial.', '',
    '## Cómo intervienen las migraciones', '',
    'Las migraciones `*.up.sql` crean o modifican tablas, columnas, índices, restricciones y reglas; `*.down.sql` describe el retroceso correspondiente. `schema_migrations` registra qué versiones se aplicaron. **El diagrama representa el estado final de la base consultada, no un archivo SQL aislado.** Al añadir una migración y aplicarla, vuelva a ejecutar `node scripts/generate-db-diagram.mjs` desde la raíz del repositorio para actualizar este documento. El comando solo consulta metadatos y reescribe este Markdown; no modifica datos de la base.', '',
    'Para verificar antes que la base corresponde a los archivos del proyecto: `npm run db:verify --workspace @ebr-bpm/api`. Si el diagrama muestra una migración anterior a la última del repositorio, aplique primero las pendientes en el entorno correcto.', ''
  );
  const output = resolve('docs/DIAGRAMA_BASE_DATOS.md');
  await writeFile(output, lines.join('\n'), 'utf8');
  console.log(`Generado ${output}: ${tables.length} tablas, ${foreignKeys.length} columnas de FK.`);
} finally {
  await db.end().catch(() => {});
}
