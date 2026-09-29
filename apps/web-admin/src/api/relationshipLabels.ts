import type { ContactLink } from './resources'

export const relationshipLabels: Record<ContactLink['relationshipType'], string> = {
  LEGAL_REPRESENTATIVE: 'Representante legal',
  QUALITY_CONTACT: 'Contacto de calidad',
  PRIMARY_CONTACT: 'Contacto principal',
  OWNER: 'Propietario',
  REPRESENTATIVE: 'Representante',
}
