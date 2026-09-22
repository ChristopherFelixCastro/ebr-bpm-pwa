DO $$
DECLARE current_bpm uuid; current_bpm_parent uuid; other_bpm uuid; current_risk uuid; current_risk_parent uuid; other_risk uuid;
BEGIN
  IF (SELECT count(*) FROM bpm_templates WHERE is_default)>1 THEN RAISE EXCEPTION 'multiple default BPM templates'; END IF;
  IF (SELECT count(*) FROM risk_rule_sets WHERE is_default)>1 THEN RAISE EXCEPTION 'multiple default risk rule sets'; END IF;

  current_bpm:=effective_bpm_template_version(clock_timestamp());
  IF current_bpm IS NOT NULL THEN
    SELECT template_id INTO current_bpm_parent FROM bpm_template_versions WHERE id=current_bpm;
    IF NOT EXISTS(SELECT 1 FROM bpm_templates WHERE id=current_bpm_parent AND is_default) THEN RAISE EXCEPTION 'effective BPM is not from default resource'; END IF;
    INSERT INTO bpm_templates(code,name) VALUES('DEFAULT_0029_OTHER_BPM','Other BPM') RETURNING id INTO other_bpm;
    BEGIN UPDATE bpm_templates SET is_default=true WHERE id=other_bpm; RAISE EXCEPTION 'second default BPM accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
    BEGIN UPDATE bpm_templates SET is_default=false WHERE id=current_bpm_parent; RAISE EXCEPTION 'default BPM removed without replacement'; EXCEPTION WHEN check_violation THEN NULL; END;
  END IF;

  current_risk:=effective_risk_rule_version(clock_timestamp());
  IF current_risk IS NOT NULL THEN
    SELECT risk_rule_set_id INTO current_risk_parent FROM risk_rule_versions WHERE id=current_risk;
    IF NOT EXISTS(SELECT 1 FROM risk_rule_sets WHERE id=current_risk_parent AND is_default) THEN RAISE EXCEPTION 'effective risk is not from default resource'; END IF;
    INSERT INTO risk_rule_sets(code,name) VALUES('DEFAULT_0029_OTHER_RISK','Other risk') RETURNING id INTO other_risk;
    BEGIN UPDATE risk_rule_sets SET is_default=true WHERE id=other_risk; RAISE EXCEPTION 'second default risk accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
    BEGIN UPDATE risk_rule_sets SET is_default=false WHERE id=current_risk_parent; RAISE EXCEPTION 'default risk removed without replacement'; EXCEPTION WHEN check_violation THEN NULL; END;
  END IF;
END $$;
