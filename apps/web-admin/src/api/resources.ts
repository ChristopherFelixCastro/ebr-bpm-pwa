import type { components } from './generated/schema'
import { apiClient, authenticatedFetch, parseResponse, unwrap, unwrapPage } from './http'

export type Company = components['schemas']['Company']
export type CompanyCreate = components['schemas']['CompanyCreateRequest']
export type CompanyPatch = components['schemas']['CompanyPatchRequest']
export type Establishment = components['schemas']['Establishment']
export type EstablishmentCreate = components['schemas']['EstablishmentCreateRequest']
export type EstablishmentPatch = components['schemas']['EstablishmentPatchRequest']
export type Contact = components['schemas']['Contact']
export type ContactCreate = components['schemas']['ContactRequest']
export type ContactPatch = components['schemas']['ContactPatchRequest']
export type ContactLink = components['schemas']['ContactLinkRequest']
export type ContactRelation = components['schemas']['ContactRelation']
export type CompanyRequest = components['schemas']['CompanyRequest']
export type CompanyRequestDetail = components['schemas']['CompanyRequestDetail']
export type CompanyRequestCreate = components['schemas']['CompanyRequestCreate']
export type CompanyRequestPatch = components['schemas']['CompanyRequestPatch']
export type RequestContact = components['schemas']['RequestContact']
export type RequestDocument = components['schemas']['RequestDocument']
export type DocumentType = RequestDocument['documentType']
export type User = components['schemas']['User']
export type UserCreate = components['schemas']['UserCreateRequest']
export type UserPatch = components['schemas']['UserPatchRequest']

export const usersApi = {
  list: async (query: { page: number; limit: number; search?: string }) =>
    unwrapPage<User>(await apiClient.GET('/v1/users', { params: { query } })),
  get: async (id: string) => unwrap<User>(await apiClient.GET('/v1/users/{id}', { params: { path: { id } } })),
  create: async (body: UserCreate) => unwrap<User>(await apiClient.POST('/v1/users', { body })),
  update: async (id: string, body: UserPatch) => unwrap<User>(await apiClient.PATCH('/v1/users/{id}', { params: { path: { id } }, body })),
  approve: async (id: string, version: number) => unwrap<User>(await apiClient.POST('/v1/users/{id}/approve', { params: { path: { id } }, body: { version } })),
  reject: async (id: string, version: number) => unwrap<User>(await apiClient.POST('/v1/users/{id}/reject', { params: { path: { id } }, body: { version } })),
  deactivate: async (id: string, version: number) => unwrap<User>(await apiClient.POST('/v1/users/{id}/deactivate', { params: { path: { id } }, body: { version } })),
}

export const companiesApi = {
  list: async (query: { page: number; limit: number; search?: string; status?: 'ACTIVE' | 'INACTIVE' }) =>
    unwrapPage<Company>(await apiClient.GET('/v1/companies', { params: { query } })),
  get: async (id: string) => unwrap<Company>(await apiClient.GET('/v1/companies/{id}', { params: { path: { id } } })),
  create: async (body: CompanyCreate) => unwrap<Company>(await apiClient.POST('/v1/companies', { body })),
  update: async (id: string, body: CompanyPatch) => unwrap<Company>(await apiClient.PATCH('/v1/companies/{id}', { params: { path: { id } }, body })),
  deactivate: async (id: string, version: number) => unwrap<Company>(await apiClient.POST('/v1/companies/{id}/deactivate', { params: { path: { id } }, body: { version } })),
}

export const establishmentsApi = {
  list: async (query: { page: number; limit: number; search?: string; status?: 'ACTIVE' | 'INACTIVE'; companyId?: string }) =>
    unwrapPage<Establishment>(await apiClient.GET('/v1/establishments', { params: { query } })),
  get: async (id: string) => unwrap<Establishment>(await apiClient.GET('/v1/establishments/{id}', { params: { path: { id } } })),
  create: async (body: EstablishmentCreate) => unwrap<Establishment>(await apiClient.POST('/v1/establishments', { body })),
  update: async (id: string, body: EstablishmentPatch) => unwrap<Establishment>(await apiClient.PATCH('/v1/establishments/{id}', { params: { path: { id } }, body })),
  deactivate: async (id: string, version: number) => unwrap<Establishment>(await apiClient.POST('/v1/establishments/{id}/deactivate', { params: { path: { id } }, body: { version } })),
}

