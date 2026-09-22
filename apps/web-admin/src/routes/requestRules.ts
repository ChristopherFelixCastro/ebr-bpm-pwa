import type { CompanyRequestDetail, RequestDocument } from '../api/resources'

export const isRequestReadOnly = (status: CompanyRequestDetail['status']) => status !== 'DRAFT'

export const submitPreconditionError = (request: CompanyRequestDetail, documents: RequestDocument[]) => {
  const activeContacts = request.contacts.filter((contact) => !contact.removedAt)
  const primaryCount = activeContacts.filter((contact) => contact.isPrimary).length
  const activeDocuments = documents.filter((document) => document.status !== 'ARCHIVED')
  const validLetters = activeDocuments.filter((document) => document.documentType === 'AUTHORIZATION_LETTER' && document.status === 'VALID')
  if (activeContacts.length < 1) return 'Debe vincular al menos un contacto.'
  if (primaryCount !== 1) return 'Debe existir exactamente un contacto primario.'
  if (activeDocuments.length < 1 || activeDocuments.length > 10) return 'Debe existir entre 1 y 10 documentos activos.'
  if (validLetters.length !== 1) return 'Debe existir exactamente una carta de autorización válida.'
  return null
}
