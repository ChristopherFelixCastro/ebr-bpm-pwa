import { beforeEach, describe, expect, it, vi } from 'vitest';

const bucket = vi.hoisted(() => ({ upload: vi.fn(), createSignedUrl: vi.fn(), remove: vi.fn(), download: vi.fn() }));
vi.mock('../core/storage/supabase-storage.client.js', () => ({ getSupabaseStorageClient: () => ({ storage: { from: () => bucket } }) }));

import { env } from '../config/env.js';
import { createUploadPath, isPrivateObjectPath, type AllowedPrivateMimeType } from '../core/storage/storage-path.js';
import { createShortLivedDownloadUrl, readPrivateObject, removePrivateObject, uploadPrivateObject } from '../core/storage/storage.service.js';

const owner = '11111111-1111-4111-8111-111111111111';
const formats: AllowedPrivateMimeType[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

describe('private object formats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.SUPABASE_STORAGE_BUCKET_PRIVATE = 'ebr-bpm-private';
    bucket.upload.mockResolvedValue({ data: {}, error: null });
    bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/signed' }, error: null });
    bucket.remove.mockResolvedValue({ data: [], error: null });
    bucket.download.mockResolvedValue({ data: new Blob(['x']), error: null });
  });

  // Every format accepted on upload must also be downloadable, readable and removable (acceptance 7.6).
  it.each(formats)('uploads, signs, reads and removes %s objects', async (mimeType) => {
    const path = createUploadPath('inspection-evidence', owner, mimeType);
    await uploadPrivateObject({ storagePath: path, mimeType, content: new Uint8Array([1, 2, 3]) });
    await expect(createShortLivedDownloadUrl(path, 60)).resolves.toMatchObject({ signedUrl: 'https://storage.test/signed' });
    await expect(readPrivateObject(path)).resolves.toBeInstanceOf(Buffer);
    await expect(removePrivateObject(path)).resolves.toBeUndefined();
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });

  it('rejects unknown extensions and path traversal for every operation', async () => {
    const gif = `inspection-evidence/${owner}/${owner}.gif`;
    const traversal = `inspection-evidence/../${owner}/${owner}.pdf`;
    expect(isPrivateObjectPath(gif)).toBe(false);
    expect(isPrivateObjectPath(traversal)).toBe(false);
    await expect(createShortLivedDownloadUrl(gif, 60)).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' });
    await expect(removePrivateObject(traversal)).rejects.toThrow('INVALID_STORAGE_PATH');
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });
});
