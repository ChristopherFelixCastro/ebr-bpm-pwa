CREATE OR REPLACE FUNCTION risk_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'published risk version immutable'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'published risk version immutable'; END IF;
    IF NEW.status='PUBLISHED' THEN
      IF NEW.risk_rule_set_id IS DISTINCT FROM OLD.risk_rule_set_id OR NEW.version_number IS DISTINCT FROM OLD.version_number THEN RAISE EXCEPTION 'invalid publication'; END IF;
      IF (SELECT count(*) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>6 OR (SELECT array_agg(code ORDER BY code) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>ARRAY['BPM','HACCP','INABIE','REJECTIONS','SAMPLING','VOLUME'] OR (SELECT sum(weight) FROM risk_factors WHERE risk_rule_version_id=NEW.id)<>1.0000 THEN RAISE EXCEPTION 'invalid factors'; END IF;
      IF EXISTS(SELECT 1 FROM risk_factors f WHERE f.risk_rule_version_id=NEW.id AND (SELECT array_agg(score ORDER BY score) FROM risk_factor_options WHERE risk_factor_id=f.id)<>ARRAY[1.00::numeric,1.67::numeric,2.33::numeric,3.00::numeric]) THEN RAISE EXCEPTION 'invalid options'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
