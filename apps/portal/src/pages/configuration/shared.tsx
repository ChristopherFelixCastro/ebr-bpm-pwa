import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, List, ListItem, ListItemText, MenuItem, Stack, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import PublishIcon from '@mui/icons-material/Publish'
import StarIcon from '@mui/icons-material/Star'
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client'
import type { BaseDefinition, DefinitionVersion, PublishInput, ValidationResult, VersionStatus, VersionedApi } from '../../api/configuration'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'
import { dateTime, dominicanDateTimeInput, dominicanInputToIso, statusColors, statusLabels } from './labels'
import type { TreeNode } from '../../utils/tree'

// La interfaz solo oculta controles; Core decide permisos, orden, validación y publicación.
export const canWriteConfiguration = (user: CoreUser | null) => user?.status === 'APPROVED' && (user.roleCode === 'ADMIN' || user.roleCode === 'UNIVERSAL')

export type PreviewBase = { version: DefinitionVersion; validation: ValidationResult }
export type AreaConfig<R extends BaseDefinition, P extends PreviewBase> = {
  title: string
  singular: string
  path: string
  icon: ReactNode
  description: string
  api: VersionedApi<R, P> & { create: (body: never) => Promise<R> }
  createFields: { description: boolean; hierarchy: boolean }
  countLabel: (version: DefinitionVersion) => string
  defaultScope?: string
}

export const StatusChip = ({ status }: { status: VersionStatus }) => <Chip size="small" color={statusColors[status]} label={statusLabels[status]} />

export const StaleAlert = ({ onReload, subject = 'La configuración' }: { onReload: () => void; subject?: string }) =>
  <Alert severity="warning" action={<Button color="inherit" onClick={onReload}>Recargar</Button>}>
    {subject} cambió en el servidor. Sus valores permanecen visibles; recargue antes de volver a guardar.
  </Alert>

export function ValidationPanel({ result, title = 'Resultado de validación de Core', describe }: { result: ValidationResult; title?: string; describe?: (path: string) => string | null }) {
  const issue = (item: ValidationResult['errors'][number], key: string) => {
    const target = describe?.(item.path)
    return <ListItem key={key} disableGutters dense>
      <ListItemText primary={item.message} secondary={`${target ? `${target} · ` : ''}${item.code}`} />
    </ListItem>
  }
  return <Alert severity={result.valid ? (result.warnings.length ? 'warning' : 'success') : 'error'} aria-label={title}>
    <AlertTitle>{title}</AlertTitle>
    {result.valid ? 'La versión cumple las reglas de Core.' : `Core encontró ${result.errors.length} error(es).`}
    {result.warnings.length > 0 && ` Advertencias: ${result.warnings.length}.`}
    {(result.errors.length > 0 || result.warnings.length > 0) && <List dense disablePadding>
      {result.errors.map((item, index) => issue(item, `e${index}`))}
      {result.warnings.map((item, index) => issue(item, `w${index}`))}
    </List>}
  </Alert>
}

export function TreeView<T>({ nodes, label, render }: { nodes: TreeNode<T>[]; label: string; render: (node: TreeNode<T>) => ReactNode }) {
  const branch = (list: TreeNode<T>[], root: boolean): ReactNode => <Box component="ul" role={root ? 'tree' : 'group'} aria-label={root ? label : undefined}
    sx={{ listStyle: 'none', m: 0, pl: root ? 0 : 3, borderLeft: root ? 'none' : '1px dashed #CBD5E1' }}>
    {list.map((node) => <Box component="li" key={(node.item as { id: string }).id} role="treeitem" aria-level={node.depth} aria-expanded={node.children.length ? true : undefined} sx={{ my: 0.5 }}>
      {render(node)}
      {node.children.length > 0 && branch(node.children, false)}
    </Box>)}
  </Box>
  return branch(nodes, true)
}

export function FormDialog({ open, title, onClose, onSubmit, saving, stale, onReload, submitLabel = 'Guardar', children }: {
  open: boolean; title: string; onClose: () => void; onSubmit: () => void; saving: boolean; stale?: boolean; onReload?: () => void; submitLabel?: string; children: ReactNode
}) {
  return <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      {stale && onReload && <StaleAlert onReload={onReload} subject="El elemento" />}
      {children}
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" disabled={saving} onClick={onSubmit}>{saving ? 'Guardando…' : submitLabel}</Button></DialogActions>
  </Dialog>
}

