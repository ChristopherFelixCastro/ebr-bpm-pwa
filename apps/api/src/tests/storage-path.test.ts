import { describe, expect, it } from 'vitest';
import { assertPrivateObject, createUploadPath, MAX_PRIVATE_OBJECT_BYTES } from '../core/storage/storage-path.js';

const ownerId = '123e4567-e89b-42d3-a456-426614174000';

describe('private storage paths', () => {
  it('creates an opaque path without using a client filename', () => {
    const path = createUploadPath('inspection-evidence', ownerId, 'image/jpeg');
    expect(path).toMatch(/^inspection-evidence\/123e4567-e89b-42d3-a456-426614174000\/[0-9a-f-]{36}\.jpg$/i);
  });

  it('accepts only approved MIME types and the 5 MB limit', () => {
    const path = createUploadPath('request-document', ownerId, 'application/pdf');
    expect(() => assertPrivateObject(path, 'application/pdf', MAX_PRIVATE_OBJECT_BYTES)).not.toThrow();
    expect(() => assertPrivateObject(path, 'application/zip', 100)).toThrow('UNSUPPORTED_STORAGE_MIME_TYPE');
    expect(() => assertPrivateObject(path, 'application/pdf', MAX_PRIVATE_OBJECT_BYTES + 1)).toThrow('INVALID_STORAGE_OBJECT_SIZE');
  });

  it('rejects traversal and invalid owners', () => {
    expect(() => assertPrivateObject('../secret.pdf', 'application/pdf', 100)).toThrow('INVALID_STORAGE_PATH');
    expect(() => createUploadPath('official-report', 'not-a-uuid', 'application/pdf')).toThrow('INVALID_STORAGE_OWNER_ID');
  });
});
