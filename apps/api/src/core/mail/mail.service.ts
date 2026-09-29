import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { PoolClient } from 'pg';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';

export type AlertKind = 'PUBLIC_COMPLAINT_RECEIVED' | 'CASE_ASSIGNED' | 'INSPECTION_RETURNED' | 'USER_APPROVED' | 'PASSWORD_CHANGED';
type MailKind = AlertKind | 'PASSWORD_RESET';
const transporter = env.MAIL_MODE === 'disabled' ? null : nodemailer.createTransport({
  host: env.MAIL_SMTP_HOST,
  port: env.MAIL_SMTP_PORT,
  secure: env.MAIL_MODE === 'smtp' && env.MAIL_SMTP_PORT === 465,
  requireTLS: env.MAIL_MODE === 'smtp' && env.MAIL_SMTP_PORT !== 465,
  ...(env.MAIL_MODE === 'smtp' ? { auth: { user: env.MAIL_SMTP_USER!, pass: env.MAIL_SMTP_PASSWORD! } } : {}),
  connectionTimeout: 5000,
  socketTimeout: 5000,
});

export async function verifyMailConnection() {
  if (!transporter) return false;
  await transporter.verify();
  return true;
}

async function send(to: string, subject: string, text: string) {
  if (!transporter) throw new Error('MAIL_DISABLED');
  await transporter.sendMail({ from: env.MAIL_FROM!, to, subject, text });
}

export async function sendPasswordReset(to: string, token: string) {
  const url = new URL('/restablecer-clave', env.APP_PUBLIC_URL!);
  url.searchParams.set('token', token);
  await send(to, 'Restablecer contraseña — SIRA Tech',
    `Se solicitó cambiar la contraseña de tu cuenta. Abre este enlace durante los próximos 30 minutos:\n${url}\n\nSi no lo solicitaste, ignora este mensaje. No compartas el enlace.`);
}

