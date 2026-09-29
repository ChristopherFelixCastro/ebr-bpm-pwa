import { describe, expect, it } from 'vitest'
import { scheduleWindowError } from '../pages/operation/scheduleWindow'
import { displayLabel } from '../api/displayLabels'

describe('validación de agenda y etiquetas de contactos', () => {
  const now = Date.parse('2026-09-27T12:00:00-04:00')

  it('acepta una ventana futura válida y explica por qué se rechazan dos días', () => {
    expect(scheduleWindowError('2026-09-28T22:03', '2026-09-29T06:03', now)).toBeNull()
    expect(scheduleWindowError('2026-09-28T22:03', '2026-09-30T22:03', now)).toContain('12 horas')
  })

  it('muestra etiquetas españolas sin alterar los códigos de Core', () => {
    expect(displayLabel('PRIMARY_CONTACT')).toBe('Contacto principal')
    expect(displayLabel('LEGAL_REPRESENTATIVE')).toBe('Representante legal')
  })
})
