INSERT INTO roles(code,name,is_universal) VALUES ('AUDIT_TEST','Auditoría de prueba',false);
INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Actor de auditoría','audit.actor@example.test','hash','APPROVED' FROM roles WHERE code='AUDIT_TEST';
INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source,metadata) VALUES ('SYSTEM',gen_random_uuid(),'SYSTEM_CHECK','SUCCESS','SYSTEM','{}');
INSERT INTO audit_events(actor_user_id,actor_type,correlation_id,action,entity_type,entity_id,outcome,source,metadata) SELECT id,'USER',gen_random_uuid(),'USER_CHECK','USER',id,'SUCCESS','HTTP','{"changed_fields":["status"]}' FROM users WHERE email_normalized='audit.actor@example.test';
DO $$ DECLARE actor uuid; BEGIN
  SELECT id INTO actor FROM users WHERE email_normalized='audit.actor@example.test';
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source) VALUES ('USER',gen_random_uuid(),'BAD','SUCCESS','HTTP'); RAISE EXCEPTION 'USER without actor accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_user_id,actor_type,correlation_id,action,outcome,source) VALUES (actor,'SYSTEM',gen_random_uuid(),'BAD','SUCCESS','SYSTEM'); RAISE EXCEPTION 'SYSTEM with actor accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source) VALUES ('SYSTEM',gen_random_uuid(),'lowercase','SUCCESS','SYSTEM'); RAISE EXCEPTION 'lowercase action accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source) VALUES ('SYSTEM',gen_random_uuid(),'   ','SUCCESS','SYSTEM'); RAISE EXCEPTION 'blank action accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source,metadata) VALUES ('SYSTEM',gen_random_uuid(),'BAD_META','SUCCESS','SYSTEM','[]'); RAISE EXCEPTION 'array metadata accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source,metadata) VALUES ('SYSTEM',gen_random_uuid(),'BAD_META','SUCCESS','SYSTEM','"text"'); RAISE EXCEPTION 'text metadata accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source,metadata) VALUES ('SYSTEM',gen_random_uuid(),'BAD_META','SUCCESS','SYSTEM','null'); RAISE EXCEPTION 'null metadata accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO audit_events(actor_type,correlation_id,action,outcome,source,metadata) VALUES ('SYSTEM',gen_random_uuid(),'BAD_META','SUCCESS','SYSTEM','{"entries":[{"PHONE":"x"}]}'); RAISE EXCEPTION 'nested array sensitive metadata accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE audit_events SET action='CHANGED'; RAISE EXCEPTION 'audit update accepted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN DELETE FROM audit_events; RAISE EXCEPTION 'audit delete accepted'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN DELETE FROM users WHERE id=actor; RAISE EXCEPTION 'referenced actor deleted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
