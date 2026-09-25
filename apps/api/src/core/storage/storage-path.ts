import { randomUUID } from 'node:crypto';

export const privateObjectScopes = ['request-document', 'inspection-evidence', 'official-report', 'account-authorization-letter'] as const;
export type PrivateObjectScope = typeof privateObjectScopes[number];

const extensionByMimeType = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
} as const;

export type AllowedPrivateMimeType = keyof typeof extensionByMimeType;
// One pattern for every operation: an object Core accepts on upload must also be downloadable and removable.
const extensionAlternatives = [...new Set(Object.values(extensionByMimeType))].join('|');
const privateObjectPath = new RegExp(`^[a-z0-9-]+\\/[0-9a-f-]{36}\\/[0-9a-f-]{36}\\.(${extensionAlternatives})$`, 'i');
export const isPrivateObjectPath = (path: string) => privateObjectPath.test(path) && !path.includes('..');
export const MAX_PRIVATE_OBJECT_BYTES = 5 * 1024 * 1024;

export function assertPrivateObject(path: string, mimeType: string, byteLength: number) {
  if (!(mimeType in extensionByMimeType)) throw new Error('UNSUPPORTED_STORAGE_MIME_TYPE');
  if (!Number.isInteger(byteLength) || byteLength <= 0 || byteLength > MAX_PRIVATE_OBJECT_BYTES) throw new Error('INVALID_STORAGE_OBJECT_SIZE');
  if (!isPrivateObjectPath(path)) throw new Error('INVALID_STORAGE_PATH');
}

export function createUploadPath(scope: PrivateObjectScope, ownerId: string, mimeType: AllowedPrivateMimeType) {
  if (!privateObjectScopes.includes(scope)) throw new Error('INVALID_STORAGE_SCOPE');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId)) throw new Error('INVALID_STORAGE_OWNER_ID');
  return `${scope}/${ownerId}/${randomUUID()}.${extensionByMimeType[mimeType]}`;
}
