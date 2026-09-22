INSERT INTO roles(code,name,is_universal) VALUES ('CATALOG_TEST','Catálogo prueba',false);
INSERT INTO users(role_id,full_name,email,password_hash,status) SELECT id,'Publicador','catalog.publisher@example.test','hash','APPROVED' FROM roles WHERE code='CATALOG_TEST';
INSERT INTO catalog_definitions(code,name,supports_hierarchy) VALUES ('TEST_TREE','Árbol',true),('TEST_FLAT','Plano',false);
INSERT INTO catalog_versions(catalog_id,version_number) SELECT id,1 FROM catalog_definitions WHERE code='TEST_TREE';
DO $$ DECLARE tree uuid; ver uuid; actor uuid; BEGIN
 SELECT d.id,v.id INTO tree,ver FROM catalog_definitions d JOIN catalog_versions v ON v.catalog_id=d.id WHERE d.code='TEST_TREE'; SELECT id INTO actor FROM users WHERE email_normalized='catalog.publisher@example.test';
 BEGIN UPDATE catalog_definitions SET code='CHANGED' WHERE id=tree; RAISE EXCEPTION 'code changed'; EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN UPDATE catalog_definitions SET supports_hierarchy=false WHERE id=tree; RAISE EXCEPTION 'hierarchy changed'; EXCEPTION WHEN raise_exception THEN NULL; END;
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type) VALUES(ver,'ROOT','Raíz','NODE');
 INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id) VALUES(ver,'CHILD','Hijo','LEAF',(SELECT id FROM catalog_entries WHERE catalog_version_id=ver AND code='ROOT'));
 BEGIN INSERT INTO catalog_entries(catalog_version_id,code,name,entry_type,parent_entry_id) VALUES(ver,'BAD','Malo','LEAF',(SELECT id FROM catalog_entries WHERE catalog_version_id=ver AND code='CHILD')); RAISE EXCEPTION 'leaf parent accepted'; EXCEPTION WHEN raise_exception THEN NULL; END;
 UPDATE catalog_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by_user_id=actor,publication_note='ok' WHERE id=ver;
 BEGIN UPDATE catalog_versions SET version_number=2 WHERE id=ver; RAISE EXCEPTION 'published version changed'; EXCEPTION WHEN raise_exception OR object_not_in_prerequisite_state THEN NULL; END;
END $$;
