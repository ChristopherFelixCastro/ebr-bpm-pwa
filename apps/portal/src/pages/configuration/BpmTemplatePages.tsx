import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChecklistIcon from '@mui/icons-material/Checklist'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { bpmTemplatesApi, type BpmGuidance, type BpmItem, type BpmItemKind, type BpmPreview, type BpmTemplate, type Criticality } from '../../api/configuration'
import { criticalityLabels, itemKindLabels } from './labels'
import {
  nextOrder, ResourceDetailPage, ResourceListPage, textOrNull, TreeView, useVersionEditor, VersionPage,
  type AreaConfig, type FieldSpec, type VersionContext,
} from './shared'
import { buildTree, flattenTree } from '../../utils/tree'

export const bpmTemplateArea: AreaConfig<BpmTemplate, BpmPreview> = {
  title: 'Plantillas BPM',
  singular: 'plantilla BPM',
  path: '/configuracion/plantillas-bpm',
  icon: <ChecklistIcon color="primary" />,
  description: 'Plantillas versionadas de Buenas Prácticas de Manufactura: secciones, subsecciones, grupos, criterios e instrucciones.',
  api: bpmTemplatesApi as AreaConfig<BpmTemplate, BpmPreview>['api'],
  createFields: { description: true, hierarchy: false },
  countLabel: (version) => `${version.itemCount ?? 0} elementos`,
  defaultScope: 'la plantilla BPM',
}

export const BpmTemplateListPage = () => <ResourceListPage area={bpmTemplateArea} />
export const BpmTemplateDetailPage = () => <ResourceDetailPage area={bpmTemplateArea} />

const criticalityOptions = [{ value: '', label: 'Sin criticidad' }, ...(Object.keys(criticalityLabels) as Criticality[]).map((value) => ({ value, label: criticalityLabels[value] }))]
const childKinds: BpmItemKind[] = ['SUBSECTION', 'GROUP', 'CRITERION']
const kindColors: Record<BpmItemKind, 'primary' | 'secondary' | 'default' | 'info'> = { SECTION: 'primary', SUBSECTION: 'info', GROUP: 'secondary', CRITERION: 'default' }
const criticality = (value: string | boolean) => (String(value) || null) as Criticality | null

