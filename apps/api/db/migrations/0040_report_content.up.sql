CREATE TABLE inspection_report_contents (
  inspection_id uuid PRIMARY KEY REFERENCES inspections(id) ON DELETE RESTRICT,
  executive_summary text NOT NULL DEFAULT '',
  additional_findings text NOT NULL DEFAULT '',
  recommendations text NOT NULL DEFAULT '',
  updated_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (char_length(executive_summary) <= 4000),
  CHECK (char_length(additional_findings) <= 4000),
  CHECK (char_length(recommendations) <= 4000)
);
CREATE TRIGGER inspection_report_contents_version
  BEFORE UPDATE ON inspection_report_contents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_and_version();

ALTER TABLE inspection_reports
  ADD COLUMN report_snapshot jsonb,
  ADD COLUMN report_content_version integer NOT NULL DEFAULT 0;
