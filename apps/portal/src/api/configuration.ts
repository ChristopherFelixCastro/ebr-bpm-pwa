import { core } from './core'

// Configuración versionada (F4): catálogos, plantillas BPM y reglas de riesgo.
// El orden, la validación, la publicación y el predeterminado los decide Core; aquí solo se transporta el contrato.

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED'
export type DefinitionVersion = {
  id: string; resourceId: string; versionNumber: number; status: VersionStatus
  publicationNote: string | null; effectiveFrom: string | null; effectiveTo: string | null
  publishedAt: string | null; publishedByUserId: string | null; retiredAt: string | null; retiredByUserId: string | null
  version: number; createdAt: string; updatedAt: string
  itemCount?: number; factorCount?: number
}
export type ValidationIssue = { code: string; path: string; message: string }
export type ValidationResult = { valid: boolean; errors: ValidationIssue[]; warnings: ValidationIssue[]; summary: { errorCount: number; warningCount: number } }
export type PublishInput = { version: number; effectiveFrom: string; publicationNote?: string | null }
export type BaseDefinition = { id: string; code: string; name: string; version: number; versionCount: number; createdAt: string; updatedAt: string; isDefault?: boolean; description?: string | null }

export type Catalog = BaseDefinition & { description: string | null; supportsHierarchy: boolean }
export type CatalogCreate = { code: string; name: string; description?: string | null; supportsHierarchy: boolean }
export type CatalogPatch = { version: number; name?: string; description?: string | null; supportsHierarchy?: boolean }
export type CatalogEntryType = 'NODE' | 'LEAF'
export type CatalogEntry = {
  id: string; versionId: string; code: string; name: string; description: string | null; parentId: string | null
  entryType: CatalogEntryType; sortOrder: number; isActive: boolean; sourceReference: string | null
  attributes: Record<string, unknown>; version: number; children?: CatalogEntry[]
}
export type CatalogEntryCreate = { code: string; name: string; description?: string | null; parentId?: string | null; entryType: CatalogEntryType; sortOrder: number; isActive: boolean; sourceReference?: string | null }
export type CatalogEntryPatch = { version: number; name?: string; description?: string | null; entryType?: CatalogEntryType; isActive?: boolean; sourceReference?: string | null }
export type CatalogPreview = { version: DefinitionVersion; validation: ValidationResult; items: CatalogEntry[] }

export type BpmTemplate = BaseDefinition & { description: string | null; isDefault: boolean }
export type BpmTemplateCreate = { code: string; name: string; description?: string | null }
export type BpmItemKind = 'SECTION' | 'SUBSECTION' | 'GROUP' | 'CRITERION'
export type Criticality = 'CRITICA' | 'MAYOR' | 'MENOR'
export type BpmGuidance = { id: string; versionId: string; criterionItemId: string; text: string; sortOrder: number; criticality: Criticality | null; sourceReference: string | null; sourceRowNumber: number | null; version: number }
export type BpmItem = {
  id: string; versionId: string; parentId: string | null; itemKind: BpmItemKind; sourceCode: string | null; displayCode: string | null
  title: string; description: string | null; sortOrder: number; isEvaluable: boolean; defaultCriticality: Criticality | null
  sourceReference: string | null; sourceRowNumber: number | null; sourceParentCodeRaw: string | null; version: number
  guidanceItems: BpmGuidance[]; children?: BpmItem[]
}
export type BpmItemCreate = { parentId: string | null; itemKind: BpmItemKind; displayCode?: string | null; title: string; description?: string | null; sortOrder: number; isEvaluable: boolean; defaultCriticality?: Criticality | null; sourceReference?: string | null }
export type BpmItemPatch = { version: number; displayCode?: string | null; title?: string; description?: string | null; defaultCriticality?: Criticality | null; sourceReference?: string | null }
export type BpmGuidanceCreate = { text: string; sortOrder: number; criticality?: Criticality | null; sourceReference?: string | null }
export type BpmGuidancePatch = Partial<BpmGuidanceCreate> & { version: number }
export type BpmPreview = { version: DefinitionVersion; validation: ValidationResult; items: BpmItem[] }

