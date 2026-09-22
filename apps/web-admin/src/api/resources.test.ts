import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpTesting } from './http'
import { companiesApi, contactsApi, establishmentsApi, requestsApi, validatePrivateFile } from './resources'

const correlationId = '123e4567-e89b-42d3-a456-426614174000'
const envelope = (data: unknown, meta: Record<string, unknown> = {}) => new Response(JSON.stringify({ data, meta: { correlationId, ...meta } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
const created = (data: unknown) => new Response(JSON.stringify({ data, meta: { correlationId } }), { status: 201, headers: { 'Content-Type': 'application/json' } })
const failure = (code: string, status = 409) => new Response(JSON.stringify({ error: { code, message: code }, meta: { correlationId } }), { status, headers: { 'Content-Type': 'application/json' } })
const requestAt = (mock: ReturnType<typeof vi.fn>, index: number) => mock.mock.calls[index][0] as Request

describe('recursos generados del Web Admin', () => {
  beforeEach(() => { httpTesting.reset(); httpTesting.setAccessToken('token') })
  afterEach(() => vi.unstubAllGlobals())

  it('consume listados paginados de empresas y establecimientos con alcance delegado al Core', async () => {
    const company = { id: '11111111-1111-4111-8111-111111111111', legalName: 'Empresa real', status: 'ACTIVE' }
    const establishment = { id: '22222222-2222-4222-8222-222222222222', companyId: company.id, name: 'Planta real', status: 'ACTIVE' }
    const fetchMock = vi.fn().mockResolvedValueOnce(envelope([company], { page: 1, limit: 20, total: 1 })).mockResolvedValueOnce(envelope([establishment], { page: 1, limit: 20, total: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    expect((await companiesApi.list({ page: 1, limit: 20 })).data[0].legalName).toBe('Empresa real')
    expect((await establishmentsApi.list({ page: 1, limit: 20, companyId: company.id })).data[0].name).toBe('Planta real')
    expect(requestAt(fetchMock, 1).url).toContain(`companyId=${company.id}`)
  })

  it('envía DTO canónico y version optimista para empresa y establecimiento', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(created({ id: '11111111-1111-4111-8111-111111111111', legalName: 'Nueva', rnc: '101', version: 1 }))
      .mockResolvedValueOnce(created({ id: '22222222-2222-4222-8222-222222222222', companyId: '11111111-1111-4111-8111-111111111111', name: 'Planta', version: 1 }))
      .mockResolvedValueOnce(failure('STALE_VERSION'))
      .mockResolvedValueOnce(envelope({ id: '22222222-2222-4222-8222-222222222222', companyId: '11111111-1111-4111-8111-111111111111', name: 'Planta editada', version: 5 }))
    vi.stubGlobal('fetch', fetchMock)

    await companiesApi.create({ legalName: 'Nueva', rnc: '101' })
    await establishmentsApi.create({ companyId: '11111111-1111-4111-8111-111111111111', name: 'Planta' })
    await expect(companiesApi.update('11111111-1111-4111-8111-111111111111', { version: 4, legalName: 'Editada' })).rejects.toMatchObject({ code: 'STALE_VERSION', correlationId })
    await establishmentsApi.update('22222222-2222-4222-8222-222222222222', { version: 4, name: 'Planta editada' })
    await expect(requestAt(fetchMock, 2).clone().json()).resolves.toEqual({ version: 4, legalName: 'Editada' })
    await expect(requestAt(fetchMock, 3).clone().json()).resolves.toEqual({ version: 4, name: 'Planta editada' })
  })

  it('propaga REAUTHENTICATION_REQUIRED en desactivaciones sensibles', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(failure('REAUTHENTICATION_REQUIRED', 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(companiesApi.deactivate('11111111-1111-4111-8111-111111111111', 3)).rejects.toMatchObject({ code: 'REAUTHENTICATION_REQUIRED' })
    await expect(requestAt(fetchMock, 0).clone().json()).resolves.toEqual({ version: 3 })
  })

  it('crea o reutiliza contactos mediante el flujo seguro y separa versiones', async () => {
    const relation = { id: '33333333-3333-4333-8333-333333333333', relationshipType: 'PRIMARY_CONTACT', isPrimary: true, effectiveFrom: '2026-09-22', effectiveTo: null, version: 2, contact: { id: '44444444-4444-4444-8444-444444444444', fullName: 'Ana', identityDocumentMasked: '*****1234', phone: null, email: null, version: 7, createdAt: '', updatedAt: '' } }
    const fetchMock = vi.fn().mockResolvedValueOnce(created(relation)).mockResolvedValueOnce(envelope({ ended: true }))
    vi.stubGlobal('fetch', fetchMock)

    const linked = await contactsApi.linkCompany('11111111-1111-4111-8111-111111111111', { contact: { fullName: 'Ana', identityDocument: '001-1234567-8', phone: null, email: null }, relationshipType: 'PRIMARY_CONTACT', isPrimary: true, effectiveFrom: '2026-09-22' })
    expect(linked.version).toBe(2)
    expect(linked.contact.version).toBe(7)
    await contactsApi.endCompanyRelation('11111111-1111-4111-8111-111111111111', relation.id, linked.version, '2026-09-23')
    await expect(requestAt(fetchMock, 1).clone().json()).resolves.toEqual({ version: 2, effectiveTo: '2026-09-23' })
  })

  it('crea DRAFT, edita con version, vincula contacto y conserva caseId al enviar', async () => {
    const draft = { id: '55555555-5555-4555-8555-555555555555', companyId: '11111111-1111-4111-8111-111111111111', establishmentId: '22222222-2222-4222-8222-222222222222', requestType: 'REGISTRATION', reason: 'Registro', status: 'DRAFT', version: 1, createdAt: '', updatedAt: '' }
    const sent = { ...draft, status: 'PENDING_ASSIGNMENT', version: 2 }
    const fetchMock = vi.fn().mockResolvedValueOnce(created(draft)).mockResolvedValueOnce(envelope({ ...draft, version: 2 })).mockResolvedValueOnce(created({ id: '66666666-6666-4666-8666-666666666666', contactId: '44444444-4444-4444-8444-444444444444', relationshipType: 'PRIMARY_CONTACT', isPrimary: true })).mockResolvedValueOnce(envelope({ request: sent, caseId: '77777777-7777-4777-8777-777777777777' }))
    vi.stubGlobal('fetch', fetchMock)

    const createdDraft = await requestsApi.create({ companyId: draft.companyId, establishmentId: draft.establishmentId, requestType: draft.requestType, reason: draft.reason })
    expect(createdDraft.status).toBe('DRAFT')
    await requestsApi.update(draft.id, { version: 1, reason: 'Registro actualizado' })
    await requestsApi.addContact(draft.id, { contactId: '44444444-4444-4444-8444-444444444444', relationshipType: 'PRIMARY_CONTACT', isPrimary: true })
    const result = await requestsApi.submit(draft.id, 2)
    expect(result.request.status).toBe('PENDING_ASSIGNMENT')
    expect(result.caseId).toBe('77777777-7777-4777-8777-777777777777')
  })

  it('valida archivos y consume upload, decisiones, archivo y descarga temporal', async () => {
    const document = { id: '88888888-8888-4888-8888-888888888888', requestId: '55555555-5555-4555-8555-555555555555', documentType: 'SUPPORTING_DOCUMENT', fileName: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: 8, status: 'PENDING', uploadedAt: '', validatedAt: null, validatedByUserId: null, rejectionReason: null, archivedAt: null, version: 1, createdAt: '', updatedAt: '' }
    const fetchMock = vi.fn().mockResolvedValueOnce(created(document)).mockResolvedValueOnce(envelope([document])).mockResolvedValueOnce(envelope({ ...document, status: 'VALID', version: 2 })).mockResolvedValueOnce(envelope({ ...document, status: 'REJECTED', rejectionReason: 'Ilegible', version: 2 })).mockResolvedValueOnce(envelope({ ...document, status: 'ARCHIVED', version: 3 })).mockResolvedValueOnce(envelope({ signedUrl: 'https://signed.test/file', expiresInSeconds: 60 }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['%PDF-1.7'], 'evidence.pdf', { type: 'application/pdf' })

    expect(validatePrivateFile(file, 0)).toBeNull()
    expect(validatePrivateFile(new File(['x'], 'bad.webp', { type: 'image/webp' }), 0)).toContain('PDF')
    expect(validatePrivateFile(file, 10)).toContain('10 documentos')
    await requestsApi.uploadDocument(document.requestId, 'SUPPORTING_DOCUMENT', file)
    expect(requestAt(fetchMock, 0).headers.get('Content-Type')).toContain('multipart/form-data')
    expect((await requestsApi.documents(document.requestId))[0].fileName).toBe('evidence.pdf')
    await requestsApi.validateDocument(document.requestId, document.id, 1)
    await requestsApi.rejectDocument(document.requestId, document.id, 1, 'Ilegible')
    await requestsApi.archiveDocument(document.requestId, document.id, 2)
    expect((await requestsApi.downloadUrl(document.requestId, document.id)).expiresInSeconds).toBe(60)
  })
})
