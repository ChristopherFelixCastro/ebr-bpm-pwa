import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SaveIcon from '@mui/icons-material/Save'
import { catalogsApi, type Catalog, type CatalogEntry, type CatalogEntryType, type CatalogPreview } from '../../api/configuration'
import { isStaleVersion, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'
import { entryTypeLabels } from './labels'
import {
  canWriteConfiguration, nextOrder, ResourceDetailPage, ResourceListPage, StaleAlert, textOrNull, TreeView, useVersionEditor,
  VersionPage, type AreaConfig, type FieldSpec, type FormValues, type VersionContext,
} from './shared'
import { buildTree, flattenTree } from './tree'

export const catalogArea: AreaConfig<Catalog, CatalogPreview> = {
  title: 'Catálogos',
  singular: 'catálogo',
  path: '/configuracion/catalogos',
  icon: <ListAltIcon color="primary" />,
  description: 'Catálogos versionados de Core: consulta de versiones, vista previa, validación y publicación.',
  api: catalogsApi as AreaConfig<Catalog, CatalogPreview>['api'],
  createFields: { description: true, hierarchy: true },
  countLabel: (version) => `${version.itemCount ?? 0} elementos`,
}

export const CatalogListPage = () => <ResourceListPage area={catalogArea} />

function CatalogMetadataCard({ catalog, onSaved, onReload }: { catalog: Catalog; onSaved: (next: Catalog) => void; onReload: () => Promise<void> }) {
  const { user, runWithReauthentication } = useSession()
  const { showError, showSuccess } = useNotification()
  const canWrite = canWriteConfiguration(user)
  const [form, setForm] = useState({ name: catalog.name, description: catalog.description ?? '', supportsHierarchy: catalog.supportsHierarchy })
  const [stale, setStale] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const body = {
      version: catalog.version,
      ...(form.name.trim() !== catalog.name ? { name: form.name.trim() } : {}),
      ...((textOrNull(form.description) ?? null) !== (catalog.description ?? null) ? { description: textOrNull(form.description) } : {}),
      ...(form.supportsHierarchy !== catalog.supportsHierarchy ? { supportsHierarchy: form.supportsHierarchy } : {}),
    }
    if (Object.keys(body).length === 1) return showError('No hay cambios para guardar.')
    setSaving(true)
    try {
      const updated = await runWithReauthentication(() => catalogsApi.update(catalog.id, body))
      onSaved(updated)
      setStale(false)
      showSuccess('Catálogo actualizado.')
    } catch (error) {
      if (error instanceof ReauthenticationCancelledError) return
      if (isStaleVersion(error)) setStale(true)
      else showError(supportMessage(error, 'No fue posible actualizar el catálogo.'))
    } finally { setSaving(false) }
  }
  const reload = async () => {
    await onReload()
    setStale(false)
  }

  return <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Stack spacing={2}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>Datos del catálogo</Typography>
    {stale && <StaleAlert onReload={() => void reload()} subject="El catálogo" />}
    <TextField label="Nombre del catálogo" disabled={!canWrite} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
    <TextField label="Descripción" multiline minRows={2} disabled={!canWrite} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
    <FormControlLabel control={<Switch disabled={!canWrite} checked={form.supportsHierarchy} onChange={(event) => setForm({ ...form, supportsHierarchy: event.target.checked })} />} label="Admite jerarquía" />
    {canWrite && <>
      <Typography variant="body2" color="text.secondary">Core solo permite cambiar nombre y descripción antes de la primera publicación, y la jerarquía antes de crear versiones.</Typography>
      <Box><Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={() => void save()}>Guardar datos</Button></Box>
    </>}
  </Stack></CardContent></Card>
}

export const CatalogDetailPage = () => <ResourceDetailPage area={catalogArea}
  metadata={(catalog, onSaved, onReload) => <CatalogMetadataCard key={`${catalog.id}:${catalog.version}`} catalog={catalog} onSaved={onSaved} onReload={onReload} />} />

const entryTypes = (Object.keys(entryTypeLabels) as CatalogEntryType[]).map((value) => ({ value, label: entryTypeLabels[value] }))