export type RiskRuleSet = BaseDefinition & { isDefault: boolean }
export type RiskRuleSetCreate = { code: string; name: string }
export type RiskFactorCode = 'VOLUME' | 'HACCP' | 'BPM' | 'INABIE' | 'REJECTIONS' | 'SAMPLING'
export type RiskOptionScore = 1 | 1.67 | 2.33 | 3
export type RiskOption = { id: string; factorId: string; code: string; label: string; score: number; sortOrder: number; version: number }
export type RiskFactor = { id: string; versionId: string; code: RiskFactorCode; name: string; weight: number; sortOrder: number; version: number; options: RiskOption[] }
export type MicrobiologicalRisk = 'LOW' | 'MEDIUM' | 'HIGH'
export type FoodSubcategory = { id: string; categoryId: string; name: string; microbiologicalRisk: MicrobiologicalRisk | null; riskScore: 1 | 2 | 3 | null; sortOrder: number; sourceFile: string | null; sourceSheet: string | null; sourceRowNumber: number | null; version: number }
export type FoodCategory = { id: string; versionId: string; code: string; name: string; sortOrder: number; sourceFile: string | null; sourceSheet: string | null; sourceRowNumber: number | null; version: number; subcategories: FoodSubcategory[] }
export type Frequency = 'ANNUAL' | 'SEMIANNUAL' | 'QUARTERLY'
export type FrequencyRange = { id: string; versionId: string; lowerBound: number; upperBound: number | null; lowerInclusive: boolean; upperInclusive: boolean; frequency: Frequency; label: string; sortOrder: number; version: number }
export type RiskPreview = { version: DefinitionVersion; validation: ValidationResult; factors: RiskFactor[]; foodCategories: FoodCategory[]; frequencyRanges: FrequencyRange[] }
export type RiskFactorInput = { code: RiskFactorCode; name: string; weight: number; sortOrder: number }
export type RiskOptionInput = { code: string; label: string; score: RiskOptionScore; sortOrder: number }
export type FoodCategoryInput = { code: string; name: string; sortOrder: number; sourceFile?: string | null; sourceSheet?: string | null; sourceRowNumber?: number | null }
export type FoodSubcategoryInput = { name: string; microbiologicalRisk: MicrobiologicalRisk | null; riskScore: 1 | 2 | 3 | null; sortOrder: number; sourceFile?: string | null; sourceSheet?: string | null; sourceRowNumber?: number | null }
export type FrequencyRangeInput = { lowerBound: number; upperBound: number | null; lowerInclusive: boolean; upperInclusive: boolean; frequency: Frequency; label: string; sortOrder: number }
type WithVersion<T> = Partial<T> & { version: number }

const path = (id: string) => encodeURIComponent(id)
const get = async <T,>(url: string) => (await core.request<T>(url, { cache: 'no-store' })).data
const post = async <T,>(url: string, body?: unknown) => (await core.request<T>(url, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })).data
const patch = async <T,>(url: string, body: unknown) => (await core.request<T>(url, { method: 'PATCH', body: JSON.stringify(body) })).data
// Core acepta la versión esperada del DELETE en la query; se evita un cuerpo en DELETE.
const remove = async (url: string, version: number) => (await core.request<{ deleted: true; id: string }>(`${url}?version=${encodeURIComponent(String(version))}`, { method: 'DELETE' })).data

export type VersionedApi<R, P> = {
  base: string
  list: () => Promise<R[]>
  get: (id: string) => Promise<R>
  versions: (id: string) => Promise<DefinitionVersion[]>
  createVersion: (id: string, cloneFromVersionId?: string) => Promise<DefinitionVersion>
  preview: (id: string, versionId: string) => Promise<P>
  validate: (id: string, versionId: string) => Promise<ValidationResult>
  publish: (id: string, versionId: string, body: PublishInput) => Promise<DefinitionVersion>
  retire: (id: string, versionId: string, version: number) => Promise<DefinitionVersion>
  setDefault?: (id: string, version: number) => Promise<R>
}