export const contactsApi = {
  list: async (query: { page: number; limit: number; search?: string }) =>
    unwrapPage<Contact>(await apiClient.GET('/v1/contacts', { params: { query } })),
  get: async (id: string) => unwrap<Contact>(await apiClient.GET('/v1/contacts/{id}', { params: { path: { id } } })),
  create: async (body: ContactCreate) => unwrap<Contact>(await apiClient.POST('/v1/contacts', { body })),
  update: async (id: string, body: ContactPatch) => unwrap<Contact>(await apiClient.PATCH('/v1/contacts/{id}', { params: { path: { id } }, body })),
  listCompanyRelations: async (companyId: string) => unwrap<ContactRelation[]>(await apiClient.GET('/v1/companies/{companyId}/contacts', { params: { path: { companyId } } })),
  linkCompany: async (companyId: string, body: ContactLink) => unwrap<ContactRelation>(await apiClient.POST('/v1/companies/{companyId}/contacts', { params: { path: { companyId } }, body })),
  endCompanyRelation: async (companyId: string, relationId: string, version: number, effectiveTo: string) => unwrap<{ ended: true }>(await apiClient.POST('/v1/companies/{companyId}/contacts/{relationId}/end', { params: { path: { companyId, relationId } }, body: { version, effectiveTo } })),
  listEstablishmentRelations: async (establishmentId: string) => unwrap<ContactRelation[]>(await apiClient.GET('/v1/establishments/{establishmentId}/contacts', { params: { path: { establishmentId } } })),
  linkEstablishment: async (establishmentId: string, body: ContactLink) => unwrap<ContactRelation>(await apiClient.POST('/v1/establishments/{establishmentId}/contacts', { params: { path: { establishmentId } }, body })),
  endEstablishmentRelation: async (establishmentId: string, relationId: string, version: number, effectiveTo: string) => unwrap<{ ended: true }>(await apiClient.POST('/v1/establishments/{establishmentId}/contacts/{relationId}/end', { params: { path: { establishmentId, relationId } }, body: { version, effectiveTo } })),
}

export const requestsApi = {
  list: async (query: { page: number; limit: number; search?: string; status?: 'DRAFT' | 'PENDING_ASSIGNMENT'; establishmentId?: string; requestType?: string }) =>
    unwrapPage<CompanyRequest>(await apiClient.GET('/v1/company-requests', { params: { query } })),
  get: async (id: string) => unwrap<CompanyRequestDetail>(await apiClient.GET('/v1/company-requests/{id}', { params: { path: { id } } })),
  create: async (body: CompanyRequestCreate) => unwrap<CompanyRequest>(await apiClient.POST('/v1/company-requests', { body })),
  update: async (id: string, body: CompanyRequestPatch) => unwrap<CompanyRequest>(await apiClient.PATCH('/v1/company-requests/{id}', { params: { path: { id } }, body })),
  submit: async (id: string, version: number) => unwrap<components['schemas']['CompanyRequestSubmitResult']>(await apiClient.POST('/v1/company-requests/{id}/submit', { params: { path: { id } }, body: { version } })),
  addContact: async (id: string, body: components['schemas']['RequestContactCreate']) => unwrap<components['schemas']['RequestContactLinkResult']>(await apiClient.POST('/v1/company-requests/{id}/contacts', { params: { path: { id } }, body })),
  removeContact: async (id: string, requestContactId: string, version: number) => unwrap<{ removed: boolean }>(await apiClient.POST('/v1/company-requests/{id}/contacts/{requestContactId}/remove', { params: { path: { id, requestContactId } }, body: { version } })),
  documents: async (id: string) => unwrap<RequestDocument[]>(await apiClient.GET('/v1/company-requests/{id}/documents', { params: { path: { id } } })),
  uploadDocument: async (id: string, documentType: DocumentType, file: File) => {
    const form = new FormData()
    form.append('documentType', documentType)
    form.append('file', file)
    return parseResponse<RequestDocument>(await authenticatedFetch(`/v1/company-requests/${id}/documents`, { method: 'POST', body: form }))
  },
  validateDocument: async (id: string, documentId: string, version: number) => unwrap<RequestDocument>(await apiClient.POST('/v1/company-requests/{id}/documents/{documentId}/validate', { params: { path: { id, documentId } }, body: { version } })),
  rejectDocument: async (id: string, documentId: string, version: number, reason: string) => unwrap<RequestDocument>(await apiClient.POST('/v1/company-requests/{id}/documents/{documentId}/reject', { params: { path: { id, documentId } }, body: { version, reason } })),
  archiveDocument: async (id: string, documentId: string, version: number) => unwrap<RequestDocument>(await apiClient.POST('/v1/company-requests/{id}/documents/{documentId}/archive', { params: { path: { id, documentId } }, body: { version } })),
  downloadUrl: async (id: string, documentId: string) => unwrap<components['schemas']['DownloadUrl']>(await apiClient.POST('/v1/company-requests/{id}/documents/{documentId}/download-url', { params: { path: { id, documentId } } })),
}

export const validatePrivateFile = (file: File, activeDocumentCount: number): string | null => {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Solo se permiten archivos PDF, JPG o PNG.'
  if (file.size > 5 * 1024 * 1024) return 'El archivo supera el máximo de 5 MiB.'
  if (activeDocumentCount >= 10) return 'La solicitud ya contiene el máximo de 10 documentos activos.'
  return null
}
