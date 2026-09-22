DROP TABLE IF EXISTS catalog_entries;
ALTER TABLE catalog_definitions DROP CONSTRAINT IF EXISTS catalog_definitions_current_version_fk;
DROP TABLE IF EXISTS catalog_versions;
DROP TABLE IF EXISTS catalog_definitions;
DROP FUNCTION IF EXISTS catalog_entry_guard();
DROP FUNCTION IF EXISTS catalog_version_guard();
DROP FUNCTION IF EXISTS catalog_definition_guard();
DROP TYPE IF EXISTS catalog_version_status;
