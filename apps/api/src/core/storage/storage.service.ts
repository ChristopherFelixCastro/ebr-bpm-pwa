import { env } from '../../config/env.js';
import { getSupabaseStorageClient } from './supabase-storage.client.js';
import { assertPrivateObject, type AllowedPrivateMimeType } from './storage-path.js';

const validPath = (value: string) => /^[a-z0-9-]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(value) && !value.includes('..');
const bucket = () => {
  if (!env.SUPABASE_STORAGE_BUCKET_PRIVATE) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');
  return getSupabaseStorageClient().storage.from(env.SUPABASE_STORAGE_BUCKET_PRIVATE);
};

export class PrivateStorageError extends Error {
  constructor(public readonly code: 'OBJECT_NOT_FOUND' | 'UNAVAILABLE',
    public readonly reason: 'NOT_CONFIGURED' | 'NETWORK_ACCESS_DENIED' | 'NETWORK_UNAVAILABLE' | 'REMOTE_REJECTED' | 'REMOTE_FAILURE' | 'UNSPECIFIED' = 'UNSPECIFIED') { super(code); }
}

const transportCodes = new Set(['EACCES', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);
function nestedCodes(error: unknown, depth = 0, seen = new Set<object>()): string[] {
  if (!error || typeof error !== 'object' || depth > 5 || seen.has(error)) return [];
  seen.add(error);
  const entry = error as { code?: unknown; cause?: unknown; originalError?: unknown; errors?: unknown };
  return [
    ...(typeof entry.code === 'string' ? [entry.code] : []),
    ...nestedCodes(entry.cause, depth + 1, seen),
    ...nestedCodes(entry.originalError, depth + 1, seen),
    ...(Array.isArray(entry.errors) ? entry.errors.flatMap((part) => nestedCodes(part, depth + 1, seen)) : []),
  ];
}
function uploadFailure(error: unknown, sdkResult = false): PrivateStorageError | null {
  if (!error || typeof error !== 'object') return null;
  const failure = error as { code?: unknown; message?: unknown; statusCode?: unknown; name?: unknown };
  if (failure.code === 'SUPABASE_STORAGE_NOT_CONFIGURED' || failure.message === 'SUPABASE_STORAGE_NOT_CONFIGURED')
    return new PrivateStorageError('UNAVAILABLE', 'NOT_CONFIGURED');
  const codes = nestedCodes(error);
  if (codes.includes('EACCES')) return new PrivateStorageError('UNAVAILABLE', 'NETWORK_ACCESS_DENIED');
  if (codes.some((code) => transportCodes.has(code))) return new PrivateStorageError('UNAVAILABLE', 'NETWORK_UNAVAILABLE');
  if (sdkResult || failure.name === 'StorageApiError' || failure.name === 'StorageUnknownError') {
    const status = Number(failure.statusCode);
    return new PrivateStorageError('UNAVAILABLE', status >= 400 && status < 500 ? 'REMOTE_REJECTED' : 'REMOTE_FAILURE');
  }
  return null;
}
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
  let result;
  try { result = await bucket().upload(input.storagePath, input.content, { contentType: input.mimeType, upsert: false }); }
  catch (error) { throw uploadFailure(error) ?? error; }
  if (result.error) throw uploadFailure(result.error, true)!;
  return { storagePath: input.storagePath };
}

export async function createShortLivedDownloadUrl(storagePath: string, expiresInSeconds = 60) {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 10 || expiresInSeconds > 300) throw new Error('INVALID_SIGNED_URL_TTL');
  if (!validPath(storagePath)) throw new PrivateStorageError('OBJECT_NOT_FOUND');
  let result;
  try { result = await bucket().createSignedUrl(storagePath, expiresInSeconds); }
  catch (error) { throw expectedSigningFailure(error) ?? error; }
  const { data, error } = result;
  if (Number(error?.statusCode) === 404) throw new PrivateStorageError('OBJECT_NOT_FOUND');
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
  let result;
  try { result = await bucket().download(storagePath); }
  catch (error) { const expected = expectedSigningFailure(error); throw expected?.code === 'OBJECT_NOT_FOUND' ? expected : uploadFailure(error) ?? expected ?? error; }
  const { data, error } = result;
  if (Number(error?.statusCode) === 404) throw new PrivateStorageError('OBJECT_NOT_FOUND');
  if (error) throw uploadFailure(error, true)!;
  if (!data) throw new PrivateStorageError('UNAVAILABLE', 'REMOTE_FAILURE');
  try { return Buffer.from(await data.arrayBuffer()); }
  catch (error) { throw uploadFailure(error) ?? error; }
}
