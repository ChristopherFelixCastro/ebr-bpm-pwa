import type {
  Company,
  Establishment,
  Contact,
  BPMRequest,
  User,
  EvaluationRecord,
  RequestDocument,
  ContactRole,
} from '../types';
import {
  INITIAL_COMPANIES,
  INITIAL_ESTABLISHMENTS,
  INITIAL_CONTACTS,
  INITIAL_REQUESTS,
  INITIAL_USERS,
  INITIAL_EVALUATIONS,
} from './mockData';

// Simulated delay helper
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  COMPANIES: 'ebr_companies',
  ESTABLISHMENTS: 'ebr_establishments',
  CONTACTS: 'ebr_contacts',
  REQUESTS: 'ebr_requests',
  USERS: 'ebr_users',
  EVALUATIONS: 'ebr_evaluations',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to localStorage ${key}:`, err);
  }
}

// Initialize default storage if not present
if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
  setStored(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  setStored(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
  setStored(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
  setStored(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
  setStored(STORAGE_KEYS.USERS, INITIAL_USERS);
  setStored(STORAGE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS);
}

export const apiService = {
  // ===================== COMPANIES =====================
  async getCompanies(): Promise<Company[]> {
    await delay(250);
    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const establishments = getStored<Establishment[]>(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
    return companies.map((c) => ({
      ...c,
      establishmentsCount: establishments.filter((e) => e.companyId === c.id).length,
    }));
  },

  async getCompanyById(id: string): Promise<Company | null> {
    await delay(200);
    const companies = await this.getCompanies();
    return companies.find((c) => c.id === id) || null;
  },

  async createCompany(data: Omit<Company, 'id' | 'createdAt' | 'establishmentsCount'>): Promise<Company> {
    await delay(350);
    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const newCompany: Company = {
      ...data,
      id: `comp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      establishmentsCount: 0,
    };
    companies.unshift(newCompany);
    setStored(STORAGE_KEYS.COMPANIES, companies);
    return newCompany;
  },

  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    await delay(300);
    const companies = getStored<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    const index = companies.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Empresa no encontrada');
    companies[index] = { ...companies[index], ...data };
    setStored(STORAGE_KEYS.COMPANIES, companies);
    return companies[index];
  },

  // ===================== ESTABLISHMENTS =====================
  async getEstablishments(companyId?: string): Promise<Establishment[]> {
    await delay(250);
    const establishments = getStored<Establishment[]>(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
    if (companyId) {
      return establishments.filter((e) => e.companyId === companyId);
    }
    return establishments;
  },

  async createEstablishment(data: Omit<Establishment, 'id' | 'createdAt'>): Promise<Establishment> {
    await delay(350);
    const establishments = getStored<Establishment[]>(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
    const newEst: Establishment = {
      ...data,
      id: `est-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    establishments.push(newEst);
    setStored(STORAGE_KEYS.ESTABLISHMENTS, establishments);
    return newEst;
  },

  async updateEstablishment(id: string, data: Partial<Establishment>): Promise<Establishment> {
    await delay(300);
    const establishments = getStored<Establishment[]>(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
    const index = establishments.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Establecimiento no encontrado');
    establishments[index] = { ...establishments[index], ...data };
    setStored(STORAGE_KEYS.ESTABLISHMENTS, establishments);
    return establishments[index];
  },

  // ===================== CONTACTS =====================
  async getContacts(): Promise<Contact[]> {
    await delay(200);
    return getStored<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
  },

  async createContact(data: Omit<Contact, 'id'>): Promise<Contact> {
    await delay(300);
    const contacts = getStored<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    
    // Check for existing identity number to avoid duplicates
    const existing = contacts.find(
      (c) => c.identityNumber.replace(/\D/g, '') === data.identityNumber.replace(/\D/g, '')
    );
    if (existing) {
      throw new Error(`Ya existe un contacto registrado con la cédula/identidad ${data.identityNumber}`);
    }

    const newContact: Contact = {
      ...data,
      id: `cont-${Date.now()}`,
    };
    contacts.push(newContact);
    setStored(STORAGE_KEYS.CONTACTS, contacts);
    return newContact;
  },

  async assignContactToEstablishment(
    contactId: string,
    establishmentId: string,
    establishmentName: string,
    contactRole: ContactRole
  ): Promise<Contact> {
    await delay(300);
    const contacts = getStored<Contact[]>(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) throw new Error('Contacto no encontrado');

    const associations = contact.establishmentAssociations || [];
    const filtered = associations.filter((a) => a.establishmentId !== establishmentId);
    filtered.push({
      establishmentId,
      establishmentName,
      contactRole,
      validFrom: new Date().toISOString().split('T')[0],
    });

    contact.establishmentAssociations = filtered;
    setStored(STORAGE_KEYS.CONTACTS, contacts);
    return contact;
  },

  // ===================== BPM REQUESTS =====================
  async getRequests(companyId?: string): Promise<BPMRequest[]> {
    await delay(300);
    const requests = getStored<BPMRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    if (companyId) {
      return requests.filter((r) => r.companyId === companyId);
    }
    return requests;
  },

  async getRequestById(id: string): Promise<BPMRequest | null> {
    await delay(200);
    const requests = getStored<BPMRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    return requests.find((r) => r.id === id) || null;
  },

  async saveRequestDraft(
    data: Omit<BPMRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<BPMRequest> {
    await delay(400);
    const requests = getStored<BPMRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    const now = new Date().toISOString();

    if (data.id) {
      const index = requests.findIndex((r) => r.id === data.id);
      if (index !== -1) {
        requests[index] = {
          ...requests[index],
          ...data,
          status: 'BORRADOR',
          updatedAt: now,
        };
        setStored(STORAGE_KEYS.REQUESTS, requests);
        return requests[index];
      }
    }

    const count = requests.length + 1;
    const requestNumber = `SOL-2026-${String(count).padStart(5, '0')}`;
    const newRequest: BPMRequest = {
      ...data,
      id: `req-${Date.now()}`,
      requestNumber,
      status: 'BORRADOR',
      createdAt: now,
      updatedAt: now,
    };

    requests.unshift(newRequest);
    setStored(STORAGE_KEYS.REQUESTS, requests);
    return newRequest;
  },

  async submitRequest(requestId: string): Promise<BPMRequest> {
    await delay(500);
    const requests = getStored<BPMRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) throw new Error('Solicitud no encontrada');

    const req = requests[index];
    if (req.documents.length === 0) {
      throw new Error('Debe adjuntar al menos un documento obligatorio antes de enviar la solicitud.');
    }

    const now = new Date().toISOString();
    requests[index] = {
      ...req,
      status: 'PENDIENTE_DE_ASIGNACION',
      submittedAt: now,
      updatedAt: now,
    };

    setStored(STORAGE_KEYS.REQUESTS, requests);
    return requests[index];
  },

  // ===================== USERS & APPROVALS =====================
  async getUsers(): Promise<User[]> {
    await delay(250);
    return getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  async registerUser(userData: Omit<User, 'id' | 'status' | 'createdAt'>): Promise<User> {
    await delay(400);
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const existing = users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo electrónico.');
    }

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      status: 'PENDIENTE_VALIDACION',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);
    return newUser;
  },

  async approveUser(userId: string, reviewerName: string): Promise<User> {
    await delay(350);
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('Usuario no encontrado');

    users[index] = {
      ...users[index],
      status: 'APROBADO',
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.USERS, users);
    return users[index];
  },

  async rejectUser(userId: string, reason: string, reviewerName: string): Promise<User> {
    await delay(350);
    const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('Usuario no encontrado');

    users[index] = {
      ...users[index],
      status: 'RECHAZADO',
      rejectionReason: reason,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.USERS, users);
    return users[index];
  },

  // ===================== EVALUATIONS =====================
  async getEvaluations(companyId?: string): Promise<EvaluationRecord[]> {
    await delay(250);
    const evaluations = getStored<EvaluationRecord[]>(STORAGE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS);
    if (companyId) {
      // Find requests belonging to this company
      const requests = getStored<BPMRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
      const companyReqIds = new Set(requests.filter((r) => r.companyId === companyId).map((r) => r.id));
      return evaluations.filter((e) => companyReqIds.has(e.requestId));
    }
    return evaluations;
  },

  // ===================== FILE UPLOAD SIMULATION =====================
  async uploadFile(file: File, documentType: string): Promise<RequestDocument> {
    await delay(450);

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`El archivo "${file.name}" supera el tamaño máximo permitido de 5 MB.`);
    }

    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido. Solo se admiten documentos PDF o imágenes JPG/PNG.`);
    }

    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      sizeBytes: file.size,
      type: file.type,
      documentType,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    };
  },

  // Reset to factory defaults for easy testing
  resetAllData(): void {
    setStored(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
    setStored(STORAGE_KEYS.ESTABLISHMENTS, INITIAL_ESTABLISHMENTS);
    setStored(STORAGE_KEYS.CONTACTS, INITIAL_CONTACTS);
    setStored(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    setStored(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStored(STORAGE_KEYS.EVALUATIONS, INITIAL_EVALUATIONS);
  },
};
