import { Alert, Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ShieldIcon from '@mui/icons-material/Shield'
import {
  riskRulesApi, type FoodCategory, type FoodSubcategory, type Frequency, type FrequencyRange, type MicrobiologicalRisk, type RiskFactor,
  type RiskFactorCode, type RiskOption, type RiskOptionScore, type RiskPreview, type RiskRuleSet,
} from '../../api/configuration'
import { factorCodes, factorLabels, frequencyLabels, microbiologicalRiskLabels, optionScores } from './labels'
import {
  nextOrder, numberOrNull, ResourceDetailPage, ResourceListPage, textOrNull, useVersionEditor, VersionPage,
  type AreaConfig, type FieldSpec, type FormValues, type VersionContext,
} from './shared'

export const riskRuleArea: AreaConfig<RiskRuleSet, RiskPreview> = {
  title: 'Reglas de riesgo',
  singular: 'conjunto de reglas',
  path: '/configuracion/reglas-riesgo',
  icon: <ShieldIcon color="primary" />,
  description: 'Reglas versionadas del modelo EBR: seis factores, opciones, productos alimenticios y rangos de frecuencia.',
  api: riskRulesApi as AreaConfig<RiskRuleSet, RiskPreview>['api'],
  createFields: { description: false, hierarchy: false },
  countLabel: (version) => `${version.factorCount ?? 0} factores`,
  defaultScope: 'el conjunto de reglas de riesgo',
}

export const RiskRuleListPage = () => <ResourceListPage area={riskRuleArea} />
export const RiskRuleDetailPage = () => <ResourceDetailPage area={riskRuleArea} />

const factorOptions = factorCodes.map((value) => ({ value, label: `${factorLabels[value]} (${value})` }))
const scoreOptions = optionScores.map((value) => ({ value: String(value), label: String(value) }))
const riskOptions = [{ value: '', label: 'No aplica' }, ...(Object.keys(microbiologicalRiskLabels) as MicrobiologicalRisk[]).map((value) => ({ value, label: microbiologicalRiskLabels[value] }))]
const riskScoreOptions = [{ value: '', label: 'No aplica' }, ...['1', '2', '3'].map((value) => ({ value, label: value }))]
const frequencyOptions = (Object.keys(frequencyLabels) as Frequency[]).map((value) => ({ value, label: frequencyLabels[value] }))
const number = (value: number) => new Intl.NumberFormat('es-DO', { maximumFractionDigits: 4 }).format(value)
export const rangeText = (range: FrequencyRange) => `${range.lowerInclusive ? 'Desde' : 'Mayor que'} ${number(range.lowerBound)} ${range.upperBound === null ? 'sin límite superior' : `${range.upperInclusive ? 'hasta' : 'y menor que'} ${number(range.upperBound)}`}`
const text = (values: FormValues, key: string) => String(values[key] ?? '').trim()

const factorFields: FieldSpec[] = [
  { key: 'code', label: 'Factor oficial', kind: 'select', options: factorOptions },
  { key: 'name', label: 'Nombre', required: true },
  { key: 'weight', label: 'Peso', kind: 'number', required: true, helper: 'Core valida que los seis pesos sumen 1.' },
  { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
]
const optionFields: FieldSpec[] = [
  { key: 'code', label: 'Código', required: true },
  { key: 'label', label: 'Descripción de la opción', required: true },
  { key: 'score', label: 'Puntaje', kind: 'select', options: scoreOptions },
  { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
]
const categoryFields: FieldSpec[] = [
  { key: 'code', label: 'Código', required: true },
  { key: 'name', label: 'Categoría', required: true },
  { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
  { key: 'sourceFile', label: 'Archivo de origen' },
  { key: 'sourceSheet', label: 'Hoja de origen' },
  { key: 'sourceRowNumber', label: 'Fila de origen', kind: 'number' },
]
const subcategoryFields: FieldSpec[] = [
  { key: 'name', label: 'Subcategoría', kind: 'multiline', required: true },
  { key: 'microbiologicalRisk', label: 'Riesgo microbiológico', kind: 'select', options: riskOptions, helper: 'Core exige indicar riesgo y puntaje juntos, o ninguno.' },
  { key: 'riskScore', label: 'Puntaje de riesgo', kind: 'select', options: riskScoreOptions },
  { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
  { key: 'sourceFile', label: 'Archivo de origen' },
  { key: 'sourceSheet', label: 'Hoja de origen' },
  { key: 'sourceRowNumber', label: 'Fila de origen', kind: 'number' },
]
const rangeFields: FieldSpec[] = [
  { key: 'lowerBound', label: 'Límite inferior', kind: 'number', required: true },
  { key: 'lowerInclusive', label: 'Incluye el límite inferior', kind: 'switch' },
  { key: 'upperBound', label: 'Límite superior', kind: 'number', helper: 'Vacío = sin límite superior.' },
  { key: 'upperInclusive', label: 'Incluye el límite superior', kind: 'switch' },
  { key: 'frequency', label: 'Frecuencia de inspección', kind: 'select', options: frequencyOptions },
  { key: 'label', label: 'Etiqueta', required: true },
  { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
]
const factorBody = (values: FormValues) => ({ code: values.code as RiskFactorCode, name: text(values, 'name'), weight: Number(values.weight), sortOrder: Number(values.sortOrder) })
const optionBody = (values: FormValues) => ({ code: text(values, 'code'), label: text(values, 'label'), score: Number(values.score) as RiskOptionScore, sortOrder: Number(values.sortOrder) })
const categoryBody = (values: FormValues) => ({ code: text(values, 'code'), name: text(values, 'name'), sortOrder: Number(values.sortOrder), sourceFile: textOrNull(text(values, 'sourceFile')), sourceSheet: textOrNull(text(values, 'sourceSheet')), sourceRowNumber: numberOrNull(text(values, 'sourceRowNumber')) })
const subcategoryBody = (values: FormValues) => ({ name: text(values, 'name'), microbiologicalRisk: (text(values, 'microbiologicalRisk') || null) as MicrobiologicalRisk | null, riskScore: numberOrNull(text(values, 'riskScore')) as 1 | 2 | 3 | null, sortOrder: Number(values.sortOrder), sourceFile: textOrNull(text(values, 'sourceFile')), sourceSheet: textOrNull(text(values, 'sourceSheet')), sourceRowNumber: numberOrNull(text(values, 'sourceRowNumber')) })
const rangeBody = (values: FormValues) => ({ lowerBound: Number(values.lowerBound), upperBound: numberOrNull(text(values, 'upperBound')), lowerInclusive: Boolean(values.lowerInclusive), upperInclusive: Boolean(values.upperInclusive), frequency: values.frequency as Frequency, label: text(values, 'label'), sortOrder: Number(values.sortOrder) })
const source = (row: { sourceFile: string | null; sourceSheet: string | null; sourceRowNumber: number | null }) => [row.sourceFile, row.sourceSheet, row.sourceRowNumber ? `fila ${row.sourceRowNumber}` : null].filter(Boolean).join(' · ') || '—'

function RiskStructure({ context }: { context: VersionContext<RiskPreview, RiskRuleSet> }) {
  const { preview, editable, resourceId: setId, versionId, run } = context
  const editor = useVersionEditor(context)
  const remove = (title: string, name: string, action: () => Promise<unknown>) => editor.remove({ title, message: `Se eliminará ${name} del borrador.`, success: 'Elemento eliminado.', action })
  const actions = (label: string, onEdit: () => void, onRemove: () => void) => editable
    ? <Box sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={onEdit} aria-label={`Editar ${label}`}>Editar</Button><Button size="small" color="error" onClick={onRemove} aria-label={`Eliminar ${label}`}>Eliminar</Button></Box>
    : null

  const factorDialog = (factor: RiskFactor | null) => editor.open({
    key: `factor:${factor?.id ?? 'new'}:${factor?.version ?? 0}`,
    title: factor ? `Editar factor ${factorLabels[factor.code] ?? factor.name}` : 'Agregar factor',
    fields: factorFields,
    values: factor ? { code: factor.code, name: factor.name, weight: String(factor.weight), sortOrder: String(factor.sortOrder) } : { code: factorCodes.find((code) => !preview.factors.some((row) => row.code === code)) ?? 'VOLUME', name: '', weight: '', sortOrder: String(nextOrder(preview.factors)) },
    submit: (values) => run(() => factor ? riskRulesApi.updateFactor(setId, versionId, factor.id, { version: factor.version, ...factorBody(values) }) : riskRulesApi.createFactor(setId, versionId, factorBody(values)), factor ? 'Factor actualizado.' : 'Factor agregado.'),
  })
  const optionDialog = (factor: RiskFactor, option: RiskOption | null) => editor.open({
    key: `option:${option?.id ?? factor.id}:${option?.version ?? 0}`,
    title: option ? `Editar opción de ${factor.name}` : `Agregar opción a ${factor.name}`,
    fields: optionFields,
    values: option ? { code: option.code, label: option.label, score: String(option.score), sortOrder: String(option.sortOrder) } : { code: '', label: '', score: '1', sortOrder: String(nextOrder(factor.options)) },
    submit: (values) => run(() => option ? riskRulesApi.updateOption(setId, versionId, factor.id, option.id, { version: option.version, ...optionBody(values) }) : riskRulesApi.createOption(setId, versionId, factor.id, optionBody(values)), option ? 'Opción actualizada.' : 'Opción agregada.'),
  })
  const categoryDialog = (category: FoodCategory | null) => editor.open({
    key: `category:${category?.id ?? 'new'}:${category?.version ?? 0}`,
    title: category ? `Editar categoría ${category.name}` : 'Agregar categoría de alimentos',
    fields: categoryFields,
    values: category ? { code: category.code, name: category.name, sortOrder: String(category.sortOrder), sourceFile: category.sourceFile ?? '', sourceSheet: category.sourceSheet ?? '', sourceRowNumber: category.sourceRowNumber ? String(category.sourceRowNumber) : '' } : { code: '', name: '', sortOrder: String(nextOrder(preview.foodCategories)), sourceFile: '', sourceSheet: '', sourceRowNumber: '' },
    submit: (values) => run(() => category ? riskRulesApi.updateCategory(setId, versionId, category.id, { version: category.version, ...categoryBody(values) }) : riskRulesApi.createCategory(setId, versionId, categoryBody(values)), category ? 'Categoría actualizada.' : 'Categoría agregada.'),
  })
  const subcategoryDialog = (category: FoodCategory, sub: FoodSubcategory | null) => editor.open({
    key: `subcategory:${sub?.id ?? category.id}:${sub?.version ?? 0}`,
    title: sub ? 'Editar subcategoría' : `Agregar subcategoría a ${category.name}`,
    fields: subcategoryFields,
    values: sub ? { name: sub.name, microbiologicalRisk: sub.microbiologicalRisk ?? '', riskScore: sub.riskScore ? String(sub.riskScore) : '', sortOrder: String(sub.sortOrder), sourceFile: sub.sourceFile ?? '', sourceSheet: sub.sourceSheet ?? '', sourceRowNumber: sub.sourceRowNumber ? String(sub.sourceRowNumber) : '' } : { name: '', microbiologicalRisk: '', riskScore: '', sortOrder: String(nextOrder(category.subcategories)), sourceFile: '', sourceSheet: '', sourceRowNumber: '' },
    submit: (values) => run(() => sub ? riskRulesApi.updateSubcategory(setId, versionId, category.id, sub.id, { version: sub.version, ...subcategoryBody(values) }) : riskRulesApi.createSubcategory(setId, versionId, category.id, subcategoryBody(values)), sub ? 'Subcategoría actualizada.' : 'Subcategoría agregada.'),
  })
  const rangeDialog = (range: FrequencyRange | null) => editor.open({
    key: `range:${range?.id ?? 'new'}:${range?.version ?? 0}`,
    title: range ? `Editar rango ${range.label}` : 'Agregar rango de frecuencia',
    fields: rangeFields,
    values: range ? { lowerBound: String(range.lowerBound), lowerInclusive: range.lowerInclusive, upperBound: range.upperBound === null ? '' : String(range.upperBound), upperInclusive: range.upperInclusive, frequency: range.frequency, label: range.label, sortOrder: String(range.sortOrder) } : { lowerBound: '', lowerInclusive: true, upperBound: '', upperInclusive: false, frequency: 'ANNUAL', label: '', sortOrder: String(nextOrder(preview.frequencyRanges)) },
    submit: (values) => run(() => range ? riskRulesApi.updateRange(setId, versionId, range.id, { version: range.version, ...rangeBody(values) }) : riskRulesApi.createRange(setId, versionId, rangeBody(values)), range ? 'Rango actualizado.' : 'Rango agregado.'),
  })

  const header = (title: string, subtitle: string, action?: () => void, actionLabel?: string) => <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
    <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography><Typography variant="body2" color="text.secondary">{subtitle}</Typography></Box>
    {editable && action && <Button startIcon={<AddIcon />} variant="outlined" onClick={action}>{actionLabel}</Button>}
  </Box>

  return <Stack spacing={3}>
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
      {header('Factores de riesgo', `${preview.factors.length} de 6 factores oficiales registrados. Core valida factores, pesos y la escala de cuatro opciones.`, () => factorDialog(null), 'Agregar factor')}
      {preview.factors.length === 0 ? <Alert severity="info">La versión no contiene factores.</Alert> : <Stack spacing={2}>
        {preview.factors.map((factor) => <Box key={factor.id} sx={{ border: '1px solid #E2E8F0', borderRadius: 1, p: 1.5 }} aria-label={`Factor ${factorLabels[factor.code] ?? factor.name}`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700 }}>{factorLabels[factor.code] ?? factor.code}</Typography>
            <Typography color="text.secondary">{factor.name}</Typography>
            <Chip size="small" label={`Peso ${number(factor.weight)}`} />
            <Box sx={{ ml: 'auto', display: 'flex' }}>
              {editable && <Button size="small" onClick={() => optionDialog(factor, null)}>Agregar opción</Button>}
              {actions(`factor ${factor.name}`, () => factorDialog(factor), () => remove('Eliminar factor', `el factor ${factor.name} y sus opciones`, () => riskRulesApi.deleteFactor(setId, versionId, factor.id, factor.version)))}
            </Box>
          </Box>
          {factor.options.length === 0 ? <Typography variant="body2" color="text.secondary">Sin opciones.</Typography> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Código</TableCell><TableCell>Opción</TableCell><TableCell>Puntaje</TableCell>{editable && <TableCell align="right">Acciones</TableCell>}</TableRow></TableHead><TableBody>
            {factor.options.map((option) => <TableRow key={option.id}><TableCell sx={{ fontFamily: 'monospace' }}>{option.code}</TableCell><TableCell>{option.label}</TableCell><TableCell>{number(option.score)}</TableCell>{editable && <TableCell align="right">{actions(`opción ${option.label}`, () => optionDialog(factor, option), () => remove('Eliminar opción', `la opción ${option.label}`, () => riskRulesApi.deleteOption(setId, versionId, factor.id, option.id, option.version)))}</TableCell>}</TableRow>)}
          </TableBody></Table></TableContainer>}
        </Box>)}
      </Stack>}
    </CardContent></Card>

    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
      {header('Productos alimenticios', 'Categorías y subcategorías de la matriz microbiológica.', () => categoryDialog(null), 'Agregar categoría')}
      {preview.foodCategories.length === 0 ? <Alert severity="info">La versión no contiene categorías de alimentos.</Alert> : <Stack spacing={2}>
        {preview.foodCategories.map((category) => <Box key={category.id} sx={{ border: '1px solid #E2E8F0', borderRadius: 1, p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{category.code}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{category.name}</Typography>
            <Box sx={{ ml: 'auto', display: 'flex' }}>
              {editable && <Button size="small" onClick={() => subcategoryDialog(category, null)}>Agregar subcategoría</Button>}
              {actions(`categoría ${category.name}`, () => categoryDialog(category), () => remove('Eliminar categoría', `la categoría ${category.name}`, () => riskRulesApi.deleteCategory(setId, versionId, category.id, category.version)))}
            </Box>
          </Box>
          {category.subcategories.length === 0 ? <Typography variant="body2" color="text.secondary">Sin subcategorías.</Typography> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Subcategoría</TableCell><TableCell>Riesgo microbiológico</TableCell><TableCell>Puntaje</TableCell><TableCell>Origen</TableCell>{editable && <TableCell align="right">Acciones</TableCell>}</TableRow></TableHead><TableBody>
            {category.subcategories.map((sub) => <TableRow key={sub.id}><TableCell>{sub.name}</TableCell><TableCell>{sub.microbiologicalRisk ? microbiologicalRiskLabels[sub.microbiologicalRisk] : 'No aplica'}</TableCell><TableCell>{sub.riskScore ?? '—'}</TableCell><TableCell>{source(sub)}</TableCell>{editable && <TableCell align="right">{actions(`subcategoría ${sub.name}`, () => subcategoryDialog(category, sub), () => remove('Eliminar subcategoría', `la subcategoría ${sub.name}`, () => riskRulesApi.deleteSubcategory(setId, versionId, category.id, sub.id, sub.version)))}</TableCell>}</TableRow>)}
          </TableBody></Table></TableContainer>}
        </Box>)}
      </Stack>}
    </CardContent></Card>

    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
      {header('Rangos de frecuencia', 'Asignan la frecuencia de inspección según el puntaje de riesgo calculado por Core.', () => rangeDialog(null), 'Agregar rango')}
      {preview.frequencyRanges.length === 0 ? <Alert severity="info">La versión no contiene rangos de frecuencia.</Alert> : <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Etiqueta</TableCell><TableCell>Rango de puntaje</TableCell><TableCell>Frecuencia</TableCell>{editable && <TableCell align="right">Acciones</TableCell>}</TableRow></TableHead><TableBody>
        {preview.frequencyRanges.map((range) => <TableRow key={range.id}><TableCell>{range.label}</TableCell><TableCell>{rangeText(range)}</TableCell><TableCell>{frequencyLabels[range.frequency] ?? range.frequency}</TableCell>{editable && <TableCell align="right">{actions(`rango ${range.label}`, () => rangeDialog(range), () => remove('Eliminar rango', `el rango ${range.label}`, () => riskRulesApi.deleteRange(setId, versionId, range.id, range.version)))}</TableCell>}</TableRow>)}
      </TableBody></Table></TableContainer>}
    </CardContent></Card>
    {editor.dialogs}
  </Stack>
}

const describeRisk = (preview: RiskPreview) => {
  const names = new Map<string, string>()
  preview.factors.forEach((factor) => names.set(factor.id, `Factor ${factorLabels[factor.code] ?? factor.name}`))
  preview.foodCategories.forEach((category) => category.subcategories.forEach((sub) => names.set(sub.id, `Subcategoría ${sub.name}`)))
  preview.frequencyRanges.forEach((range) => names.set(range.id, `Rango ${range.label}`))
  return (target: string) => names.get(target.split('.')[1] ?? '') ?? null
}

export const RiskRuleVersionPage = () => <VersionPage area={riskRuleArea} describe={describeRisk}>{(context) => <RiskStructure context={context} />}</VersionPage>
