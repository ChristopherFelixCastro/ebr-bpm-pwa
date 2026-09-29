import { afterEach, expect, it, vi } from 'vitest'
import { core } from '../api/core'
import { requestsApi } from '../api/resources'

afterEach(() => vi.restoreAllMocks())

it('sube un documento privado mediante el cliente de sesión compartido y FormData', async () => {
  const spy = vi.spyOn(core, 'request').mockResolvedValue({ data: { id: 'document-1' }, meta: { correlationId: 'test' } })
  const file = new File(['%PDF-1.7'], 'carta.pdf', { type: 'application/pdf' })
  await requestsApi.uploadDocument('request-1', 'AUTHORIZATION_LETTER', file)
  expect(spy).toHaveBeenCalledOnce()
  const [url, init] = spy.mock.calls[0]
  expect(url).toBe('/v1/company-requests/request-1/documents')
  expect(init?.method).toBe('POST')
  expect(init?.body).toBeInstanceOf(FormData)
  expect((init?.body as FormData).get('documentType')).toBe('AUTHORIZATION_LETTER')
  expect((init?.body as FormData).get('file')).toBeInstanceOf(File)
})
