export interface CoreMeta {
  correlationId: string;
  page?: number;
  limit?: number;
  total?: number;
}

export interface CoreEnvelope<T> {
  data: T;
  meta: CoreMeta;
}

export interface CoreUser {
  id: string;
  role: string;
  authTime: number;
}

export interface CoreCase {
  id: string;
  origin: string;
  status: string;
  priority: string;
  companyId: string | null;
  establishmentId: string | null;
  createdAt: string;
  updatedAt: string;
  source?: Record<string, unknown>;
}

export interface CoreAssignment {
  id: string;
  caseId: string;
  evaluator: { id: string; fullName: string };
  isActive: boolean;
  assignedAt: string;
  version: number;
}

export interface CoreSchedule {
  id: string;
  caseId: string;
  evaluator: { id: string; fullName: string };
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: string;
  version: number;
}

export interface CoreInspection {
  id: string;
  caseId: string;
  evaluatorUserId: string;
  status: string;
  version: number;
  contentRevision: number;
  bpmTemplateVersionId: string;
  riskRuleVersionId: string;
  origin: string;
  priority: string;
  createdAt: string;
}

export interface CoreCalculation {
  id: string;
  status: string;
  isCurrent: boolean;
  bpmNumerator: number | string;
  bpmDenominator: number | string;
  bpmPercentage: number | string;
  productRiskScore: number | string;
  establishmentRiskScore: number | string;
  totalRiskScore: number | string;
  frequency: string;
  calculatedAt: string;
  snapshots?: Record<string, unknown>;
}

export interface CoreReview {
  id: string;
  inspectionId: string;
  status: string;
  cycleNumber: number;
  returnReason?: string | null;
  createdAt: string;
  correctionItems?: Array<{ bpmItemId: string; status: string }>;
}

export interface CoreReport {
  id: string;
  status: string;
  fileName: string;
  verificationId?: string;
  generatedAt: string;
  officialAt?: string | null;
}

export interface CoreWorkPackage {
  inspection: CoreInspection;
  bpmTemplate: {
    versionId: string;
    items: Array<{
      id: string;
      displayCode: string;
      title: string;
      isEvaluable: boolean;
    }>;
  };
  responses: Array<{
    bpmItemId: string;
    responseValue: string;
    observations?: string | null;
  }>;
  currentCalculation: CoreCalculation | null;
}

export class CoreApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CoreApiError';
    this.status = status;
    this.code = code;
  }
}

export class CoreClient {
  private accessToken: string | null = null;
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('La URL del Core debe comenzar con http o https.');
    }
    this.baseUrl = url.origin;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<CoreEnvelope<T>> {
    const headers = new Headers(init.headers);
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
      });
    } catch {
      throw new CoreApiError(0, 'NETWORK_ERROR', 'No se pudo conectar al Core. Compruebe la URL, el servidor y CORS.');
    }
    const payload = await response.json().catch(() => null) as
      | CoreEnvelope<T>
      | { error?: { code?: string; message?: string } }
      | null;
    if (!response.ok) {
      const error = payload && 'error' in payload ? payload.error : undefined;
      throw new CoreApiError(
        response.status,
        error?.code ?? 'HTTP_ERROR',
        error?.message ?? `El Core respondió HTTP ${response.status}.`,
      );
    }
    if (!payload || !('data' in payload)) {
      throw new CoreApiError(response.status, 'INVALID_RESPONSE', 'La respuesta no cumple el contrato del Core.');
    }
    return payload;
  }

  async health(): Promise<boolean> {
    const result = await this.request<{ status: string }>('/health/ready');
    return result.data.status === 'ready';
  }

  async login(email: string, password: string): Promise<CoreUser> {
    const result = await this.request<{ accessToken: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.accessToken = result.data.accessToken;
    try {
      return (await this.request<CoreUser>('/v1/auth/me')).data;
    } catch (error) {
      this.accessToken = null;
      throw error;
    }
  }

  disconnect(): void {
    this.accessToken = null;
  }

  get authenticated(): boolean {
    return this.accessToken !== null;
  }

  cases(page = 1) {
    return this.request<CoreCase[]>(`/v1/cases?page=${page}&limit=100`);
  }

  assignments(page = 1) {
    return this.request<CoreAssignment[]>(`/v1/assignments?page=${page}&limit=100`);
  }

  schedules(page = 1) {
    return this.request<CoreSchedule[]>(`/v1/schedules?page=${page}&limit=100`);
  }

  inspections(page = 1) {
    return this.request<CoreInspection[]>(`/v1/inspections?page=${page}&limit=100`);
  }

  inspection(id: string) {
    return this.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`);
  }

  workPackage(id: string) {
    return this.request<CoreWorkPackage>(`/v1/inspections/${encodeURIComponent(id)}/work-package`);
  }

  calculation(id: string) {
    return this.request<CoreCalculation>(`/v1/inspections/${encodeURIComponent(id)}/calculations/current`);
  }

  reviews(id: string) {
    return this.request<CoreReview[]>(`/v1/inspections/${encodeURIComponent(id)}/reviews`);
  }

  reports(id: string) {
    return this.request<CoreReport[]>(`/v1/inspections/${encodeURIComponent(id)}/reports`);
  }
}
