import { beforeEach, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ upload: vi.fn(), download: vi.fn() }));
vi.mock('../../core/storage/supabase-storage.client.js', () => ({
  getSupabaseStorageClient: () => ({ storage: { from: () => ({ upload: storage.upload, download: storage.download }) } }),
}));

import { env } from '../../config/env.js';
import { readPrivateObject, uploadPrivateObject } from '../../core/storage/storage.service.js';

const content = new Uint8Array(55 * 1024);
const input = {
  storagePath: 'inspection-evidence/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf',
  mimeType: 'application/pdf' as const,
  content,
};

beforeEach(() => {
  vi.clearAllMocks();
  env.SUPABASE_STORAGE_BUCKET_PRIVATE = 'test-private';
});

it('clasifica EACCES anidado de Supabase Storage sin divulgar el objeto', async () => {
  const transport = Object.assign(new Error('private transport detail'), { code: 'EACCES' });
  storage.upload.mockResolvedValue({ data: null, error: { name: 'StorageUnknownError', originalError: new AggregateError([transport]) } });
  await expect(uploadPrivateObject(input)).rejects.toMatchObject({ code: 'UNAVAILABLE', reason: 'NETWORK_ACCESS_DENIED' });
  storage.upload.mockRejectedValueOnce({ name: 'StorageUnknownError', originalError: new AggregateError([transport]) });
  await expect(uploadPrivateObject(input)).rejects.toMatchObject({ code: 'UNAVAILABLE', reason: 'NETWORK_ACCESS_DENIED' });
});

it('clasifica rechazo remoto y configuración ausente', async () => {
  storage.upload.mockResolvedValueOnce({ data: null, error: { name: 'StorageApiError', statusCode: '403' } });
  await expect(uploadPrivateObject(input)).rejects.toMatchObject({ code: 'UNAVAILABLE', reason: 'REMOTE_REJECTED' });
  env.SUPABASE_STORAGE_BUCKET_PRIVATE = undefined;
  await expect(uploadPrivateObject(input)).rejects.toMatchObject({ code: 'UNAVAILABLE', reason: 'NOT_CONFIGURED' });
});

it('conserva errores de programación ajenos a Storage', async () => {
  const programmingError = new TypeError('programming bug');
  storage.upload.mockRejectedValue(programmingError);
  await expect(uploadPrivateObject(input)).rejects.toBe(programmingError);
});

it('clasifica lectura privada ausente y fallo de transporte de informe', async () => {
  storage.download.mockResolvedValueOnce({ data: null, error: { statusCode: '404' } });
  await expect(readPrivateObject(input.storagePath)).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' });
  storage.download.mockResolvedValueOnce({ data: null, error: { statusCode: 404 } });
  await expect(readPrivateObject(input.storagePath)).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' });
  storage.download.mockRejectedValueOnce(Object.assign(new Error('transport detail'), { cause: Object.assign(new Error('denied'), { code: 'EACCES' }) }));
  await expect(readPrivateObject(input.storagePath)).rejects.toMatchObject({ code: 'UNAVAILABLE', reason: 'NETWORK_ACCESS_DENIED' });
});
