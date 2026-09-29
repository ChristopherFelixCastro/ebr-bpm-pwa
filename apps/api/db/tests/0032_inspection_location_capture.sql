DO $$
DECLARE
  inspection_id uuid;
  evaluator_id uuid;
  old_version integer;
  capture_id uuid;
  operation_id uuid := gen_random_uuid();
BEGIN
  SELECT u.id INTO evaluator_id FROM users u WHERE u.email_normalized='evaluator.0026@example.test';
  SELECT i.id,i.version INTO inspection_id,old_version FROM inspections i
  WHERE i.evaluator_user_id=evaluator_id AND i.status='IN_PROGRESS'
  ORDER BY i.created_at DESC LIMIT 1;
  IF inspection_id IS NULL THEN RAISE EXCEPTION 'fixture inspection unavailable'; END IF;
  UPDATE inspections SET content_revision=content_revision+1 WHERE id=inspection_id;
  INSERT INTO inspection_location_captures(
    inspection_id,operation_id,actor_user_id,base_version,payload_hash,
    latitude,longitude,accuracy_meters,captured_at,resulting_version
  ) VALUES (
    inspection_id,operation_id,evaluator_id,old_version,repeat('a',64),
    18.4861,-69.9312,8.5,clock_timestamp(),old_version+1
  ) RETURNING id INTO capture_id;
  IF (SELECT version FROM inspections WHERE id=inspection_id)<>old_version+1 THEN
    RAISE EXCEPTION 'location did not advance inspection version';
  END IF;
  IF (SELECT latitude FROM inspection_location_captures WHERE id=capture_id)<>18.4861 THEN
    RAISE EXCEPTION 'location not stored';
  END IF;
  BEGIN
    INSERT INTO inspection_location_captures(
      inspection_id,operation_id,actor_user_id,base_version,payload_hash,
      latitude,longitude,accuracy_meters,captured_at,resulting_version
    ) VALUES (
      inspection_id,operation_id,evaluator_id,old_version,repeat('a',64),
      18.4861,-69.9312,8.5,clock_timestamp(),old_version+1
    );
    RAISE EXCEPTION 'duplicate operation accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO inspection_location_captures(
      inspection_id,operation_id,actor_user_id,base_version,payload_hash,
      latitude,longitude,accuracy_meters,captured_at,resulting_version
    ) VALUES (
      inspection_id,gen_random_uuid(),evaluator_id,old_version,repeat('b',64),
      91,-69.9312,8.5,clock_timestamp(),old_version+1
    );
    RAISE EXCEPTION 'invalid latitude accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