function versioned<R, P>(base: string): VersionedApi<R, P> {
  const resource = (id: string) => `${base}/${path(id)}`
  const version = (id: string, versionId: string) => `${resource(id)}/versions/${path(versionId)}`
  return {
    base,
    list: () => get<R[]>(base),
    get: (id) => get<R>(resource(id)),
    versions: (id) => get<DefinitionVersion[]>(`${resource(id)}/versions`),
    createVersion: (id, cloneFromVersionId) => post<DefinitionVersion>(`${resource(id)}/versions`, cloneFromVersionId ? { cloneFromVersionId } : {}),
    preview: (id, versionId) => get<P>(`${version(id, versionId)}/preview`),
    validate: (id, versionId) => get<ValidationResult>(`${version(id, versionId)}/validate`),
    publish: (id, versionId, body) => post<DefinitionVersion>(`${version(id, versionId)}/publish`, body),
    retire: (id, versionId, expected) => post<DefinitionVersion>(`${version(id, versionId)}/retire`, { version: expected }),
  }
}

const catalogBase = '/v1/admin/catalogs'
const catalogItems = (catalogId: string, versionId: string) => `${catalogBase}/${path(catalogId)}/versions/${path(versionId)}/items`
export const catalogsApi = {
  ...versioned<Catalog, CatalogPreview>(catalogBase),
  create: (body: CatalogCreate) => post<Catalog>(catalogBase, body),
  update: (id: string, body: CatalogPatch) => patch<Catalog>(`${catalogBase}/${path(id)}`, body),
  createEntry: (catalogId: string, versionId: string, body: CatalogEntryCreate) => post<CatalogEntry>(catalogItems(catalogId, versionId), body),
  updateEntry: (catalogId: string, versionId: string, itemId: string, body: CatalogEntryPatch) => patch<CatalogEntry>(`${catalogItems(catalogId, versionId)}/${path(itemId)}`, body),
  moveEntry: (catalogId: string, versionId: string, itemId: string, body: { version: number; parentId: string | null; sortOrder: number }) => post<CatalogEntry>(`${catalogItems(catalogId, versionId)}/${path(itemId)}/move`, body),
  deleteEntry: (catalogId: string, versionId: string, itemId: string, version: number) => remove(`${catalogItems(catalogId, versionId)}/${path(itemId)}`, version),
}

const bpmBase = '/v1/admin/bpm-templates'
const bpmItems = (templateId: string, versionId: string) => `${bpmBase}/${path(templateId)}/versions/${path(versionId)}/items`
export const bpmTemplatesApi = {
  ...versioned<BpmTemplate, BpmPreview>(bpmBase),
  create: (body: BpmTemplateCreate) => post<BpmTemplate>(bpmBase, body),
  setDefault: (id: string, version: number) => post<BpmTemplate>(`${bpmBase}/${path(id)}/set-default`, { version }),
  createItem: (templateId: string, versionId: string, body: BpmItemCreate) => post<BpmItem>(bpmItems(templateId, versionId), body),
  updateItem: (templateId: string, versionId: string, itemId: string, body: BpmItemPatch) => patch<BpmItem>(`${bpmItems(templateId, versionId)}/${path(itemId)}`, body),
  moveItem: (templateId: string, versionId: string, itemId: string, body: { version: number; parentId: string | null; sortOrder: number }) => post<BpmItem>(`${bpmItems(templateId, versionId)}/${path(itemId)}/move`, body),
  deleteItem: (templateId: string, versionId: string, itemId: string, version: number) => remove(`${bpmItems(templateId, versionId)}/${path(itemId)}`, version),
  createGuidance: (templateId: string, versionId: string, itemId: string, body: BpmGuidanceCreate) => post<BpmGuidance>(`${bpmItems(templateId, versionId)}/${path(itemId)}/guidance`, body),
  updateGuidance: (templateId: string, versionId: string, itemId: string, guidanceId: string, body: BpmGuidancePatch) => patch<BpmGuidance>(`${bpmItems(templateId, versionId)}/${path(itemId)}/guidance/${path(guidanceId)}`, body),
  deleteGuidance: (templateId: string, versionId: string, itemId: string, guidanceId: string, version: number) => remove(`${bpmItems(templateId, versionId)}/${path(itemId)}/guidance/${path(guidanceId)}`, version),
}

