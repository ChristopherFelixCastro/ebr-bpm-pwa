DROP TRIGGER IF EXISTS official_import_files_guard ON official_import_files;
DROP FUNCTION IF EXISTS official_import_file_guard();
DROP TRIGGER IF EXISTS official_import_runs_guard ON official_import_runs;
DROP FUNCTION IF EXISTS official_import_run_guard();
DROP TABLE IF EXISTS official_import_files;
DROP TABLE IF EXISTS official_import_runs;
DROP TYPE IF EXISTS official_import_status;
DROP TYPE IF EXISTS official_import_mode;
DROP TYPE IF EXISTS official_import_type;
