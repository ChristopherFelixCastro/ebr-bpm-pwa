import { env } from '../../config/env.js';
import { getSupabaseStorageClient } from './supabase-storage.client.js';
import { assertPrivateObject, type AllowedPrivateMimeType } from './storage-path.js';

const validPath = (value: string) => /^[a-z0-9-]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(value) && !value.includes('..');
const bucket = () => {
  if (!env.SUPABASE_STORAGE_BUCKET_PRIVATE) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');
  return getSupabaseStorageClient().storage.from(env.SUPABASE_STORAGE_BUCKET_PRIVATE);
};

export class PrivateStorageError extends Error {
  constructor(public readonly code: 'OBJECT_NOT_FOUND' | 'UNAVAILABLE') { super(code); }
}

const transportCodes = new Set(['EACCES', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);
function expectedSigningFailure(error: unknown): PrivateStorageError | null {
  if (!error || typeof error !== 'object') return null;
  const failure = error as { code?: unknown; message?: unknown; statusCode?: unknown; cause?: { code?: unknown }; originalError?: { code?: unknown; cause?: { code?: unknown } } };
  if (failure.statusCode === '404' || failure.statusCode === 404) return new PrivateStorageError('OBJECT_NOT_FOUND');
  if (failure.message === 'SUPABASE_STORAGE_NOT_CONFIGURED' || failure.code === 'SUPABASE_STORAGE_NOT_CONFIGURED') return new PrivateStorageError('UNAVAILABLE');
  if ([failure.code, failure.cause?.code, failure.originalError?.code, failure.originalError?.cause?.code].some((code) => typeof code === 'string' && transportCodes.has(code))) return new PrivateStorageError('UNAVAILABLE');
  return null;
}

export async function uploadPrivateObject(input: { storagePath: string; mimeType: AllowedPrivateMimeType; content: Uint8Array }) {
  assertPrivateObject(input.storagePath, input.mimeType, input.content.byteLength);
  const { error } = await bucket().upload(input.storagePath, input.content, { contentType: input.mimeType, upsert: false });
  if (error) throw new Error('PRIVATE_STORAGE_UPLOAD_FAILED');
  return { storagePath: input.storagePath };
}

export async function createShortLivedDownloadUrl(storagePath: string, expiresInSeconds = 60) {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 10 || expiresInSeconds > 300) throw new Error('INVALID_SIGNED_URL_TTL');
  if (!validPath(storagePath)) throw new PrivateStorageError('OBJECT_NOT_FOUND');
  let result;
  try { result = await bucket().createSignedUrl(storagePath, expiresInSeconds); }
  catch (error) { throw expectedSigningFailure(error) ?? error; }
  const { data, error } = result;
  if (error?.statusCode === '404') throw new PrivateStorageError('OBJECT_NOT_FOUND');
  if (error || !data?.signedUrl) throw new PrivateStorageError('UNAVAILABLE');
  return { signedUrl: data.signedUrl, expiresInSeconds };
}

export async function removePrivateObject(storagePath: string) {
  if (!validPath(storagePath)) throw new Error('INVALID_STORAGE_PATH');
  const { error } = await bucket().remove([storagePath]);
  if (error) throw new Error('PRIVATE_STORAGE_DELETE_FAILED');
}

export async function readPrivateObject(storagePath: string) {
  if (!validPath(storagePath)) throw new Error('INVALID_STORAGE_PATH');
  const { data, error } = await bucket().download(storagePath);
  if (error || !data) throw new Error('PRIVATE_STORAGE_OBJECT_NOT_FOUND');
  return Buffer.from(await data.arrayBuffer());
}
