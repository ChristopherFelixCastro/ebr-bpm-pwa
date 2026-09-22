DO $$
DECLARE run_id uuid;
BEGIN
  INSERT INTO official_import_runs(import_type,mode,status,package_sha256,functional_sha256,manifest_sha256,actor_label)
  VALUES('BPM','DRY_RUN','STARTED',repeat('a',64),repeat('f',64),repeat('b',64),'sql-test') RETURNING id INTO run_id;
  INSERT INTO official_import_files(import_run_id,logical_name,file_name,content_sha256,sheet_names)
  VALUES(run_id,'allItems','all-items.sql',repeat('c',64),'[]');
  UPDATE official_import_runs SET status='SUCCEEDED',finished_at=clock_timestamp(),rows_read=2,rows_accepted=2,report='{"validated":true}' WHERE id=run_id;
  BEGIN
    UPDATE official_import_runs SET rows_read=3 WHERE id=run_id;
    RAISE EXCEPTION 'completed import was mutable';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  BEGIN
    INSERT INTO official_import_files(import_run_id,logical_name,file_name,content_sha256)
    VALUES(run_id,'late','late.xlsx',repeat('d',64));
    RAISE EXCEPTION 'completed import accepted a file';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END $$;
