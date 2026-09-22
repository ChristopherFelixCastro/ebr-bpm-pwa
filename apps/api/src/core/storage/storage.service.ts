import { env } from '../../config/env.js';
import { getSupabaseStorageClient } from './supabase-storage.client.js';
import { assertPrivateObject, type AllowedPrivateMimeType } from './storage-path.js';

const validPath = (value: string) => /^[a-z0-9-]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(value) && !value.includes('..');
const bucket = () => {
  if (!env.SUPABASE_STORAGE_BUCKET_PRIVATE) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');
  return getSupabaseStorageClient().storage.from(env.SUPABASE_STORAGE_BUCKET_PRIVATE);
};

export async function uploadPrivateObject(input: { storagePath: string; mimeType: AllowedPrivateMimeType; content: Uint8Array }) {
  assertPrivateObject(input.storagePath, input.mimeType, input.content.byteLength);
  const { error } = await bucket().upload(input.storagePath, input.content, { contentType: input.mimeType, upsert: false });
  if (error) throw new Error('PRIVATE_STORAGE_UPLOAD_FAILED');
  return { storagePath: input.storagePath };
}

export async function createShortLivedDownloadUrl(storagePath: string, expiresInSeconds = 60) {
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 10 || expiresInSeconds > 300) throw new Error('INVALID_SIGNED_URL_TTL');
  if (!validPath(storagePath)) throw new Error('INVALID_STORAGE_PATH');
  const { data, error } = await bucket().createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error('PRIVATE_STORAGE_SIGNING_FAILED');
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
