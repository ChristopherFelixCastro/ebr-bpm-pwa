import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { writeDomainAudit } from '../../core/audit/domain-audit.service.js';
import { createUploadPath, MAX_PRIVATE_OBJECT_BYTES, type AllowedPrivateMimeType } from '../../core/storage/storage-path.js';
import { createShortLivedDownloadUrl, PrivateStorageError, removePrivateObject, uploadPrivateObject } from '../../core/storage/storage.service.js';
import { query } from '../../db/client.js';

// Carta de autorización de la cuenta. Nunca se exponen rutas privadas, contenido ni URL firmadas en listas o auditoría.
export type LetterFile = { buffer: Buffer; size: number; mimetype: string; originalname: string };
export type LetterErrorCode = 'VALIDATION_ERROR' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'NOT_FOUND' | 'CONFLICT'
  | 'INVALID_STATE' | 'STALE_VERSION' | 'FORBIDDEN' | 'STORAGE_UNAVAILABLE';
export class LetterError extends Error { constructor(public code: LetterErrorCode) { super(code); } }

const signatures: Record<string, (bytes: Buffer) => boolean> = {
  'application/pdf': (bytes) => bytes.subarray(0, 5).toString() === '%PDF-',
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
};
const extensions: Record<string, RegExp> = { 'application/pdf': /\.pdf$/i, 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i };

export const letterProjection = `SELECT d.id,d.user_id AS "userId",d.status::text,d.file_name AS "fileName",d.mime_type AS "mimeType",
  d.size_bytes::int AS "sizeBytes",d.sha256,d.uploaded_by_user_id AS "uploadedByUserId",d.uploaded_at AS "uploadedAt",
  d.reviewed_by_user_id AS "reviewedByUserId",d.reviewed_at AS "reviewedAt",d.rejection_reason AS "rejectionReason",
  d.archived_at AS "archivedAt",d.version FROM user_authorization_documents d`;

/** Validates size, declared MIME, extension and magic bytes before anything reaches Storage. */
export function assertLetterFile(file: LetterFile | undefined): asserts file is LetterFile {
  if (!file || !file.size || !file.buffer?.length) throw new LetterError('VALIDATION_ERROR');
  if (file.size > MAX_PRIVATE_OBJECT_BYTES) throw new LetterError('PAYLOAD_TOO_LARGE');
  if (!signatures[file.mimetype]) throw new LetterError('UNSUPPORTED_MEDIA_TYPE');
  if (!signatures[file.mimetype](file.buffer) || !extensions[file.mimetype].test(file.originalname)) throw new LetterError('VALIDATION_ERROR');
}

/**
 * Uploads the object first, then runs `persist` (which must insert the row inside its own transaction).
 * If persistence fails the object is removed, so Storage and the database do not diverge.
 */
export async function storeLetter<T>(userId: string, file: LetterFile, persist: (stored: { storagePath: string; fileName: string; sha256: string }) => Promise<T>) {
  assertLetterFile(file);
  const storagePath = createUploadPath('account-authorization-letter', userId, file.mimetype as AllowedPrivateMimeType);
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  const fileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 300) || 'carta';
  try { await uploadPrivateObject({ storagePath, mimeType: file.mimetype as AllowedPrivateMimeType, content: file.buffer }); }
  catch (error) { if (error instanceof PrivateStorageError) throw new LetterError('STORAGE_UNAVAILABLE'); throw error; }
  try { return await persist({ storagePath, fileName, sha256 }); }
  catch (error) { try { await removePrivateObject(storagePath); } catch { /* the original failure is reported */ } throw error; }
}

export async function insertLetter(client: PoolClient, input: { userId: string; uploadedBy: string; storagePath: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string }) {
  const archived = await client.query<{ id: string }>(`UPDATE user_authorization_documents SET status='ARCHIVED',archived_at=clock_timestamp(),archived_by_user_id=$2
    WHERE user_id=$1 AND status<>'ARCHIVED' RETURNING id`, [input.userId, input.uploadedBy]);
  const inserted = await client.query<{ id: string }>(`INSERT INTO user_authorization_documents(user_id,storage_path,file_name,mime_type,size_bytes,sha256,uploaded_by_user_id)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [input.userId, input.storagePath, input.fileName, input.mimeType, input.sizeBytes, input.sha256, input.uploadedBy]);
  return { id: inserted.rows[0].id, replacedId: archived.rows[0]?.id ?? null };
}

export async function letterHistory(userId: string) {
  return (await query(`${letterProjection} WHERE d.user_id=$1 ORDER BY d.uploaded_at DESC,d.id`, [userId])).rows;
}

export async function letterById(client: Pick<PoolClient, 'query'> | undefined, userId: string, letterId: string) {
  const run = client ?? { query };
  return (await run.query(`${letterProjection} WHERE d.user_id=$1 AND d.id=$2`, [userId, letterId])).rows[0] as Record<string, any> | undefined;
}

/** Marks a PENDING letter VALID or REJECTED. The caller holds the target user row lock. */
export async function reviewLetter(client: PoolClient, input: { userId: string; letterId: string; version: number; decision: 'VALID' | 'REJECTED'; reason?: string; actorId: string; correlationId: string }) {
  const current = (await client.query<{ status: string; version: number }>('SELECT status::text,version FROM user_authorization_documents WHERE id=$1 AND user_id=$2 FOR UPDATE', [input.letterId, input.userId])).rows[0];
  if (!current) throw new LetterError('NOT_FOUND');
  if (current.status !== 'PENDING') throw new LetterError('INVALID_STATE');
  if (input.actorId === input.userId) throw new LetterError('FORBIDDEN');
  const updated = await client.query(`UPDATE user_authorization_documents SET status=$1::document_status,reviewed_by_user_id=$2,reviewed_at=clock_timestamp(),
    rejection_reason=CASE WHEN $1::document_status='REJECTED' THEN $3 ELSE NULL END WHERE id=$4 AND version=$5`, [input.decision, input.actorId, input.reason ?? null, input.letterId, input.version]);
  if (!updated.rowCount) throw new LetterError('STALE_VERSION');
  await writeDomainAudit({ action: input.decision === 'VALID' ? 'USER_AUTHORIZATION_LETTER_VALIDATED' : 'USER_AUTHORIZATION_LETTER_REJECTED', actorUserId: input.actorId,
    correlationId: input.correlationId, entityType: 'USER_AUTHORIZATION_LETTER', entityId: input.letterId, metadata: { userId: input.userId, letterId: input.letterId, letterStatus: input.decision }, client });
}

export async function issueLetterDownload(userId: string, letterId: string, actorId: string, correlationId: string) {
  const row = (await query<{ storagePath: string; status: string }>('SELECT storage_path AS "storagePath",status::text FROM user_authorization_documents WHERE user_id=$1 AND id=$2', [userId, letterId])).rows[0];
  if (!row) throw new LetterError('NOT_FOUND');
  let signed;
  try { signed = await createShortLivedDownloadUrl(row.storagePath, 60); }
  catch (error) { if (error instanceof PrivateStorageError) throw new LetterError(error.code === 'OBJECT_NOT_FOUND' ? 'NOT_FOUND' : 'STORAGE_UNAVAILABLE'); throw error; }
  await writeDomainAudit({ action: 'USER_AUTHORIZATION_LETTER_DOWNLOAD_ISSUED', actorUserId: actorId, correlationId, entityType: 'USER_AUTHORIZATION_LETTER', entityId: letterId, metadata: { userId, letterId, letterStatus: row.status } });
  return signed;
}
