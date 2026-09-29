import { randomUUID } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({ env: { NODE_ENV: 'development', LOCAL_PRIVATE_STORAGE_ENABLED: true, PORT: 3000 } }));

import { resolveLocalDownload } from '../core/storage/local-private-storage.js';
import { createUploadPath } from '../core/storage/storage-path.js';
import { createShortLivedDownloadUrl, readPrivateObject, removePrivateObject, uploadPrivateObject } from '../core/storage/storage.service.js';

const created: string[] = [];
afterEach(async () => {
  for (const path of created.splice(0)) await removePrivateObject(path);
});

it('keeps a private local object readable only through a short-lived opaque URL', async () => {
  const storagePath = createUploadPath('account-authorization-letter', randomUUID(), 'application/pdf');
  const content = Buffer.from('%PDF-1.4\nLocal test only\n%%EOF\n');
  created.push(storagePath);
  await uploadPrivateObject({ storagePath, mimeType: 'application/pdf', content });
  expect(await readPrivateObject(storagePath)).toEqual(content);

  const { signedUrl, expiresInSeconds } = await createShortLivedDownloadUrl(storagePath, 60);
  expect(expiresInSeconds).toBe(60);
  expect(signedUrl).not.toContain(storagePath);
  const token = signedUrl.split('/').at(-1)!;
  expect(await resolveLocalDownload(token)).toMatchObject({ content, mimeType: 'application/pdf' });
  expect(await resolveLocalDownload('invalid')).toBeNull();
  await removePrivateObject(storagePath);
  created.pop();
  await expect(readPrivateObject(storagePath)).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' });
});
