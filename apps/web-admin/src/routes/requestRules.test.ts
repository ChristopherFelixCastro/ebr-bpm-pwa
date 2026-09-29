import { describe, expect, it } from 'vitest'
import type { CompanyRequestDetail, RequestDocument } from '../api/resources'
import { isRequestReadOnly, submitPreconditionError } from './requestRules'

const request = (contacts: CompanyRequestDetail['contacts']) => ({ status: 'DRAFT', contacts } as CompanyRequestDetail)
const document = (status: RequestDocument['status'], documentType: RequestDocument['documentType'] = 'AUTHORIZATION_LETTER') => ({ status, documentType } as RequestDocument)

describe('reglas de presentación de solicitudes', () => {
  it('rechaza el envío sin contacto primario y carta válida', () => {
    expect(submitPreconditionError(request([]), [])).toBe('Debe vincular al menos un contacto.')
    expect(submitPreconditionError(request([{ isPrimary: false, removedAt: null } as CompanyRequestDetail['contacts'][number]]), [document('VALID')])).toBe('Debe existir exactamente un contacto primario.')
    expect(submitPreconditionError(request([{ isPrimary: true, removedAt: null } as CompanyRequestDetail['contacts'][number]]), [document('PENDING')])).toBe('Debe existir exactamente una carta de autorización válida.')
  })

  it('permite enviar con exactamente un primario y una carta válida', () => {
    expect(submitPreconditionError(request([{ isPrimary: true, removedAt: null } as CompanyRequestDetail['contacts'][number]]), [document('VALID'), document('PENDING', 'SUPPORTING_DOCUMENT')])).toBeNull()
  })

  it('deja el borrador editable y bloquea PENDING_ASSIGNMENT', () => {
    expect(isRequestReadOnly('DRAFT')).toBe(false)
    expect(isRequestReadOnly('PENDING_ASSIGNMENT')).toBe(true)
  })
})