function CatalogEntries({ context }: { context: VersionContext<CatalogPreview, Catalog> }) {
  const { preview, editable, resource, resourceId, versionId, run } = context
  const editor = useVersionEditor(context)
  const flat = flattenTree(preview.items)
  const tree = buildTree(preview.items)
  const siblings = (parentId: string | null) => flat.filter((entry) => entry.parentId === parentId)
  const detailFields: FieldSpec[] = [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'description', label: 'Descripción', kind: 'multiline' },
    { key: 'entryType', label: 'Tipo de elemento', kind: 'select', options: entryTypes },
    { key: 'isActive', label: 'Activo', kind: 'switch' },
    { key: 'sourceReference', label: 'Referencia de origen' },
  ]
  const create = (parent: CatalogEntry | null) => editor.open({
    key: `create:${parent?.id ?? 'root'}`,
    title: parent ? `Agregar elemento en ${parent.name}` : 'Agregar elemento',
    fields: [{ key: 'code', label: 'Código', required: true }, ...detailFields, { key: 'sortOrder', label: 'Orden dentro del padre', kind: 'number', required: true }],
    values: { code: '', name: '', description: '', entryType: 'LEAF', isActive: true, sourceReference: '', sortOrder: String(nextOrder(siblings(parent?.id ?? null))) },
    submitLabel: 'Agregar',
    submit: (values) => run(() => catalogsApi.createEntry(resourceId, versionId, {
      code: String(values.code).trim(), name: String(values.name).trim(), description: textOrNull(String(values.description)), parentId: parent?.id ?? null,
      entryType: values.entryType as CatalogEntryType, sortOrder: Number(values.sortOrder), isActive: Boolean(values.isActive), sourceReference: textOrNull(String(values.sourceReference)),
    }), 'Elemento agregado.'),
  })
  const edit = (entry: CatalogEntry) => editor.open({
    key: `edit:${entry.id}:${entry.version}`,
    title: `Editar ${entry.name}`,
    fields: detailFields,
    values: { name: entry.name, description: entry.description ?? '', entryType: entry.entryType, isActive: entry.isActive, sourceReference: entry.sourceReference ?? '' },
    submit: (values: FormValues) => run(() => catalogsApi.updateEntry(resourceId, versionId, entry.id, {
      version: entry.version, name: String(values.name).trim(), description: textOrNull(String(values.description)), entryType: values.entryType as CatalogEntryType,
      isActive: Boolean(values.isActive), sourceReference: textOrNull(String(values.sourceReference)),
    }), 'Elemento actualizado.'),
  })
  const move = (entry: CatalogEntry) => editor.open({
    key: `move:${entry.id}:${entry.version}`,
    title: `Mover ${entry.name}`,
    fields: [
      { key: 'parentId', label: 'Padre', kind: 'select', options: [{ value: '', label: 'Raíz del catálogo' }, ...flat.filter((row) => row.id !== entry.id).map((row) => ({ value: row.id, label: `${row.code} · ${row.name}` }))] },
      { key: 'sortOrder', label: 'Orden dentro del padre', kind: 'number', required: true },
    ],
    values: { parentId: entry.parentId ?? '', sortOrder: String(entry.sortOrder) },
    submitLabel: 'Mover',
    submit: (values) => run(() => catalogsApi.moveEntry(resourceId, versionId, entry.id, { version: entry.version, parentId: String(values.parentId) || null, sortOrder: Number(values.sortOrder) }), 'Elemento movido.'),
  })

  return <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Elementos del catálogo</Typography>
      {editable && <Button startIcon={<AddIcon />} variant="outlined" onClick={() => create(null)}>Agregar elemento</Button>}
    </Box>
    {tree.length === 0 ? <Alert severity="info">La versión no contiene elementos.</Alert> : <TreeView nodes={tree} label="Elementos del catálogo" render={({ item }) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', py: 0.5 }}>
      <Typography component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{item.code}</Typography>
      <Typography component="span" sx={{ fontWeight: item.entryType === 'NODE' ? 700 : 400 }}>{item.name}</Typography>
      <Chip size="small" variant="outlined" label={entryTypeLabels[item.entryType]} />
      {!item.isActive && <Chip size="small" label="Inactivo" />}
      {editable && <Box sx={{ ml: 'auto' }}>
        <Button size="small" onClick={() => edit(item)}>Editar</Button>
        {resource.supportsHierarchy && item.entryType === 'NODE' && <Button size="small" onClick={() => create(item)}>Agregar hijo</Button>}
        <Button size="small" onClick={() => move(item)}>Mover</Button>
        <Button size="small" color="error" onClick={() => editor.remove({ title: 'Eliminar elemento', message: `Se eliminará ${item.name} del borrador. Core rechaza eliminar un elemento con hijos.`, success: 'Elemento eliminado.', action: () => catalogsApi.deleteEntry(resourceId, versionId, item.id, item.version) })}>Eliminar</Button>
      </Box>}
    </Box>} />}
    {editor.dialogs}
  </CardContent></Card>
}

const describeEntries = (preview: CatalogPreview) => {
  const names = new Map(flattenTree(preview.items).map((entry) => [entry.id, `${entry.code} · ${entry.name}`]))
  return (target: string) => names.get(target.split('.')[1] ?? '') ?? null
}

export const CatalogVersionPage = () => <VersionPage area={catalogArea} describe={describeEntries}>{(context) => <CatalogEntries context={context} />}</VersionPage>
