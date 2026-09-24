import type { CoreUser } from '@ebr-bpm/core-client'

export const isGlobal = (user: CoreUser | null) => user?.status === 'APPROVED' && (user.roleCode === 'ADMIN' || user.roleCode === 'UNIVERSAL')
export const isOwnCompany = (user: CoreUser | null, companyId: string) => Boolean(user?.status === 'APPROVED' && user.companyId && user.companyId === companyId)
export const canEditCompany = (user: CoreUser | null, companyId: string) => isGlobal(user) || (user?.roleCode === 'COMPANY_ADMIN' && isOwnCompany(user, companyId))
export const canEditEstablishment = canEditCompany
export const canEditRequest = (user: CoreUser | null, companyId: string, status: string) => status === 'DRAFT' && (isGlobal(user) || ((user?.roleCode === 'COMPANY_ADMIN' || user?.roleCode === 'DELEGATE') && isOwnCompany(user, companyId)))
export const canReviewDocuments = (user: CoreUser | null, status: string) => status === 'DRAFT' && (isGlobal(user) || (user?.status === 'APPROVED' && user.roleCode === 'COORDINATOR'))
export const canArchiveDocument = (user: CoreUser | null, companyId: string, status: string) => status === 'DRAFT' && (canReviewDocuments(user, status) || ((user?.roleCode === 'COMPANY_ADMIN' || user?.roleCode === 'DELEGATE') && isOwnCompany(user, companyId)))