// Ejecuta una mutación con la reautenticación que Core exija y traduce STALE_VERSION sin descartar la entrada.
export function useMutationRunner(onStale: () => void, onDone: () => Promise<void> | void) {
  const { runWithReauthentication } = useSession()
  const { showError, showSuccess } = useNotification()
  return useCallback(async (action: () => Promise<unknown>, success: string, fallback = 'No fue posible guardar el cambio.') => {
    try {
      await runWithReauthentication(action)
      showSuccess(success)
      await onDone()
      return true
    } catch (error) {
      if (error instanceof ReauthenticationCancelledError) return false
      if (isStaleVersion(error)) { onStale(); return false }
      showError(supportMessage(error, fallback))
      return false
    }
  }, [onDone, onStale, runWithReauthentication, showError, showSuccess])
}

export function ResourceListPage<R extends BaseDefinition, P extends PreviewBase>({ area }: { area: AreaConfig<R, P> }) {
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const [items, setItems] = useState<R[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', description: '', supportsHierarchy: false })
  const canWrite = canWriteConfiguration(user)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await area.api.list()) }
    catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, `No fue posible cargar ${area.title.toLowerCase()}.`))
    } finally { setLoading(false) }
  }, [area, navigate, showError])
  useEffect(() => { void load() }, [load])

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) return showError('Código y nombre son obligatorios.')
    setSaving(true)
    try {
      const body = { code: form.code.trim(), name: form.name.trim(), ...(area.createFields.description ? { description: form.description.trim() || null } : {}), ...(area.createFields.hierarchy ? { supportsHierarchy: form.supportsHierarchy } : {}) }
      const created = await area.api.create(body as never)
      showSuccess(`Se creó ${area.singular} ${created.code}.`)
      setOpen(false)
      navigate(`${area.path}/${created.id}`)
    } catch (error) { showError(supportMessage(error, `No fue posible crear ${area.singular}.`)) }
    finally { setSaving(false) }
  }

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
      <Box><Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', gap: 1, alignItems: 'center' }}>{area.icon}{area.title}</Typography><Typography color="text.secondary">{area.description}</Typography></Box>
      {canWrite && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Crear {area.singular}</Button>}
    </Box>
    {!canWrite && <Alert severity="info" sx={{ mb: 2 }}>Consulta de solo lectura: puede revisar versiones, vista previa y validación.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
      <TableContainer><Table><TableHead><TableRow><TableCell>Código</TableCell><TableCell>Nombre</TableCell><TableCell>Versiones</TableCell>{area.defaultScope && <TableCell>Predeterminada</TableCell>}</TableRow></TableHead>
        <TableBody>{loading ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
          : items.length === 0 ? <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}>No hay registros.</TableCell></TableRow>
          : items.map((item) => <TableRow hover key={item.id} onClick={() => navigate(`${area.path}/${item.id}`)} sx={{ cursor: 'pointer' }}>
            <TableCell sx={{ fontFamily: 'monospace' }}>{item.code}</TableCell>
            <TableCell><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>{item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}</TableCell>
            <TableCell>{item.versionCount}</TableCell>
            {area.defaultScope && <TableCell>{item.isDefault ? <Chip size="small" color="primary" icon={<StarIcon />} label="Predeterminada" /> : '—'}</TableCell>}
          </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Card>
    {canWrite && <FormDialog open={open} title={`Crear ${area.singular}`} onClose={() => setOpen(false)} onSubmit={() => void create()} saving={saving} submitLabel="Crear">
      <TextField label="Código" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} helperText="Core lo normaliza a mayúsculas." />
      <TextField label="Nombre" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      {area.createFields.description && <TextField label="Descripción" multiline minRows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />}
      {area.createFields.hierarchy && <FormControlLabel control={<Switch checked={form.supportsHierarchy} onChange={(event) => setForm({ ...form, supportsHierarchy: event.target.checked })} />} label="Admite jerarquía" />}
    </FormDialog>}
  </Box>
}

