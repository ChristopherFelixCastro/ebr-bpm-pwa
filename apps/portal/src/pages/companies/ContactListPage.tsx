import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { contactsApi, type Contact, type ContactCreate } from '../../api/resources'
import { isStaleVersion, supportMessage } from '../../api/presentation'
import { isGlobal } from '../../access/resourceRules'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'

export function ContactListPage() {
  const { user, runWithReauthentication } = useSession()
  const { showError, showSuccess } = useNotification()
  const [items, setItems] = useState<Contact[]>([])
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<ContactCreate>({ fullName: '', identityDocument: '', email: null, phone: null })
  const [revealed, setRevealed] = useState<{ id: string; value: string | null } | null>(null)
  const [stale, setStale] = useState(false)
  const globalAccess = isGlobal(user)
  useEffect(() => {
    let active = true
    setLoading(true)
    void contactsApi.list({ page: page + 1, limit, search }).then((result) => { if (active) { setItems(result.data); setTotal(result.meta.total ?? result.data.length) } }).catch((error) => { if (active) showError(supportMessage(error, 'No fue posible consultar contactos.')) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, limit, search, showError])
  const refresh = async () => { const result = await contactsApi.list({ page: page + 1, limit, search }); setItems(result.data); setTotal(result.meta.total ?? result.data.length) }
  const reveal = async (id: string) => {
    try { const contact = await runWithReauthentication(() => contactsApi.get(id)); setRevealed({ id, value: contact.identityDocument ?? null }) }
    catch (error) { if (!(error instanceof ReauthenticationCancelledError)) showError(supportMessage(error, 'No fue posible consultar el documento.')) }
  }
  const create = async () => {
    if (!createForm.fullName.trim() || !createForm.identityDocument?.trim()) return showError('Nombre y documento son obligatorios.')
    try { await contactsApi.create(createForm); setCreating(false); setCreateForm({ fullName: '', identityDocument: '', email: null, phone: null }); showSuccess('Contacto creado.'); await refresh() }
    catch (error) { showError(supportMessage(error, 'No fue posible crear el contacto.')) }
  }
  const save = async () => {
    if (!editing) return
    try { const result = await contactsApi.update(editing.id, { version: editing.version, fullName: editing.fullName, phone: editing.phone, email: editing.email }); setEditing(null); setStale(false); setItems((current) => current.map((item) => item.id === result.id ? result : item)); showSuccess('Contacto actualizado.') }
    catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible actualizar el contacto.')) }
  }
  return <Stack spacing={2}><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Contactos</Typography><Typography color="text.secondary">Identidad enmascarada y consulta dentro del alcance de Core.</Typography></Box>{globalAccess && <Button onClick={() => setCreating(true)}>Crear contacto</Button>}</Box>
    <Card><Stack direction="row" spacing={1} sx={{ p: 2 }}><TextField fullWidth size="small" label="Buscar nombre o correo" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(0); setSearch(searchInput.trim()) } }} /><Button onClick={() => { setPage(0); setSearch(searchInput.trim()) }}>Buscar</Button></Stack>
      <Table><TableHead><TableRow><TableCell>Contacto</TableCell><TableCell>Documento</TableCell><TableCell>Correo</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={4}>No hay contactos en su alcance.</TableCell></TableRow> : items.map((item) => <TableRow key={item.id}><TableCell>{item.fullName}</TableCell><TableCell>{revealed?.id === item.id ? revealed.value : item.identityDocumentMasked ?? '—'}</TableCell><TableCell>{item.email ?? '—'}</TableCell><TableCell><Stack direction="row" spacing={1}>{globalAccess && <><Button size="small" onClick={() => void reveal(item.id)}>Ver documento</Button><Button size="small" onClick={() => { setEditing(item); setStale(false) }}>Editar</Button></>}{!globalAccess && <Chip size="small" label="Consulta" />}</Stack></TableCell></TableRow>)}</TableBody></Table>
      <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} />
    </Card>
    <Dialog open={creating} onClose={() => setCreating(false)} fullWidth><DialogTitle>Nuevo contacto</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Nombre completo" required value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} /><TextField label="Documento de identidad" required value={createForm.identityDocument ?? ''} onChange={(event) => setCreateForm({ ...createForm, identityDocument: event.target.value })} /><TextField label="Teléfono" value={createForm.phone ?? ''} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value || null })} /><TextField label="Correo" value={createForm.email ?? ''} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value || null })} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreating(false)}>Cancelar</Button><Button onClick={() => void create()}>Crear</Button></DialogActions></Dialog>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth><DialogTitle>Editar contacto</DialogTitle><DialogContent>{stale && <Alert severity="warning" action={<Button onClick={() => { void refresh(); setEditing(null); setStale(false) }}>Recargar</Button>}>La versión cambió en Core. Recargue el contacto antes de volver a guardar.</Alert>}{editing && <Stack spacing={2} sx={{ mt: 1 }}><TextField label="Nombre completo" value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /><TextField label="Teléfono" value={editing.phone ?? ''} onChange={(event) => setEditing({ ...editing, phone: event.target.value || null })} /><TextField label="Correo" value={editing.email ?? ''} onChange={(event) => setEditing({ ...editing, email: event.target.value || null })} /><Typography variant="caption">Versión {editing.version}</Typography></Stack>}</DialogContent><DialogActions><Button onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={stale} onClick={() => void save()}>Guardar</Button></DialogActions></Dialog>
  </Stack>
}
