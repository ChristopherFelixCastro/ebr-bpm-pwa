DO $$
DECLARE universal_role uuid; admin_role uuid; first_user uuid; second_user uuid;
BEGIN
  SELECT id INTO universal_role FROM roles WHERE code='UNIVERSAL'; SELECT id INTO admin_role FROM roles WHERE code='ADMIN';
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(universal_role,'Guard Universal 1','guard.universal.1@example.test','hash','APPROVED') RETURNING id INTO first_user;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES(universal_role,'Guard Universal 2','guard.universal.2@example.test','hash','APPROVED') RETURNING id INTO second_user;
  UPDATE users SET status='INACTIVE' WHERE role_id=universal_role AND status='APPROVED' AND id NOT IN(first_user,second_user);
  UPDATE users SET status='INACTIVE' WHERE id=second_user;
  BEGIN UPDATE users SET status='INACTIVE' WHERE id=first_user; RAISE EXCEPTION 'last status change accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE users SET role_id=admin_role WHERE id=first_user; RAISE EXCEPTION 'last role change accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN DELETE FROM users WHERE id=first_user; RAISE EXCEPTION 'last delete accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE users SET status='APPROVED' WHERE id=second_user;
  UPDATE users SET status='INACTIVE' WHERE id=first_user; UPDATE users SET status='APPROVED' WHERE id=first_user;
  UPDATE users SET role_id=admin_role WHERE id=first_user; UPDATE users SET role_id=universal_role WHERE id=first_user; DELETE FROM users WHERE id=first_user;
  INSERT INTO users(role_id,full_name,email,password_hash,status) VALUES
   (universal_role,'Guard Pending','guard.pending@example.test','hash','PENDING_VALIDATION'),
   (universal_role,'Guard Rejected','guard.rejected@example.test','hash','REJECTED'),
   (universal_role,'Guard Inactive','guard.inactive@example.test','hash','INACTIVE');
  BEGIN UPDATE users SET status='INACTIVE' WHERE id=second_user; RAISE EXCEPTION 'non-approved backup counted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
