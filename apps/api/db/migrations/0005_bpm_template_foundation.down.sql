DROP TABLE IF EXISTS bpm_template_items;
ALTER TABLE bpm_templates DROP CONSTRAINT IF EXISTS bpm_templates_current_version_fk;
DROP TABLE IF EXISTS bpm_template_versions;
DROP TABLE IF EXISTS bpm_templates;
DROP FUNCTION IF EXISTS bpm_item_guard(); DROP FUNCTION IF EXISTS bpm_version_guard(); DROP FUNCTION IF EXISTS bpm_template_guard();
DROP TYPE IF EXISTS bpm_template_status; DROP TYPE IF EXISTS bpm_response_value; DROP TYPE IF EXISTS bpm_criticality; DROP TYPE IF EXISTS bpm_item_kind;
