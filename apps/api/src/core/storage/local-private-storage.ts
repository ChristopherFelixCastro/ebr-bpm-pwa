import { randomBytes } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';
import { isPrivateObjectPath, type AllowedPrivateMimeType } from './storage-path.js';

// Explicit, development-only Storage for isolated manual runs. Never points at Supabase.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../.cache/private-storage');
const tickets = new Map<string, { storagePath: string; expiresAt: number }>();
const mimeByExtension: Record<string, AllowedPrivateMimeType> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp4: 'video/mp4', webm: 'video/webm',
};

export const localPrivateStorageEnabled = () => env.NODE_ENV === 'development' && env.LOCAL_PRIVATE_STORAGE_ENABLED === true;

function objectFile(storagePath: string) {
  if (!isPrivateObjectPath(storagePath)) throw new Error('INVALID_STORAGE_PATH');
  const file = path.resolve(root, ...storagePath.split('/'));
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error('INVALID_STORAGE_PATH');
  return file;
}

export async function localUpload(storagePath: string, content: Uint8Array) {
  const file = objectFile(storagePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, { flag: 'wx' });
}

export async function localRead(storagePath: string) {
  return readFile(objectFile(storagePath));
}

export async function localRemove(storagePath: string) {
  await unlink(objectFile(storagePath));
}

export async function localSignedUrl(storagePath: string, expiresInSeconds: number) {
  await stat(objectFile(storagePath));
  const now = Date.now();
  for (const [token, ticket] of tickets) if (ticket.expiresAt <= now) tickets.delete(token);
  const token = randomBytes(32).toString('base64url');
  tickets.set(token, { storagePath, expiresAt: now + expiresInSeconds * 1000 });
  return { signedUrl: `http://localhost:${env.PORT}/v1/dev-storage/${token}`, expiresInSeconds };
}

export async function resolveLocalDownload(token: string) {
  if (!localPrivateStorageEnabled() || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const ticket = tickets.get(token);
  if (!ticket || ticket.expiresAt <= Date.now()) { tickets.delete(token); return null; }
  const extension = ticket.storagePath.split('.').at(-1) ?? '';
  const mimeType = mimeByExtension[extension];
  if (!mimeType) return null;
  return { content: await localRead(ticket.storagePath), mimeType, extension };
}