export function ResourceDetailPage<R extends BaseDefinition, P extends PreviewBase>({ area, metadata }: {
  area: AreaConfig<R, P>
  metadata?: (resource: R, onSaved: (next: R) => void, onReload: () => Promise<void>) => ReactNode
}) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError } = useNotification()
  const [resource, setResource] = useState<R | null>(null)
  const [versions, setVersions] = useState<DefinitionVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [defaultOpen, setDefaultOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const canWrite = canWriteConfiguration(user)

  const load = useCallback(async () => {
    try {
      const [next, history] = await Promise.all([area.api.get(id), area.api.versions(id)])
      setResource(next)
      setVersions(history)
      setStale(false)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, `No fue posible cargar ${area.singular}.`))
    } finally { setLoading(false) }
  }, [area, id, navigate, showError])
  useEffect(() => { void load() }, [load])
  const run = useMutationRunner(useCallback(() => setStale(true), []), load)

  const createVersion = async (cloneFrom?: DefinitionVersion) => {
    setBusy(true)
    const created: { version?: DefinitionVersion } = {}
    const ok = await run(async () => { created.version = await area.api.createVersion(id, cloneFrom?.id) }, cloneFrom ? `Se clonó la versión ${cloneFrom.versionNumber} como borrador.` : 'Se creó una versión en borrador.', 'No fue posible crear la versión.')
    setBusy(false)
    if (ok && created.version) navigate(`${area.path}/${id}/versiones/${created.version.id}`)
  }
  const setDefault = async () => {
    if (!resource || !area.api.setDefault) return
    setBusy(true)
    const expected = resource.version
    const ok = await run(() => area.api.setDefault!(id, expected), `${resource.name} es ahora la configuración predeterminada para nuevas inspecciones.`, 'No fue posible cambiar la configuración predeterminada.')
    setBusy(false)
    if (ok) setDefaultOpen(false)
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!resource) return null
  const defaultNote = `El predeterminado solo se aplica a inspecciones nuevas; las inspecciones ya creadas conservan ${area.defaultScope ?? 'la configuración'} y la versión con que se crearon.`

  return <Stack spacing={3}>
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(area.path)}>{area.title}</Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{resource.name}</Typography><Typography color="text.secondary">Código {resource.code} · Revisión {resource.version}</Typography></Box>
        {resource.isDefault && <Chip color="primary" icon={<StarIcon />} label="Predeterminada para nuevas inspecciones" />}
      </Box>
    </Box>
    {stale && <StaleAlert onReload={() => void load()} subject={`El registro de ${area.singular}`} />}
    {metadata?.(resource, setResource, load)}
    {area.defaultScope && <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Configuración predeterminada</Typography>
      <Alert severity="info" sx={{ mb: canWrite && !resource.isDefault ? 2 : 0 }}>{defaultNote} Core exige una versión publicada vigente y reautenticación reciente.</Alert>
      {canWrite && !resource.isDefault && <Button variant="outlined" startIcon={<StarIcon />} disabled={busy} onClick={() => setDefaultOpen(true)}>Designar predeterminada</Button>}
    </CardContent></Card>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Versiones e historial</Typography>
        {canWrite && <Button startIcon={<AddIcon />} variant="contained" disabled={busy} onClick={() => void createVersion()}>Nueva versión vacía</Button>}
      </Box>
      {canWrite && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Las versiones publicadas o retiradas son inmutables: clone una versión para proponer cambios. Core admite un solo borrador a la vez.</Typography>}
      <TableContainer><Table size="small"><TableHead><TableRow>
        <TableCell>Versión</TableCell><TableCell>Estado</TableCell><TableCell>Vigente desde</TableCell><TableCell>Vigente hasta</TableCell><TableCell>Publicada</TableCell><TableCell>Retirada</TableCell><TableCell>Contenido</TableCell><TableCell>Nota</TableCell><TableCell align="right">Acciones</TableCell>
      </TableRow></TableHead><TableBody>
        {versions.length === 0 ? <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>Sin versiones registradas.</TableCell></TableRow>
          : versions.map((version) => <TableRow key={version.id} hover>
            <TableCell>v{version.versionNumber}</TableCell>
            <TableCell><StatusChip status={version.status} /></TableCell>
            <TableCell>{dateTime(version.effectiveFrom)}</TableCell>
            <TableCell>{dateTime(version.effectiveTo)}</TableCell>
            <TableCell>{dateTime(version.publishedAt)}</TableCell>
            <TableCell>{dateTime(version.retiredAt)}</TableCell>
            <TableCell>{area.countLabel(version)}</TableCell>
            <TableCell>{version.publicationNote || '—'}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
              <Button size="small" onClick={() => navigate(`${area.path}/${id}/versiones/${version.id}`)}>{version.status === 'DRAFT' && canWrite ? 'Editar' : 'Abrir'}</Button>
              {canWrite && <Button size="small" startIcon={<ContentCopyIcon />} disabled={busy} onClick={() => void createVersion(version)} aria-label={`Clonar versión ${version.versionNumber}`}>Clonar</Button>}
            </TableCell>
          </TableRow>)}
      </TableBody></Table></TableContainer>
    </CardContent></Card>
    {canWrite && area.defaultScope && <ConfirmDialog open={defaultOpen} title="Designar predeterminada" message={`${defaultNote} Se solicitará reautenticación si Core la exige.`} confirmText="Designar" loading={busy} onClose={() => setDefaultOpen(false)} onConfirm={() => void setDefault()} />}
  </Stack>
}

