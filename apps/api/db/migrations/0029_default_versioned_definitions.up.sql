ALTER TABLE bpm_templates ADD COLUMN is_default boolean NOT NULL DEFAULT false;
ALTER TABLE risk_rule_sets ADD COLUMN is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX bpm_templates_single_default_idx ON bpm_templates(is_default) WHERE is_default;
CREATE UNIQUE INDEX risk_rule_sets_single_default_idx ON risk_rule_sets(is_default) WHERE is_default;

WITH selected AS (
  SELECT v.template_id
  FROM bpm_template_versions v
  WHERE v.id=effective_bpm_template_version(clock_timestamp())
)
UPDATE bpm_templates t SET is_default=true FROM selected s WHERE t.id=s.template_id;

WITH selected AS (
  SELECT v.risk_rule_set_id
  FROM risk_rule_versions v
  WHERE v.id=effective_risk_rule_version(clock_timestamp())
)
UPDATE risk_rule_sets s SET is_default=true FROM selected x WHERE s.id=x.risk_rule_set_id;

CREATE OR REPLACE FUNCTION bpm_template_default_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.is_default THEN
    RAISE EXCEPTION 'default BPM template cannot be removed' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND OLD.is_default AND NOT NEW.is_default
     AND current_setting('app.default_definition_transition',true) IS DISTINCT FROM 'replace' THEN
    RAISE EXCEPTION 'default BPM template requires a replacement' USING ERRCODE='23514';
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE OR REPLACE FUNCTION risk_rule_set_default_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.is_default THEN
    RAISE EXCEPTION 'default risk rule set cannot be removed' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND OLD.is_default AND NOT NEW.is_default
     AND current_setting('app.default_definition_transition',true) IS DISTINCT FROM 'replace' THEN
    RAISE EXCEPTION 'default risk rule set requires a replacement' USING ERRCODE='23514';
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;

CREATE TRIGGER bpm_templates_default_guard BEFORE UPDATE OR DELETE ON bpm_templates FOR EACH ROW EXECUTE FUNCTION bpm_template_default_guard();
CREATE TRIGGER risk_rule_sets_default_guard BEFORE UPDATE OR DELETE ON risk_rule_sets FOR EACH ROW EXECUTE FUNCTION risk_rule_set_default_guard();
CREATE TRIGGER risk_rule_sets_version BEFORE UPDATE ON risk_rule_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

CREATE OR REPLACE FUNCTION effective_bpm_template_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT v.id
  FROM bpm_template_versions v
  JOIN bpm_templates t ON t.id=v.template_id AND t.is_default
  WHERE v.status='PUBLISHED'
    AND v.retired_at IS NULL
    AND v.effective_from<=at_time
    AND (v.effective_to IS NULL OR v.effective_to>at_time)
  ORDER BY v.effective_from DESC,v.version_number DESC,v.id DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION effective_risk_rule_version(at_time timestamptz DEFAULT clock_timestamp()) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT v.id
  FROM risk_rule_versions v
  JOIN risk_rule_sets s ON s.id=v.risk_rule_set_id AND s.is_default
  WHERE v.status='PUBLISHED'
    AND v.retired_at IS NULL
    AND v.effective_from<=at_time
    AND (v.effective_to IS NULL OR v.effective_to>at_time)
  ORDER BY v.effective_from DESC,v.version_number DESC,v.id DESC
  LIMIT 1
$$;
