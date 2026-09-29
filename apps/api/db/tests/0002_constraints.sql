INSERT INTO roles(code,name,is_universal) VALUES ('ADMIN','Administrador',false),('UNIVERSAL','Universal',true) ON CONFLICT (code) DO NOTHING;
INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Usuario','constraints.user@example.test','hash','APPROVED' FROM roles WHERE code='ADMIN';
INSERT INTO refresh_tokens(user_id,token_hash,expires_at) SELECT id,'x',now()+interval '1 day' FROM users WHERE email_normalized='constraints.user@example.test';
DO $$ BEGIN
  BEGIN UPDATE refresh_tokens SET replaced_by_id=id WHERE token_hash='x'; RAISE EXCEPTION 'self token accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO companies(legal_name) VALUES ('Constraints Empresa');
INSERT INTO establishments(company_id,name) SELECT id,'Planta' FROM companies WHERE legal_name='Constraints Empresa';
INSERT INTO contacts(full_name,identity_document) VALUES ('Contacto 1','1-2'),('Contacto 2',NULL);
DO $$ BEGIN
  BEGIN INSERT INTO users(role_id,full_name,email,password_hash) SELECT id,'Otro',' CONSTRAINTS.USER@EXAMPLE.TEST ','hash' FROM roles WHERE code='ADMIN'; RAISE EXCEPTION 'duplicate normalized email accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN INSERT INTO contacts(full_name,identity_document) VALUES ('Documento repetido','12'); RAISE EXCEPTION 'duplicate normalized document accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
UPDATE companies SET rnc='1-31-123' WHERE legal_name='Constraints Empresa';
DO $$ BEGIN BEGIN INSERT INTO companies(legal_name,rnc) VALUES ('Constraints Otra','131123'); RAISE EXCEPTION 'duplicate normalized RNC accepted'; EXCEPTION WHEN unique_violation THEN NULL; END; END $$;
DO $$ DECLARE old_version integer; old_updated timestamptz; new_version integer; new_updated timestamptz; BEGIN
  SELECT version,updated_at INTO old_version,old_updated FROM companies WHERE legal_name='Constraints Empresa'; PERFORM pg_sleep(0.001); UPDATE companies SET trade_name='Nueva' WHERE legal_name='Constraints Empresa'; SELECT version,updated_at INTO new_version,new_updated FROM companies WHERE legal_name='Constraints Empresa';
  IF new_version <> old_version + 1 OR new_updated <= old_updated THEN RAISE EXCEPTION 'version or updated_at not changed'; END IF;
END $$;
INSERT INTO establishment_operational_profiles(establishment_id,effective_from,effective_to) SELECT id,CURRENT_DATE,CURRENT_DATE+1 FROM establishments;
DO $$ BEGIN
  BEGIN INSERT INTO establishment_operational_profiles(establishment_id,effective_from,effective_to) SELECT id,CURRENT_DATE,CURRENT_DATE+2 FROM establishments; RAISE EXCEPTION 'overlapping profile accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
INSERT INTO establishment_operational_profiles(establishment_id,effective_from) SELECT id,CURRENT_DATE+1 FROM establishments;
INSERT INTO company_contacts(company_id,contact_id,relationship_type,is_primary,effective_from) SELECT (SELECT id FROM companies),(SELECT id FROM contacts ORDER BY full_name LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE;
DO $$ BEGIN
  BEGIN INSERT INTO company_contacts(company_id,contact_id,relationship_type,is_primary,effective_from) SELECT (SELECT id FROM companies),(SELECT id FROM contacts ORDER BY full_name DESC LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE; RAISE EXCEPTION 'two primary contacts accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
DO $$ BEGIN
  BEGIN INSERT INTO company_contacts(company_id,contact_id,relationship_type,is_primary,effective_from) SELECT (SELECT id FROM companies),(SELECT id FROM contacts ORDER BY full_name LIMIT 1),'PRIMARY_CONTACT',false,CURRENT_DATE; RAISE EXCEPTION 'duplicate contact relation accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
INSERT INTO company_contacts(company_id,contact_id,relationship_type,is_primary,effective_from,effective_to) SELECT (SELECT id FROM companies),(SELECT id FROM contacts ORDER BY full_name DESC LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE-10,CURRENT_DATE;
INSERT INTO establishment_contacts(establishment_id,contact_id,relationship_type,is_primary,effective_from) SELECT (SELECT id FROM establishments),(SELECT id FROM contacts ORDER BY full_name LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE;
DO $$ BEGIN
  BEGIN INSERT INTO establishment_contacts(establishment_id,contact_id,relationship_type,is_primary,effective_from) SELECT (SELECT id FROM establishments),(SELECT id FROM contacts ORDER BY full_name DESC LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE; RAISE EXCEPTION 'two establishment primary contacts accepted'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
END $$;
INSERT INTO establishment_contacts(establishment_id,contact_id,relationship_type,is_primary,effective_from,effective_to) SELECT (SELECT id FROM establishments),(SELECT id FROM contacts ORDER BY full_name DESC LIMIT 1),'PRIMARY_CONTACT',true,CURRENT_DATE-10,CURRENT_DATE;
DO $$ BEGIN
  BEGIN DELETE FROM roles WHERE code='ADMIN'; RAISE EXCEPTION 'restrict FK failed'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