export type VersionContext<P, R = BaseDefinition> = {
  resource: R
  resourceId: string
  versionId: string
  preview: P
  editable: boolean
  stale: boolean
  run: (action: () => Promise<unknown>, success: string, fallback?: string) => Promise<boolean>
  reload: () => Promise<void>
}

export function VersionPage<R extends BaseDefinition, P extends PreviewBase>({ area, describe, children }: {
  area: AreaConfig<R, P>
  describe?: (preview: P) => (path: string) => string | null
  children: (context: VersionContext<P, R>) => ReactNode
}) {
  const { id = '', versionId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError } = useNotification()
  const [resource, setResource] = useState<R | null>(null)
  const [preview, setPreview] = useState<P | null>(null)
  const [validation, setValidation] = useState<{ result: ValidationResult; source: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [retireOpen, setRetireOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [publishForm, setPublishForm] = useState({ effectiveFrom: dominicanDateTimeInput(), publicationNote: '' })
  const canWrite = canWriteConfiguration(user)

  const load = useCallback(async () => {
    try {
      const [next, content] = await Promise.all([area.api.get(id), area.api.preview(id, versionId)])
      setResource(next)
      setPreview(content)
      setValidation(null)
      setStale(false)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar la versión.'))
    } finally { setLoading(false) }
  }, [area, id, navigate, showError, versionId])
  useEffect(() => { void load() }, [load])
  const run = useMutationRunner(useCallback(() => setStale(true), []), load)

  const validate = async () => {
    setBusy(true)
    try { setValidation({ result: await area.api.validate(id, versionId), source: 'Validación solicitada a Core' }) }
    catch (error) { showError(supportMessage(error, 'No fue posible validar la versión.')) }
    finally { setBusy(false) }
  }
  const publish = async () => {
    if (!preview || !publishForm.effectiveFrom) return showError('Indique la fecha de vigencia.')
    setBusy(true)
    const body: PublishInput = { version: preview.version.version, effectiveFrom: dominicanInputToIso(publishForm.effectiveFrom), publicationNote: publishForm.publicationNote.trim() || null }
    const ok = await run(async () => {
      try { await area.api.publish(id, versionId, body) }
      catch (error) {
        if (error instanceof CoreApiError && error.code === 'PUBLICATION_INVALID' && error.details) setValidation({ result: error.details as ValidationResult, source: 'Core rechazó la publicación' })
        throw error
      }
    }, 'Versión publicada.', 'Core no publicó la versión.')
    setBusy(false)
    if (ok) setPublishOpen(false)
  }
  const retire = async () => {
    if (!preview) return
    setBusy(true)
    const expected = preview.version.version
    const ok = await run(() => area.api.retire(id, versionId, expected), 'Versión retirada.', 'Core no retiró la versión.')
    setBusy(false)
    if (ok) setRetireOpen(false)
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!preview || !resource) return null
  const current = preview.version
  const editable = canWrite && current.status === 'DRAFT'
  const shown = validation ?? { result: preview.validation, source: 'Resultado de validación de Core' }

  return <Stack spacing={3}>
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`${area.path}/${id}`)}>{resource.name}</Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{resource.name} · versión {current.versionNumber}</Typography>
          <Typography color="text.secondary">Vigente desde {dateTime(current.effectiveFrom)} · hasta {dateTime(current.effectiveTo)}{current.publicationNote ? ` · ${current.publicationNote}` : ''}</Typography>
        </Box>
        <StatusChip status={current.status} />
      </Box>
    </Box>
    {stale && <StaleAlert onReload={() => void load()} />}
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Button variant="outlined" startIcon={<FactCheckIcon />} disabled={busy} onClick={() => void validate()}>Validar</Button>
      {canWrite && current.status === 'DRAFT' && <Button variant="contained" startIcon={<PublishIcon />} disabled={busy} onClick={() => setPublishOpen(true)}>Publicar</Button>}
      {canWrite && current.status === 'PUBLISHED' && <Button variant="outlined" color="error" disabled={busy} onClick={() => setRetireOpen(true)}>Retirar</Button>}
    </Stack>
    {current.status !== 'DRAFT' && <Alert severity="info">Vista previa de una versión {current.status === 'PUBLISHED' ? 'publicada' : 'retirada'}: es inmutable. Para proponer cambios, clónela desde el historial de versiones.</Alert>}
    {current.status === 'DRAFT' && !canWrite && <Alert severity="info">Vista previa de un borrador en modo consulta.</Alert>}
    <ValidationPanel result={shown.result} title={shown.source} describe={describe?.(preview)} />
    {children({ resource, resourceId: id, versionId, preview, editable, stale, run, reload: load })}
    {canWrite && <FormDialog open={publishOpen} title={`Publicar versión ${current.versionNumber}`} onClose={() => setPublishOpen(false)} onSubmit={() => void publish()} saving={busy} submitLabel="Publicar">
      <Alert severity="info">Core valida la versión al publicar y exige reautenticación reciente. Las inspecciones ya creadas conservan su versión.</Alert>
      <TextField label="Vigente desde (hora de República Dominicana)" type="datetime-local" required value={publishForm.effectiveFrom} onChange={(event) => setPublishForm({ ...publishForm, effectiveFrom: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Nota de publicación" multiline minRows={2} value={publishForm.publicationNote} onChange={(event) => setPublishForm({ ...publishForm, publicationNote: event.target.value })} />
    </FormDialog>}
    {canWrite && <ConfirmDialog open={retireOpen} title={`Retirar versión ${current.versionNumber}`} message="La versión dejará de estar vigente. Core exige otra versión publicada vigente y reautenticación reciente; las inspecciones existentes no cambian." confirmText="Retirar" variant="danger" loading={busy} onClose={() => setRetireOpen(false)} onConfirm={() => void retire()} />}
  </Stack>
}

export type FieldSpec = {
  key: string
  label: string
  kind?: 'text' | 'multiline' | 'number' | 'select' | 'switch'
  options?: readonly { value: string; label: string }[]
  required?: boolean
  helper?: string
}
export type FormValues = Record<string, string | boolean>
export type EditorDialog = { key: string; title: string; fields: FieldSpec[]; values: FormValues; submitLabel?: string; submit: (values: FormValues) => Promise<boolean> }

// Formulario de edición: conserva lo escrito si Core rechaza el cambio (STALE_VERSION incluido).
export function SpecDialog({ dialog, onClose, stale, onReload }: { dialog: EditorDialog; onClose: () => void; stale: boolean; onReload: () => void }) {
  const [values, setValues] = useState<FormValues>(dialog.values)
  const [saving, setSaving] = useState(false)
  const { showError } = useNotification()
  const submit = async () => {
    const missing = dialog.fields.find((field) => field.required && typeof values[field.key] === 'string' && !String(values[field.key]).trim())
    if (missing) return showError(`${missing.label} es obligatorio.`)
    setSaving(true)
    const ok = await dialog.submit(values)
    setSaving(false)
    if (ok) onClose()
  }
  return <FormDialog open title={dialog.title} onClose={onClose} onSubmit={() => void submit()} saving={saving} stale={stale} onReload={onReload} submitLabel={dialog.submitLabel}>
    {dialog.fields.map((field) => field.kind === 'switch'
      ? <FormControlLabel key={field.key} control={<Switch checked={Boolean(values[field.key])} onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })} />} label={field.label} />
      : <TextField key={field.key} label={field.label} required={field.required} helperText={field.helper}
        select={field.kind === 'select'} multiline={field.kind === 'multiline'} minRows={field.kind === 'multiline' ? 3 : undefined}
        type={field.kind === 'number' ? 'number' : 'text'} slotProps={field.kind === 'number' ? { htmlInput: { step: 'any' } } : undefined}
        value={String(values[field.key] ?? '')} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}>
        {field.kind === 'select' && (field.options ?? []).map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </TextField>)}
  </FormDialog>
}

// Estado compartido de diálogos de edición y eliminación dentro de una versión en borrador.
export function useVersionEditor<P, R>(context: VersionContext<P, R>) {
  const [dialog, setDialog] = useState<EditorDialog | null>(null)
  const [removal, setRemoval] = useState<{ title: string; message: string; action: () => Promise<unknown>; success: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const reload = () => { setDialog(null); void context.reload() }
  const confirmRemoval = async () => {
    if (!removal) return
    setRemoving(true)
    const ok = await context.run(removal.action, removal.success, 'No fue posible eliminar el elemento.')
    setRemoving(false)
    if (ok) setRemoval(null)
  }
  const dialogs = <>
    {dialog && <SpecDialog key={dialog.key} dialog={dialog} stale={context.stale} onReload={reload} onClose={() => setDialog(null)} />}
    {removal && <ConfirmDialog open title={removal.title} message={removal.message} confirmText="Eliminar" variant="danger" loading={removing} onClose={() => setRemoval(null)} onConfirm={() => void confirmRemoval()} />}
  </>
  return { open: setDialog, remove: setRemoval, dialogs }
}

export const nextOrder = (rows: readonly { sortOrder: number }[]) => rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1
export const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
export const textOrNull = (value: string) => value.trim() || null
