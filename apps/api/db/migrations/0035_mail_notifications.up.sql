CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash char(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR used_at >= created_at)
);
CREATE INDEX password_reset_tokens_user_recent ON password_reset_tokens(user_id, created_at DESC);

CREATE TABLE mail_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('PUBLIC_COMPLAINT_RECEIVED','CASE_ASSIGNED','INSPECTION_RETURNED','USER_APPROVED','PASSWORD_CHANGED')),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_key text NOT NULL,
  recipient_email text NOT NULL,
  target_path text NOT NULL CHECK (target_path LIKE '/%' AND target_path NOT LIKE '//%'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENDING','SENT')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, user_id, entity_key)
);
CREATE INDEX mail_outbox_pending ON mail_outbox(next_attempt_at, created_at) WHERE status <> 'SENT';
