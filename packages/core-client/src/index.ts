export type CoreRole = 'ADMIN' | 'COMPANY_ADMIN' | 'DELEGATE' | 'COORDINATOR' | 'EVALUATOR' | 'UNIVERSAL';
export type InspectionStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_SUBMISSION' | 'SUBMITTED';
export type ReviewStatus = 'PENDING_REVIEW' | 'RETURNED_FOR_CORRECTION' | 'RESUBMITTED' | 'APPROVED';
export type ReportStatus = 'DRAFT' | 'OFFICIAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnalyticsLifecycleStatus = InspectionStatus | 'READY_FOR_REVIEW' | ReviewStatus | 'CLOSED';

export interface CoreMeta { correlationId: string; page?: number; limit?: number; total?: number }
export interface CoreEnvelope<T> { data: T; meta: CoreMeta }
export interface CoreErrorPayload { error: { code: string; message: string; details?: unknown }; meta?: Partial<CoreMeta> }
export interface CoreUser { id: string; fullName: string; roleCode: CoreRole; status: string; companyId: string | null; authTime: number }

export interface CoreInspection {
  id: string; caseId: string; assignmentId: string; evaluatorUserId: string; status: InspectionStatus;
  establishmentId: string | null; establishmentName: string | null; establishmentAddress: string | null; companyName: string | null;
  version: number; contentRevision: number; bpmTemplateVersionId: string; riskRuleVersionId: string;
  origin: string; priority: string; startedAt: string | null; finalizedAt: string | null;
  submittedAt: string | null; createdAt: string; updatedAt: string;
}

export interface CoreCalculation {
  id: string; calculationNumber: number; status: 'COMPLETED' | 'SUPERSEDED'; isCurrent: boolean;
  contentRevision: number; bpmNumerator: number | string; bpmDenominator: number | string;
  bpmPercentage: number | string; productRiskScore: number | string; establishmentRiskScore: number | string;
  totalRiskScore: number | string; frequency: 'ANNUAL' | 'SEMIANNUAL' | 'QUARTERLY'; calculatedAt: string;
  snapshots?: {
    bpm: Array<{ bpmItemId: string; displayCode: string | null; responseValue: string; responseScore: number | string | null; isApplicable: boolean }>;
    factors: Array<{ riskFactorId: string; factorCode: string; factorName: string; weight: number | string; optionId: string; optionCode: string; optionLabel: string; selectedScore: number | string; weightedContribution: number | string; sortOrder: number }>;
    food: Array<{ foodRiskSubcategoryId: string; categoryCode: string; subcategoryName: string; microbiologicalRisk: RiskLevel | null; riskScore: number | null; isApplicable: boolean }>;
    frequency: { lowerBound: number | string; upperBound: number | string | null; lowerInclusive: boolean; upperInclusive: boolean; frequency: string; label: string };
  };
}

export interface CoreReview {
  id: string; inspectionId: string; status: ReviewStatus; cycleNumber: number; reviewerUserId: string;
  initialCalculationId: string; currentCalculationId: string; returnCount: number; returnReason: string | null;
  resubmittedAt: string | null; approvedAt: string | null; approvedByUserId: string | null;
  version: number; createdAt: string; updatedAt: string;
  correctionItems?: Array<{ id: string; bpmItemId: string; returnNumber: number; status: 'OPEN' | 'CORRECTED'; responseVersionAtReturn: number | null; correctedResponseVersion: number | null; correctedAt: string | null }>;
  events?: Array<{ id: string; eventType: string; actorUserId: string; calculationId: string | null; occurredAt: string }>;
}

export interface CoreReport {
  id: string; inspectionId: string; reviewId: string; calculationId: string; status: ReportStatus;
  fileName: string; mimeType: 'application/pdf'; sizeBytes: number; verificationId: string;
  generatedByUserId: string; generatedAt: string; officialAt: string | null; officialByUserId: string | null;
  version: number; createdAt: string; updatedAt: string;
}
export interface CoreClosure { id: string; inspectionId: string; caseId: string; reportId: string; closedByUserId: string; closedAt: string; reason: string | null }

export interface CoreWorkPackage {
  inspection: CoreInspection;
  bpmTemplate: { versionId: string; items: Array<{ id: string; parentItemId: string | null; itemKind: string; displayCode: string | null; title: string; sortOrder: number; criticality: string | null; isEvaluable: boolean }> };
  responses: Array<{ id: string; bpmItemId: string; responseValue: string; observations: string | null; version: number }>;
  riskRule: { versionId: string; factors: unknown[]; foodCatalog: unknown[] };
  factorSelections: unknown[]; foodSnapshots: unknown[]; evidence: unknown[];
  currentCalculation: CoreCalculation | null; generatedAt: string;
}