const riskBase = '/v1/admin/risk-rule-sets'
const riskVersion = (setId: string, versionId: string) => `${riskBase}/${path(setId)}/versions/${path(versionId)}`
export const riskRulesApi = {
  ...versioned<RiskRuleSet, RiskPreview>(riskBase),
  create: (body: RiskRuleSetCreate) => post<RiskRuleSet>(riskBase, body),
  setDefault: (id: string, version: number) => post<RiskRuleSet>(`${riskBase}/${path(id)}/set-default`, { version }),
  createFactor: (setId: string, versionId: string, body: RiskFactorInput) => post<RiskFactor>(`${riskVersion(setId, versionId)}/factors`, body),
  updateFactor: (setId: string, versionId: string, factorId: string, body: WithVersion<RiskFactorInput>) => patch<RiskFactor>(`${riskVersion(setId, versionId)}/factors/${path(factorId)}`, body),
  deleteFactor: (setId: string, versionId: string, factorId: string, version: number) => remove(`${riskVersion(setId, versionId)}/factors/${path(factorId)}`, version),
  createOption: (setId: string, versionId: string, factorId: string, body: RiskOptionInput) => post<RiskOption>(`${riskVersion(setId, versionId)}/factors/${path(factorId)}/options`, body),
  updateOption: (setId: string, versionId: string, factorId: string, optionId: string, body: WithVersion<RiskOptionInput>) => patch<RiskOption>(`${riskVersion(setId, versionId)}/factors/${path(factorId)}/options/${path(optionId)}`, body),
  deleteOption: (setId: string, versionId: string, factorId: string, optionId: string, version: number) => remove(`${riskVersion(setId, versionId)}/factors/${path(factorId)}/options/${path(optionId)}`, version),
  createCategory: (setId: string, versionId: string, body: FoodCategoryInput) => post<FoodCategory>(`${riskVersion(setId, versionId)}/food-categories`, body),
  updateCategory: (setId: string, versionId: string, categoryId: string, body: WithVersion<FoodCategoryInput>) => patch<FoodCategory>(`${riskVersion(setId, versionId)}/food-categories/${path(categoryId)}`, body),
  deleteCategory: (setId: string, versionId: string, categoryId: string, version: number) => remove(`${riskVersion(setId, versionId)}/food-categories/${path(categoryId)}`, version),
  createSubcategory: (setId: string, versionId: string, categoryId: string, body: FoodSubcategoryInput) => post<FoodSubcategory>(`${riskVersion(setId, versionId)}/food-categories/${path(categoryId)}/subcategories`, body),
  updateSubcategory: (setId: string, versionId: string, categoryId: string, subcategoryId: string, body: WithVersion<FoodSubcategoryInput>) => patch<FoodSubcategory>(`${riskVersion(setId, versionId)}/food-categories/${path(categoryId)}/subcategories/${path(subcategoryId)}`, body),
  deleteSubcategory: (setId: string, versionId: string, categoryId: string, subcategoryId: string, version: number) => remove(`${riskVersion(setId, versionId)}/food-categories/${path(categoryId)}/subcategories/${path(subcategoryId)}`, version),
  createRange: (setId: string, versionId: string, body: FrequencyRangeInput) => post<FrequencyRange>(`${riskVersion(setId, versionId)}/frequency-ranges`, body),
  updateRange: (setId: string, versionId: string, rangeId: string, body: WithVersion<FrequencyRangeInput>) => patch<FrequencyRange>(`${riskVersion(setId, versionId)}/frequency-ranges/${path(rangeId)}`, body),
  deleteRange: (setId: string, versionId: string, rangeId: string, version: number) => remove(`${riskVersion(setId, versionId)}/frequency-ranges/${path(rangeId)}`, version),
}
