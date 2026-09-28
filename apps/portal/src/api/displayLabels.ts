// La interfaz traduce los códigos; los valores enviados a Core permanecen intactos.
const labels: Record<string, string> = {
  READY_FOR_REVIEW: 'Listo para revisión', PENDING_REVIEW: 'En revisión',
  RETURNED_FOR_CORRECTION: 'Devuelto para corrección', RESUBMITTED: 'Reenviado',
  APPROVED: 'Aprobado', CLOSED: 'Cerrado', DRAFT: 'Borrador',
  IN_PROGRESS: 'En curso', PENDING_SUBMISSION: 'Pendiente de envío',
  SUBMITTED: 'Enviado', PENDING_ASSIGNMENT: 'Pendiente de asignación',
  ASSIGNED: 'Asignado', NO_ACTION: 'No procede', REFERRED: 'Remitido',
  PENDING_VALIDATION: 'Pendiente de validación', REJECTED: 'Rechazado',
  INACTIVE: 'Inactivo', ACTIVE: 'Activo', PENDING: 'Pendiente',
  VALID: 'Válido', ARCHIVED: 'Archivado', PUBLISHED: 'Publicado',
  RETIRED: 'Retirado', OFFICIAL: 'Oficial', LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto',
  ANNUAL: 'Anual', SEMIANNUAL: 'Semestral', QUARTERLY: 'Trimestral',
  PROCEEDS: 'Procede', NOT_PROCEEDS: 'No procede',
  AUTHORIZATION_LETTER: 'Carta de autorización', SUPPORTING_DOCUMENT: 'Documento de soporte',
  REGISTRATION: 'Registro', CANCELLED: 'Cancelado', SCHEDULED: 'Programado',
  SUPERSEDED: 'Sustituido', UPLOADED: 'Cargado', APPLIED: 'Aplicado',
  SENDING: 'Enviando', CONFIRMED: 'Confirmado',
  CONFLICT: 'En conflicto', RESOLVED: 'Resuelto', CORRECTED: 'Corregido',
  OPEN: 'Abierto', APPROVE: 'Aprobar', RETURN: 'Devolver',
  UPSERT_BPM_RESPONSE: 'Guardar respuesta BPM', DELETE_BPM_RESPONSE: 'Eliminar respuesta BPM',
  UPSERT_RISK_FACTOR_SELECTION: 'Guardar factor de riesgo', ADD_FOOD_SNAPSHOT: 'Agregar producto',
  REMOVE_FOOD_SNAPSHOT: 'Quitar producto', ADD_EVIDENCE: 'Agregar evidencia',
  DELETE_EVIDENCE: 'Quitar evidencia', FINALIZE: 'Finalizar inspección',
  SUBMIT: 'Enviar inspección', RECORD_LOCATION: 'Guardar ubicación', SAVE_LOCATION: 'Guardar ubicación',
  LEGAL_REPRESENTATIVE: 'Representante legal', QUALITY_CONTACT: 'Contacto de calidad',
  PRIMARY_CONTACT: 'Contacto principal', OWNER: 'Propietario', REPRESENTATIVE: 'Representante',
}

export function displayLabel(value: string | null | undefined): string {
  if (!value) return '—'
  if (labels[value]) return labels[value]
  // Para códigos nuevos del Core, evitar mostrar sintaxis interna al usuario.
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
    const words = value.toLowerCase().replace(/_/g, ' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
  }
  return value
}