function tokenKey() {
  return Buffer.from(hkdfSync('sha256', env.JWT_ACCESS_SECRET!, 'ebr-bpm-mail', 'reset-link-v1', 32));
}
function encryptToken(token: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(), nonce);
  return Buffer.concat([nonce, cipher.update(token, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64url');
}
function decryptToken(encrypted: string) {
  const bytes = Buffer.from(encrypted, 'base64url');
  const nonce = bytes.subarray(0, 12);
  const tag = bytes.subarray(bytes.length - 16);
  const cipher = createDecipheriv('aes-256-gcm', tokenKey(), nonce);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString('utf8');
}

export async function enqueuePasswordReset(client: PoolClient, userId: string, tokenId: string, recipient: string, token: string) {
  await client.query(`INSERT INTO mail_outbox(kind,user_id,entity_key,recipient_email,target_path,encrypted_token)
    VALUES('PASSWORD_RESET',$1,$2,$3,'/restablecer-clave',$4)`, [userId, tokenId, recipient, encryptToken(token)]);
}

export async function enqueueAlert(client: PoolClient, kind: AlertKind, userId: string, entityKey: string, targetPath: string) {
  if (env.MAIL_MODE === 'disabled') return;
  await client.query(`INSERT INTO mail_outbox(kind,user_id,entity_key,recipient_email,target_path)
    SELECT $1,u.id,$3,u.email,$4 FROM users u WHERE u.id=$2 AND u.status='APPROVED'
    ON CONFLICT(kind,user_id,entity_key) DO NOTHING`, [kind, userId, entityKey, targetPath]);
}

export async function enqueueAlertForRoles(client: PoolClient, kind: AlertKind, roles: string[], entityKey: string, targetPath: string) {
  if (env.MAIL_MODE === 'disabled') return;
  await client.query(`INSERT INTO mail_outbox(kind,user_id,entity_key,recipient_email,target_path)
    SELECT $1,u.id,$3,u.email,$4 FROM users u JOIN roles r ON r.id=u.role_id
    WHERE u.status='APPROVED' AND r.code=ANY($2::text[])
    ON CONFLICT(kind,user_id,entity_key) DO NOTHING`, [kind, roles, entityKey, targetPath]);
}

type Queued = { id: string; kind: MailKind; entity_key: string; recipient_email: string; target_path: string; encrypted_token: string | null; attempts: number };
const subjects: Record<AlertKind, string> = {
  PUBLIC_COMPLAINT_RECEIVED: 'Nueva denuncia pendiente de revisión',
  CASE_ASSIGNED: 'Tienes un caso asignado',
  INSPECTION_RETURNED: 'Inspección devuelta para corrección',
  USER_APPROVED: 'Tu cuenta fue aprobada',
  PASSWORD_CHANGED: 'Tu contraseña cambió',
};
const messages: Record<AlertKind, string> = {
  PUBLIC_COMPLAINT_RECEIVED: 'Se recibió una denuncia nueva. Revísala en el portal.',
  CASE_ASSIGNED: 'Se te asignó un caso. Consulta tus inspecciones en el portal.',
  INSPECTION_RETURNED: 'Una inspección tiene correcciones pendientes. Revisa las indicaciones en el portal.',
  USER_APPROVED: 'Tu cuenta fue aprobada. Ya puedes iniciar sesión en el portal.',
  PASSWORD_CHANGED: 'La contraseña de tu cuenta se cambió correctamente. Si no reconoces este cambio, contacta a la administración del sistema.',
};

let draining = false;
export async function drainMailOutbox() {
  if (!transporter || draining) return;
  draining = true;
  try {
    for (let i = 0; i < 20; i++) {
      const claimed = await query<Queued>(`UPDATE mail_outbox SET status='SENDING',attempts=attempts+1,leased_at=now()
        WHERE id=(SELECT id FROM mail_outbox WHERE (status='PENDING' AND next_attempt_at<=now())
          OR (status='SENDING' AND leased_at<now()-interval '5 minutes')
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id,kind,entity_key,recipient_email,target_path,encrypted_token,attempts`);
      const mail = claimed.rows[0];
      if (!mail) break;
      try {
        if (mail.kind === 'PASSWORD_RESET') {
          const active = await query<{ active: boolean }>(`SELECT EXISTS(SELECT 1 FROM password_reset_tokens
            WHERE id=$1 AND used_at IS NULL AND expires_at>now()) AS active`, [mail.entity_key]);
          if (!active.rows[0]?.active) {
            await query("UPDATE mail_outbox SET status='SKIPPED',leased_at=NULL,last_error_code='EXPIRED',encrypted_token=NULL WHERE id=$1", [mail.id]);
            continue;
          }
          await sendPasswordReset(mail.recipient_email, decryptToken(mail.encrypted_token!));
          await query("UPDATE mail_outbox SET status='SENT',sent_at=now(),leased_at=NULL,last_error_code=NULL,encrypted_token=NULL WHERE id=$1", [mail.id]);
          continue;
        }
        const link = new URL(mail.target_path, env.APP_PUBLIC_URL!).toString();
        await send(mail.recipient_email, subjects[mail.kind], `${messages[mail.kind]}\n${link}`);
        await query("UPDATE mail_outbox SET status='SENT',sent_at=now(),leased_at=NULL,last_error_code=NULL WHERE id=$1", [mail.id]);
      } catch {
        const delay = Math.min(3600, 30 * 2 ** Math.min(mail.attempts, 7));
        await query("UPDATE mail_outbox SET status='PENDING',next_attempt_at=now()+($2::int * interval '1 second'),leased_at=NULL,last_error_code='DELIVERY_FAILED' WHERE id=$1", [mail.id, delay]);
      }
    }
  } finally { draining = false; }
}

export function startMailWorker() {
  if (!transporter) return;
  void drainMailOutbox().catch(() => {});
  const timer = setInterval(() => void drainMailOutbox().catch(() => {}), 10000);
  timer.unref();
}
