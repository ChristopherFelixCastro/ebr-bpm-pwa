import { core } from './core'

export type Company = { id: string; legalName: string; tradeName: string | null; rnc: string | null; address: string | null; phone: string | null; email: string | null; economicActivityCode: string | null; status: 'ACTIVE' | 'INACTIVE'; version: number; establishmentCount: number; activeEstablishmentCount: number }
export type CompanyCreate = Pick<Company, 'legalName'> & { rnc: string; tradeName?: string | null; address?: string | null; phone?: string | null; email?: string | null; economicActivityCode?: string | null }
export type CompanyPatch = Partial<Omit<CompanyCreate, 'rnc'>> & { version: number; rnc?: string }
export type OperationalProfile = { id: string; establishmentId: string; annualProduction: number | null; marketTarget: string | null; commercializationScope: string | null; employeeCount: number | null; maleEmployeeCount: number | null; femaleEmployeeCount: number | null; haccpStatus: string | null; haccpImplementationLevel: string | null; samplingPlanStatus: string | null; samplingPlanScope: string | null; inabieSupplierStatus: string | null; inabieDistributionScope: string | null; effectiveFrom: string; effectiveTo: string | null; version: number; createdAt: string }
export type OperationalProfileCreate = Omit<Partial<OperationalProfile>, 'id' | 'establishmentId' | 'effectiveTo' | 'version' | 'createdAt'> & { effectiveFrom: string }
export type Establishment = { id: string; companyId: string; companyLegalName: string; name: string; establishmentTypeCode: string | null; address: string | null; provinceCode: string | null; municipalityCode: string | null; healthJurisdictionCode: string | null; sanitaryPermitNumber: string | null; sanitaryPermitExpiresAt: string | null; operationsStartedAt: string | null; status: 'ACTIVE' | 'INACTIVE'; version: number; currentOperationalProfile: OperationalProfile | null }
export type EstablishmentCreate = Pick<Establishment, 'companyId' | 'name'> & Partial<Pick<Establishment, 'establishmentTypeCode' | 'address' | 'provinceCode' | 'municipalityCode' | 'healthJurisdictionCode' | 'sanitaryPermitNumber' | 'sanitaryPermitExpiresAt' | 'operationsStartedAt'>>
export type EstablishmentPatch = Partial<Omit<EstablishmentCreate, 'companyId'>> & { version: number }
export type Contact = { id: string; fullName: string; identityDocumentMasked: string | null; identityDocument?: string | null; phone: string | null; email: string | null; version: number }
export type ContactCreate = { fullName: string; identityDocument?: string | null; phone?: string | null; email?: string | null }
export type ContactPatch = Partial<ContactCreate> & { version: number }
export type RelationshipType = 'LEGAL_REPRESENTATIVE' | 'QUALITY_CONTACT' | 'PRIMARY_CONTACT' | 'OWNER' | 'REPRESENTATIVE'
export type ContactLink = { contactId?: string; contact?: ContactCreate; relationshipType: RelationshipType; isPrimary: boolean; effectiveFrom: string }
export type ContactRelation = { id: string; companyId?: string; establishmentId?: string; relationshipType: RelationshipType; isPrimary: boolean; effectiveFrom: string; effectiveTo: string | null; version: number; contact: Contact }
export type CompanyRequest = { id: string; companyId: string; establishmentId: string; establishmentName?: string; requestType: string; reason: string; observations?: string | null; status: 'DRAFT' | 'PENDING_ASSIGNMENT'; submittedAt?: string | null; version: number; createdAt: string; updatedAt: string }
export type CompanyRequestCreate = { companyId?: string; establishmentId: string; requestType: string; reason: string; observations?: string | null }
export type CompanyRequestPatch = Partial<Omit<CompanyRequestCreate, 'companyId'>> & { version: number }
export type RequestContact = { id: string; contactId: string; relationshipType: RelationshipType; fullName: string; phone: string | null; email: string | null; isPrimary: boolean; removedAt: string | null; version: number }
export type CompanyRequestDetail = CompanyRequest & { contacts: RequestContact[]; documentSummary: { total: number; pending: number; valid: number; rejected: number; archived: number } }
export type DocumentType = 'AUTHORIZATION_LETTER' | 'SUPPORTING_DOCUMENT'
export type RequestDocument = { id: string; requestId: string; documentType: DocumentType; fileName: string; mimeType: string; sizeBytes: number; status: 'PENDING' | 'VALID' | 'REJECTED' | 'ARCHIVED'; rejectionReason: string | null; version: number }
export type PendingDocument = { id: string; requestId: string; documentType: DocumentType; fileName: string; version: number; establishmentName: string; requestType: string }

