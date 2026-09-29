ALTER TABLE mail_outbox ADD COLUMN encrypted_token text;
ALTER TABLE mail_outbox DROP CONSTRAINT mail_outbox_kind_check;
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_kind_check CHECK (kind IN ('PUBLIC_COMPLAINT_RECEIVED','CASE_ASSIGNED','INSPECTION_RETURNED','USER_APPROVED','PASSWORD_CHANGED','PASSWORD_RESET'));
ALTER TABLE mail_outbox DROP CONSTRAINT mail_outbox_status_check;
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_status_check CHECK (status IN ('PENDING','SENDING','SENT','SKIPPED'));
ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_reset_token_check CHECK (kind='PASSWORD_RESET' OR encrypted_token IS NULL);