export type AnalyticsCurrentCalculation = Pick<CoreCalculation,
  'id' | 'calculationNumber' | 'bpmPercentage' | 'productRiskScore' | 'establishmentRiskScore' | 'totalRiskScore' | 'frequency' | 'calculatedAt'>;

export interface AnalyticsEvaluation {
  id: string; caseId: string; origin: string; priority: string; inspectionStatus: InspectionStatus;
  lifecycleStatus: AnalyticsLifecycleStatus; riskLevel: RiskLevel | null;
  companyId: string | null; companyName: string | null; companyTradeName: string | null;
  establishmentId: string | null; establishmentName: string | null;
  evaluatorUserId: string; evaluatorName: string; createdAt: string; startedAt: string | null; submittedAt: string | null;
  currentCalculation: AnalyticsCurrentCalculation | null;
  currentReview: Pick<CoreReview, 'id' | 'cycleNumber' | 'status' | 'returnCount' | 'returnReason' | 'resubmittedAt' | 'approvedAt' | 'createdAt'> | null;
  latestReport: Pick<CoreReport, 'id' | 'status' | 'fileName' | 'verificationId' | 'generatedAt' | 'officialAt'> | null;
  closure: Pick<CoreClosure, 'id' | 'reportId' | 'closedAt' | 'reason'> | null;
}
export interface AnalyticsSummary { total: number; readyForReview: number; pendingReview: number; returnedForCorrection: number; approved: number; officialReports: number; closed: number; byRisk: Record<RiskLevel, number> }
export interface AnalyticsFilters { page?: number; limit?: number; search?: string; companyId?: string; establishmentId?: string; lifecycleStatus?: AnalyticsLifecycleStatus; riskLevel?: RiskLevel; reportStatus?: ReportStatus; createdFrom?: string; createdTo?: string }

export class CoreApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly correlationId?: string, public readonly details?: unknown) {
    super(message); this.name = 'CoreApiError';
  }
}
export interface CoreClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch; onSessionExpired?: () => void }

const defaultBaseUrl = () => globalThis.location?.origin ?? 'http://localhost';
const queryString = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
  const result = params.toString();
  return result ? `?${result}` : '';
};

