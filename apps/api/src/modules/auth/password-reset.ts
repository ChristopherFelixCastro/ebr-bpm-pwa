import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { writeAuthAudit } from '../../core/audit/auth-audit.service.js';
import { hashPassword } from '../../core/auth/password.js';
import { enqueueAlert, enqueuePasswordReset } from '../../core/mail/mail.service.js';
import { withTransaction } from '../../db/client.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export async function requestPasswordReset(email: string, correlationId: string) {
  const started = Date.now();
  try {
    if (env.MAIL_MODE === 'disabled') return;
    await withTransaction(async (client) => {
      const found = await client.query<{ id: string; email: string }>("SELECT id,email FROM users WHERE email_normalized=$1 AND status='APPROVED' FOR UPDATE", [email]);
      const user = found.rows[0];
      if (!user) return;
      const recent = await client.query<{ count: number; last: Date | null }>(`SELECT count(*)::int AS count,max(created_at) AS last
        FROM password_reset_tokens WHERE user_id=$1 AND created_at>now()-interval '1 hour'`, [user.id]);
      if (recent.rows[0].count >= 5 || (recent.rows[0].last && Date.now() - new Date(recent.rows[0].last).getTime() < 120000)) return;
      const token = randomBytes(32).toString('base64url');
      const created = await client.query<{ id: string }>(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
        VALUES($1,$2,now()+interval '30 minutes') RETURNING id`, [user.id, digest(token)]);
      await enqueuePasswordReset(client, user.id, created.rows[0].id, user.email, token);
      await writeAuthAudit({ action: 'AUTH_FORGOT_PASSWORD_REQUESTED', outcome: 'SUCCESS', correlationId, userId: user.id, client });
    });
  } finally {
    const remaining = 300 - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

export async function consumePasswordReset(token: string, password: string, correlationId: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return withTransaction(async (client) => {
    const found = await client.query<{ id: string; user_id: string }>(`SELECT t.id,t.user_id FROM password_reset_tokens t
      JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>now()
      AND u.status='APPROVED' FOR UPDATE OF t`, [digest(token)]);
    const row = found.rows[0];
    if (!row) return false;
    const hashed = await hashPassword(password);
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashed, row.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [row.user_id]);
    await client.query("UPDATE mail_outbox SET status='SKIPPED',encrypted_token=NULL,last_error_code='USED' WHERE kind='PASSWORD_RESET' AND user_id=$1 AND status='PENDING'", [row.user_id]);
    await client.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND revoked_at IS NULL', [row.user_id]);
    await enqueueAlert(client, 'PASSWORD_CHANGED', row.user_id, row.id, '/login');
    await writeAuthAudit({ action: 'AUTH_PASSWORD_RESET', outcome: 'SUCCESS', correlationId, userId: row.user_id, client });
    return true;
  });
}
