CREATE FUNCTION report_variant_officialization_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='DRAFT' AND NEW.status='OFFICIAL' AND OLD.render_variant<>'SIRA_V2' THEN
    RAISE EXCEPTION 'legacy draft must be regenerated before officialization' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_variant_officialization_guard
  BEFORE UPDATE ON inspection_reports
  FOR EACH ROW EXECUTE FUNCTION report_variant_officialization_guard();
