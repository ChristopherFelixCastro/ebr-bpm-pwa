CREATE OR REPLACE FUNCTION effective_bpm_template_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM bpm_template_versions WHERE status='PUBLISHED' AND retired_at IS NULL AND effective_from<=at_time AND (effective_to IS NULL OR effective_to>at_time) ORDER BY effective_from DESC,version_number DESC,id DESC LIMIT 1 $$;
CREATE OR REPLACE FUNCTION effective_risk_rule_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM risk_rule_versions WHERE status='PUBLISHED' AND retired_at IS NULL AND effective_from<=at_time AND (effective_to IS NULL OR effective_to>at_time) ORDER BY effective_from DESC,version_number DESC,id DESC LIMIT 1 $$;

DROP TRIGGER IF EXISTS risk_rule_sets_version ON risk_rule_sets;
DROP TRIGGER IF EXISTS risk_rule_sets_default_guard ON risk_rule_sets;
DROP TRIGGER IF EXISTS bpm_templates_default_guard ON bpm_templates;
DROP FUNCTION IF EXISTS risk_rule_set_default_guard();
DROP FUNCTION IF EXISTS bpm_template_default_guard();
DROP INDEX IF EXISTS risk_rule_sets_single_default_idx;
DROP INDEX IF EXISTS bpm_templates_single_default_idx;
ALTER TABLE risk_rule_sets DROP COLUMN is_default;
ALTER TABLE bpm_templates DROP COLUMN is_default;
