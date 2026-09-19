export type Role = 
  | 'ADMINISTRADOR'
  | 'ADMIN_EMPRESA'
  | 'DELEGADO'
  | 'COORDINADOR'
  | 'TECNICO_EVALUADOR'
  | 'UNIVERSAL';

export type UserStatus = 
  | 'PENDIENTE_VALIDACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'INACTIVO';

export interface User {
  id: string;
  fullName: string;
  identityNumber: string; // Cédula o pasaporte
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  companyId?: string;
  companyName?: string;
  establishmentIds?: string[];
  authorizationLetterUrl?: string;
  authorizationLetterName?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  legalName: string; // Razón Social
  rnc: string; // RNC o Registro Fiscal
  tradeName: string; // Nombre Comercial
  address: string;
  municipality: string;
  province: string;
  economicActivity: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  establishmentsCount?: number;
}

export interface Establishment {
  id: string;
  companyId: string;
  name: string;
  address: string;
  municipality: string;
  province: string;
  permitNo: string; // Permiso Sanitario o Registro
  operationsStartDate: string;
  active: boolean;
  foodCategories?: string[]; // Perfil alimentario
  createdAt: string;
}

export type ContactRole = 
  | 'PROPIETARIO'
  | 'REPRESENTANTE_LEGAL'
  | 'CALIDAD'
  | 'CONTACTO_PRINCIPAL'
  | 'DIRECTOR_PLANTA'
  | 'OTRO';

export interface Contact {
  id: string;
  fullName: string;
  identityNumber: string;
  phone: string;
  email: string;
  active: boolean;
  role?: ContactRole; // Default or preferred role
  establishmentAssociations?: {
    establishmentId: string;
    establishmentName: string;
    contactRole: ContactRole;
    validFrom: string;
  }[];
}

export interface EstablishmentContact {
  id: string;
  establishmentId: string;
  contactId: string;
  contact: Contact;
  contactRole: ContactRole;
  validFrom: string;
  validTo?: string;
}

export type BPMRequestStatus =
  | 'BORRADOR'
  | 'PENDIENTE_DE_ASIGNACION'
  | 'ASIGNADA'
  | 'EN_PROGRESO'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'DEVUELTA'
  | 'CERRADA';

export interface RequestDocument {
  id: string;
  name: string;
  sizeBytes: number;
  type: string;
  documentType: string;
  url: string;
  uploadedAt: string;
}

export interface BPMRequest {
  id: string;
  requestNumber: string;
  companyId: string;
  companyName: string;
  establishmentId: string;
  establishmentName: string;
  establishmentAddress: string;
  establishmentType: string;
  reason: string;
  observations?: string;
  status: BPMRequestStatus;
  documents: RequestDocument[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  caseId?: string;
}

export interface EvaluationRecord {
  id: string;
  requestId: string;
  establishmentName: string;
  inspectionDate: string;
  evaluatorName: string;
  scorePercentage: number;
  riskScore: number;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  status: 'APROBADA' | 'EN_REVISION' | 'DEVUELTA';
  reportPdfUrl?: string;
  summaryFindings: string;
}

export interface FoodCategoryCatalog {
  id: string;
  category: string;
  subcategory: string;
  microbiologicalRisk: 'BAJO' | 'MEDIO' | 'ALTO' | 'NA';
  riskScore: number;
}