type PageQuery = { page: number; limit: number; search?: string; status?: string; companyId?: string; establishmentId?: string; requestType?: string }
const query = (values: PageQuery) => { const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) }); return `?${params}` }
const path = (id: string) => encodeURIComponent(id)
const get = async <T,>(url: string) => (await core.request<T>(url, { cache: 'no-store' })).data
const page = <T,>(url: string) => core.request<T[]>(url, { cache: 'no-store' })
const post = async <T,>(url: string, body?: unknown) => (await core.request<T>(url, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).data
const patch = async <T,>(url: string, body: unknown) => (await core.request<T>(url, { method: 'PATCH', body: JSON.stringify(body) })).data

export const companiesApi = {
  list: (values: PageQuery) => page<Company>(`/v1/companies${query(values)}`),
  get: (id: string) => get<Company>(`/v1/companies/${path(id)}`),
  create: (body: CompanyCreate) => post<Company>('/v1/companies', body),
  update: (id: string, body: CompanyPatch) => patch<Company>(`/v1/companies/${path(id)}`, body),
  deactivate: (id: string, version: number) => post<Company>(`/v1/companies/${path(id)}/deactivate`, { version }),
}
export const establishmentsApi = {
  list: (values: PageQuery) => page<Establishment>(`/v1/establishments${query(values)}`),
  get: (id: string) => get<Establishment>(`/v1/establishments/${path(id)}`),
  create: (body: EstablishmentCreate) => post<Establishment>('/v1/establishments', body),
  update: (id: string, body: EstablishmentPatch) => patch<Establishment>(`/v1/establishments/${path(id)}`, body),
  deactivate: (id: string, version: number) => post<Establishment>(`/v1/establishments/${path(id)}/deactivate`, { version }),
  profiles: (id: string) => get<OperationalProfile[]>(`/v1/establishments/${path(id)}/operational-profiles`),
  createProfile: (id: string, body: OperationalProfileCreate) => post<OperationalProfile>(`/v1/establishments/${path(id)}/operational-profiles`, body),
}
export const contactsApi = {
  list: (values: PageQuery) => page<Contact>(`/v1/contacts${query(values)}`),
  get: (id: string) => get<Contact>(`/v1/contacts/${path(id)}`),
  create: (body: ContactCreate) => post<Contact>('/v1/contacts', body),
  update: (id: string, body: ContactPatch) => patch<Contact>(`/v1/contacts/${path(id)}`, body),
  listCompanyRelations: (companyId: string) => get<ContactRelation[]>(`/v1/companies/${path(companyId)}/contacts`),
  linkCompany: (companyId: string, body: ContactLink) => post<ContactRelation>(`/v1/companies/${path(companyId)}/contacts`, body),
  endCompanyRelation: (companyId: string, relationId: string, version: number, effectiveTo: string) => post<{ ended: true }>(`/v1/companies/${path(companyId)}/contacts/${path(relationId)}/end`, { version, effectiveTo }),
  listEstablishmentRelations: (establishmentId: string) => get<ContactRelation[]>(`/v1/establishments/${path(establishmentId)}/contacts`),
  linkEstablishment: (establishmentId: string, body: ContactLink) => post<ContactRelation>(`/v1/establishments/${path(establishmentId)}/contacts`, body),
  endEstablishmentRelation: (establishmentId: string, relationId: string, version: number, effectiveTo: string) => post<{ ended: true }>(`/v1/establishments/${path(establishmentId)}/contacts/${path(relationId)}/end`, { version, effectiveTo }),
}
export const requestsApi = {
  list: (values: PageQuery) => page<CompanyRequest>(`/v1/company-requests${query(values)}`),
  pendingDocuments: (values: { page: number; limit: number }) => page<PendingDocument>(`/v1/company-requests/documents/pending${query(values)}`),
  get: (id: string) => get<CompanyRequestDetail>(`/v1/company-requests/${path(id)}`),
  create: (body: CompanyRequestCreate) => post<CompanyRequest>('/v1/company-requests', body),
  update: (id: string, body: CompanyRequestPatch) => patch<CompanyRequest>(`/v1/company-requests/${path(id)}`, body),
  submit: (id: string, version: number) => post<{ request: CompanyRequest; caseId: string }>(`/v1/company-requests/${path(id)}/submit`, { version }),
  addContact: (id: string, body: { contactId: string; relationshipType: RelationshipType; isPrimary: boolean }) => post<{ id: string }>(`/v1/company-requests/${path(id)}/contacts`, body),
  removeContact: (id: string, contactId: string, version: number) => post<{ removed: boolean }>(`/v1/company-requests/${path(id)}/contacts/${path(contactId)}/remove`, { version }),
  documents: (id: string) => get<RequestDocument[]>(`/v1/company-requests/${path(id)}/documents`),
  uploadDocument: (id: string, documentType: DocumentType, file: File) => { const form = new FormData(); form.append('documentType', documentType); form.append('file', file); return core.request<RequestDocument>(`/v1/company-requests/${path(id)}/documents`, { method: 'POST', body: form }).then((result) => result.data) },
  validateDocument: (id: string, documentId: string, version: number) => post<RequestDocument>(`/v1/company-requests/${path(id)}/documents/${path(documentId)}/validate`, { version }),
  rejectDocument: (id: string, documentId: string, version: number, reason: string) => post<RequestDocument>(`/v1/company-requests/${path(id)}/documents/${path(documentId)}/reject`, { version, reason }),
  archiveDocument: (id: string, documentId: string, version: number) => post<RequestDocument>(`/v1/company-requests/${path(id)}/documents/${path(documentId)}/archive`, { version }),
  downloadUrl: (id: string, documentId: string) => post<{ signedUrl: string; expiresInSeconds: number }>(`/v1/company-requests/${path(id)}/documents/${path(documentId)}/download-url`),
}
export const validatePrivateFile = (file: File, activeCount: number) => !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ? 'Solo se permiten archivos PDF, JPG o PNG.' : file.size > 5 * 1024 * 1024 ? 'El archivo supera el máximo de 5 MiB.' : activeCount >= 10 ? 'La solicitud ya contiene el máximo de 10 documentos activos.' : null