export class CoreClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly onSessionExpired?: () => void;
  readonly baseUrl: string;

  constructor(baseUrlOrOptions: string | CoreClientOptions = {}) {
    const options = typeof baseUrlOrOptions === 'string' ? { baseUrl: baseUrlOrOptions } : baseUrlOrOptions;
    const url = new URL(options.baseUrl ?? defaultBaseUrl());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('La URL del Core debe comenzar con http o https.');
    this.baseUrl = url.origin;
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.onSessionExpired = options.onSessionExpired;
  }

  private expireSession() { this.accessToken = null; this.onSessionExpired?.(); }
  private async payload<T>(response: Response): Promise<CoreEnvelope<T>> {
    const payload = await response.json().catch(() => null) as CoreEnvelope<T> | CoreErrorPayload | null;
    if (!response.ok) {
      const failure = payload && 'error' in payload ? payload : null;
      throw new CoreApiError(response.status, failure?.error.code ?? 'HTTP_ERROR', failure?.error.message ?? `El Core respondió HTTP ${response.status}.`, failure?.meta?.correlationId, failure?.error.details);
    }
    if (!payload || !('data' in payload) || !payload.meta) throw new CoreApiError(response.status, 'INVALID_RESPONSE', 'La respuesta no cumple el contrato del Core.');
    return payload;
  }

  private async send(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const request = new Request(`${this.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
    let response: Response;
    try { response = await this.fetcher(request); }
    catch { throw new CoreApiError(0, 'NETWORK_ERROR', 'No se pudo conectar al Core.'); }
    if (response.status !== 401 || !retry || path.startsWith('/v1/auth/')) return response;
    const failure = await response.clone().json().catch(() => null) as CoreErrorPayload | null;
    if (failure?.error.code === 'REAUTHENTICATION_REQUIRED') return response;
    const token = await this.refreshAccessToken();
    if (!token) return response;
    const retryHeaders = new Headers(request.headers);
    retryHeaders.set('Authorization', `Bearer ${token}`);
    const retried = await this.fetcher(new Request(request.clone(), { headers: retryHeaders, credentials: 'include' }));
    if (retried.status === 401) {
      const retryFailure = await retried.clone().json().catch(() => null) as CoreErrorPayload | null;
      if (retryFailure?.error.code !== 'REAUTHENTICATION_REQUIRED') this.expireSession();
    }
    return retried;
  }

  async request<T>(path: string, init: RequestInit = {}) { return this.payload<T>(await this.send(path, init)); }
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const response = await this.send('/v1/auth/refresh', { method: 'POST' }, false);
        if (!response.ok) { this.expireSession(); return null; }
        const envelope = await this.payload<{ accessToken: string }>(response);
        this.accessToken = envelope.data.accessToken;
        return this.accessToken;
      } catch { this.expireSession(); return null; }
      finally { this.refreshPromise = null; }
    })();
    return this.refreshPromise;
  }

  async health() { return (await this.request<{ status: string }>('/health/ready')).data.status === 'ready'; }
  async login(email: string, password: string) {
    const result = await this.request<{ accessToken: string }>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.accessToken = result.data.accessToken;
    try { return (await this.me()).data; } catch (error) { this.accessToken = null; throw error; }
  }
  async restoreSession() { if (!await this.refreshAccessToken()) return null; try { return (await this.me()).data; } catch { this.expireSession(); return null; } }
  async reauthenticate(password: string) {
    const result = await this.request<{ accessToken: string }>('/v1/auth/reauthenticate', { method: 'POST', body: JSON.stringify({ password }) });
    this.accessToken = result.data.accessToken;
    return (await this.me()).data;
  }
  async logout() { try { await this.request<{ loggedOut: boolean }>('/v1/auth/logout', { method: 'POST' }); } finally { this.accessToken = null; } }
  disconnect() { this.accessToken = null; }
  get authenticated() { return this.accessToken !== null; }
  me() { return this.request<CoreUser>('/v1/auth/me'); }

  analyticsSummary() { return this.request<AnalyticsSummary>('/v1/analytics/summary'); }
  analyticsEvaluations(filters: AnalyticsFilters = {}) { return this.request<AnalyticsEvaluation[]>(`/v1/analytics/evaluations${queryString(filters as Record<string, string | number | undefined>)}`); }
  analyticsEvaluation(id: string) { return this.request<AnalyticsEvaluation>(`/v1/analytics/evaluations/${encodeURIComponent(id)}`); }
  inspection(id: string) { return this.request<CoreInspection>(`/v1/inspections/${encodeURIComponent(id)}`); }
  workPackage(id: string) { return this.request<CoreWorkPackage>(`/v1/inspections/${encodeURIComponent(id)}/work-package`); }
  currentCalculation(id: string) { return this.request<CoreCalculation>(`/v1/inspections/${encodeURIComponent(id)}/calculations/current`); }
  calculation(id: string, calculationId: string) { return this.request<CoreCalculation>(`/v1/inspections/${encodeURIComponent(id)}/calculations/${encodeURIComponent(calculationId)}`); }
  reviews(id: string) { return this.request<CoreReview[]>(`/v1/inspections/${encodeURIComponent(id)}/reviews`); }
  currentReview(id: string) { return this.request<CoreReview>(`/v1/inspections/${encodeURIComponent(id)}/reviews/current`); }
  openReview(id: string) { return this.request<CoreReview>(`/v1/inspections/${encodeURIComponent(id)}/reviews`, { method: 'POST', body: '{}' }); }
  returnReview(id: string, reviewId: string, reason: string, bpmItemIds: string[]) { return this.request<CoreReview>(`/v1/inspections/${encodeURIComponent(id)}/reviews/${encodeURIComponent(reviewId)}/return`, { method: 'POST', body: JSON.stringify({ reason, bpmItemIds }) }); }
  approveReview(id: string, reviewId: string, note?: string) { return this.request<CoreReview>(`/v1/inspections/${encodeURIComponent(id)}/reviews/${encodeURIComponent(reviewId)}/approve`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) }); }
  reports(id: string) { return this.request<CoreReport[]>(`/v1/inspections/${encodeURIComponent(id)}/reports`); }
  generateReport(id: string, operationId: string) { return this.request<CoreReport>(`/v1/inspections/${encodeURIComponent(id)}/reports/generate`, { method: 'POST', body: JSON.stringify({ operationId }) }); }
  officializeReport(id: string, reportId: string) { return this.request<CoreReport>(`/v1/inspections/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}/officialize`, { method: 'POST', body: '{}' }); }
  reportDownloadUrl(id: string, reportId: string) { return this.request<{ signedUrl: string; expiresInSeconds: 60 }>(`/v1/inspections/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}/download-url`, { method: 'POST', body: '{}' }); }
  closure(id: string) { return this.request<CoreClosure>(`/v1/inspections/${encodeURIComponent(id)}/closure`); }
  closeInspection(id: string, reportId: string, reason?: string) { return this.request<CoreClosure>(`/v1/inspections/${encodeURIComponent(id)}/close`, { method: 'POST', body: JSON.stringify(reason ? { reportId, reason } : { reportId }) }); }
}
