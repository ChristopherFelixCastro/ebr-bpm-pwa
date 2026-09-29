ALTER TABLE inspection_reports
  ADD COLUMN render_variant text NOT NULL DEFAULT 'LEGACY'
  CHECK (render_variant IN ('LEGACY','SIRA_V2'));