function GuidanceList({ item, editable, onEdit, onRemove }: { item: BpmItem; editable: boolean; onEdit: (guidance: BpmGuidance) => void; onRemove: (guidance: BpmGuidance) => void }) {
  if (!item.guidanceItems.length) return null
  return <Box sx={{ ml: 2, mt: 0.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E2E8F0' }} aria-label={`Instrucciones de ${item.title}`}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><InfoOutlinedIcon fontSize="inherit" />Instrucciones para el evaluador (orientan la evaluación; no son preguntas)</Typography>
    <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
      {item.guidanceItems.map((guidance) => <Box component="li" key={guidance.id}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2">{guidance.text}</Typography>
          {guidance.criticality && <Chip size="small" variant="outlined" color={guidance.criticality === 'CRITICA' ? 'error' : 'default'} label={`Criticidad ${criticalityLabels[guidance.criticality].toLowerCase()}`} />}
          {editable && <Box sx={{ ml: 'auto' }}>
            <Button size="small" onClick={() => onEdit(guidance)}>Editar instrucción</Button>
            <Button size="small" color="error" onClick={() => onRemove(guidance)}>Eliminar instrucción</Button>
          </Box>}
        </Box>
      </Box>)}
    </Stack>
  </Box>
}

function BpmItems({ context }: { context: VersionContext<BpmPreview, BpmTemplate> }) {
  const { preview, editable, resourceId, versionId, run } = context
  const editor = useVersionEditor(context)
  const flat = flattenTree(preview.items)
  const tree = buildTree(preview.items)
  const siblings = (parentId: string | null) => flat.filter((row) => row.parentId === parentId)
  const itemFields = (kind: BpmItemKind | null): FieldSpec[] => [
    { key: 'displayCode', label: 'Código visible' },
    { key: 'title', label: kind === 'CRITERION' ? 'Enunciado del criterio' : 'Título', kind: 'multiline', required: true },
    { key: 'description', label: 'Descripción', kind: 'multiline' },
    ...(kind === null || kind === 'CRITERION' ? [{ key: 'defaultCriticality', label: 'Criticidad del criterio (opcional)', kind: 'select' as const, options: criticalityOptions, helper: kind === null ? 'Solo aplica a criterios.' : undefined }] : []),
    { key: 'sourceReference', label: 'Referencia de origen' },
  ]
  const create = (parent: BpmItem | null) => editor.open({
    key: `create:${parent?.id ?? 'root'}`,
    title: parent ? `Agregar dentro de ${parent.title}` : 'Agregar sección',
    fields: [
      { key: 'itemKind', label: 'Tipo', kind: 'select', options: (parent ? childKinds : ['SECTION' as const]).map((value) => ({ value, label: itemKindLabels[value] })) },
      ...itemFields(parent ? null : 'SECTION'),
      { key: 'sortOrder', label: 'Orden dentro del padre', kind: 'number', required: true },
    ],
    values: { itemKind: parent ? 'CRITERION' : 'SECTION', displayCode: '', title: '', description: '', defaultCriticality: '', sourceReference: '', sortOrder: String(nextOrder(siblings(parent?.id ?? null))) },
    submitLabel: 'Agregar',
    submit: (values) => {
      const itemKind = values.itemKind as BpmItemKind
      // isEvaluable acompaña al tipo según el contrato de Core; la criticidad solo se envía en criterios.
      return run(() => bpmTemplatesApi.createItem(resourceId, versionId, {
        parentId: parent?.id ?? null, itemKind, displayCode: textOrNull(String(values.displayCode)), title: String(values.title).trim(),
        description: textOrNull(String(values.description)), sortOrder: Number(values.sortOrder), isEvaluable: itemKind === 'CRITERION',
        defaultCriticality: itemKind === 'CRITERION' ? criticality(values.defaultCriticality) : null, sourceReference: textOrNull(String(values.sourceReference)),
      }), `${itemKindLabels[itemKind]} agregado.`)
    },
  })
  const edit = (item: BpmItem) => editor.open({
    key: `edit:${item.id}:${item.version}`,
    title: `Editar ${itemKindLabels[item.itemKind].toLowerCase()}`,
    fields: itemFields(item.itemKind),
    values: { displayCode: item.displayCode ?? '', title: item.title, description: item.description ?? '', defaultCriticality: item.defaultCriticality ?? '', sourceReference: item.sourceReference ?? '' },
    submit: (values) => run(() => bpmTemplatesApi.updateItem(resourceId, versionId, item.id, {
      version: item.version, displayCode: textOrNull(String(values.displayCode)), title: String(values.title).trim(), description: textOrNull(String(values.description)),
      ...(item.itemKind === 'CRITERION' ? { defaultCriticality: criticality(values.defaultCriticality) } : {}), sourceReference: textOrNull(String(values.sourceReference)),
    }), 'Elemento actualizado.'),
  })
  const move = (item: BpmItem) => editor.open({
    key: `move:${item.id}:${item.version}`,
    title: `Mover ${itemKindLabels[item.itemKind].toLowerCase()}`,
    fields: [
      { key: 'parentId', label: 'Padre', kind: 'select', options: [{ value: '', label: 'Raíz (secciones)' }, ...flat.filter((row) => row.id !== item.id && row.itemKind !== 'CRITERION').map((row) => ({ value: row.id, label: `${itemKindLabels[row.itemKind]} ${row.displayCode ?? ''} ${row.title}`.replace(/\s+/g, ' ') }))] },
      { key: 'sortOrder', label: 'Orden dentro del padre', kind: 'number', required: true },
    ],
    values: { parentId: item.parentId ?? '', sortOrder: String(item.sortOrder) },
    submitLabel: 'Mover',
    submit: (values) => run(() => bpmTemplatesApi.moveItem(resourceId, versionId, item.id, { version: item.version, parentId: String(values.parentId) || null, sortOrder: Number(values.sortOrder) }), 'Elemento movido.'),
  })
  const guidanceFields: FieldSpec[] = [
    { key: 'text', label: 'Instrucción', kind: 'multiline', required: true, helper: 'Orienta al evaluador; no es una pregunta evaluable.' },
    { key: 'criticality', label: 'Criticidad (opcional)', kind: 'select', options: criticalityOptions },
    { key: 'sortOrder', label: 'Orden', kind: 'number', required: true },
    { key: 'sourceReference', label: 'Referencia de origen' },
  ]
  const addGuidance = (item: BpmItem) => editor.open({
    key: `guidance:${item.id}`,
    title: `Agregar instrucción a ${item.displayCode ?? item.title}`,
    fields: guidanceFields,
    values: { text: '', criticality: '', sortOrder: String(item.guidanceItems.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0)), sourceReference: '' },
    submitLabel: 'Agregar',
    submit: (values) => run(() => bpmTemplatesApi.createGuidance(resourceId, versionId, item.id, { text: String(values.text).trim(), criticality: criticality(values.criticality), sortOrder: Number(values.sortOrder), sourceReference: textOrNull(String(values.sourceReference)) }), 'Instrucción agregada.'),
  })
  const editGuidance = (item: BpmItem, guidance: BpmGuidance) => editor.open({
    key: `guidance:${guidance.id}:${guidance.version}`,
    title: 'Editar instrucción',
    fields: guidanceFields,
    values: { text: guidance.text, criticality: guidance.criticality ?? '', sortOrder: String(guidance.sortOrder), sourceReference: guidance.sourceReference ?? '' },
    submit: (values) => run(() => bpmTemplatesApi.updateGuidance(resourceId, versionId, item.id, guidance.id, { version: guidance.version, text: String(values.text).trim(), criticality: criticality(values.criticality), sortOrder: Number(values.sortOrder), sourceReference: textOrNull(String(values.sourceReference)) }), 'Instrucción actualizada.'),
  })

  return <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Estructura de la plantilla</Typography>
      {editable && <Button startIcon={<AddIcon />} variant="outlined" onClick={() => create(null)}>Agregar sección</Button>}
    </Box>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sección → Subsección → Grupo → Criterio, en el orden de Core (por padre y luego orden). Solo los criterios se evalúan.</Typography>
    {tree.length === 0 ? <Alert severity="info">La versión no contiene elementos.</Alert> : <TreeView nodes={tree} label="Estructura BPM" render={({ item }) => <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip size="small" color={kindColors[item.itemKind]} variant={item.itemKind === 'CRITERION' ? 'outlined' : 'filled'} label={itemKindLabels[item.itemKind]} />
        {item.displayCode && <Typography component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{item.displayCode}</Typography>}
        <Typography component="span" sx={{ fontWeight: item.itemKind === 'CRITERION' ? 400 : 700 }}>{item.title}</Typography>
        {item.itemKind === 'CRITERION' && item.defaultCriticality && <Chip size="small" color={item.defaultCriticality === 'CRITICA' ? 'error' : 'warning'} variant="outlined" label={`Criticidad ${criticalityLabels[item.defaultCriticality].toLowerCase()}`} />}
        {editable && <Box sx={{ ml: 'auto' }}>
          <Button size="small" onClick={() => edit(item)}>Editar</Button>
          {item.itemKind !== 'CRITERION' && <Button size="small" onClick={() => create(item)}>Agregar hijo</Button>}
          {item.itemKind === 'CRITERION' && <Button size="small" onClick={() => addGuidance(item)}>Agregar instrucción</Button>}
          <Button size="small" onClick={() => move(item)}>Mover</Button>
          <Button size="small" color="error" onClick={() => editor.remove({ title: 'Eliminar elemento', message: `Se eliminará "${item.title}" del borrador. Core decide si puede eliminarse.`, success: 'Elemento eliminado.', action: () => bpmTemplatesApi.deleteItem(resourceId, versionId, item.id, item.version) })}>Eliminar</Button>
        </Box>}
      </Box>
      {item.description && <Typography variant="body2" color="text.secondary">{item.description}</Typography>}
      {item.itemKind === 'CRITERION' && <GuidanceList item={item} editable={editable} onEdit={(guidance) => editGuidance(item, guidance)}
        onRemove={(guidance) => editor.remove({ title: 'Eliminar instrucción', message: 'Se eliminará la instrucción del criterio en este borrador.', success: 'Instrucción eliminada.', action: () => bpmTemplatesApi.deleteGuidance(resourceId, versionId, item.id, guidance.id, guidance.version) })} />}
    </Box>} />}
    {editor.dialogs}
  </CardContent></Card>
}

const describeItems = (preview: BpmPreview) => {
  const names = new Map(flattenTree(preview.items).map((item) => [item.id, `${itemKindLabels[item.itemKind]} ${item.displayCode ?? item.title}`]))
  return (target: string) => names.get(target.split('.')[1] ?? '') ?? null
}

export const BpmTemplateVersionPage = () => <VersionPage area={bpmTemplateArea} describe={describeItems}>{(context) => <BpmItems context={context} />}</VersionPage>
