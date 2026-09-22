import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { contactsApi, type Contact, type ContactLink, type ContactRelation } from '../api/resources'
import { routeForError, supportMessage } from '../api/presentation'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { ReauthenticationCancelledError, useReauthentication } from '../context/ReauthenticationContext'
import { useNavigate } from 'react-router-dom'

type Entity = 'company' | 'establishment'
const relationshipTypes = ['LEGAL_REPRESENTATIVE', 'QUALITY_CONTACT', 'PRIMARY_CONTACT', 'OWNER', 'REPRESENTATIVE'] as const
const today = () => new Date().toISOString().slice(0, 10)

export const ContactRelationsPanel = ({ entity, entityId, canEdit }: { entity: Entity; entityId: string; canEdit: boolean }) => {
  const { currentUser } = useAuth()
  const { showError, showSuccess } = useNotification()
  const { runWithReauthentication } = useReauthentication()
  const navigate = useNavigate()
  const [relations, setRelations] = useState<ContactRelation[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [fullName, setFullName] = useState('')
  const [identityDocument, setIdentityDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState<(typeof relationshipTypes)[number]>('PRIMARY_CONTACT')
  const [isPrimary, setIsPrimary] = useState(false)
  const [effectiveFrom, setEffectiveFrom] = useState(today())
  const [ending, setEnding] = useState<ContactRelation | null>(null)
  const [effectiveTo, setEffectiveTo] = useState(today())
  const [fullDocument, setFullDocument] = useState<{ id: string; value: string | null } | null>(null)
  const isGlobal = currentUser?.roleCode === 'ADMIN' || currentUser?.roleCode === 'UNIVERSAL'

  const load = useCallback(async () => {
    try {
      setRelations(entity === 'company' ? await contactsApi.listCompanyRelations(entityId) : await contactsApi.listEstablishmentRelations(entityId))
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar los contactos.'))
    }
  }, [entity, entityId, navigate, showError])

  useEffect(() => { void load() }, [load])

  const runSearch = async () => {
    setSearched(true)
    try {
      const response = await contactsApi.list({ page: 1, limit: 20, ...(search.trim() ? { search: search.trim() } : {}) })
      setResults(response.data)
    } catch (error) { showError(supportMessage(error, 'No fue posible buscar contactos.')) }
  }

  const link = async () => {
    if (!searched) return showError('Busque contactos antes de crear o vincular.')
    if (!selected && (!fullName.trim() || !identityDocument.trim())) return showError('Indique nombre y documento para crear o reutilizar de forma segura.')
    const body: ContactLink = selected && isGlobal
      ? { contactId: selected.id, relationshipType, isPrimary, effectiveFrom }
      : { contact: { fullName: fullName.trim(), identityDocument: identityDocument.trim(), phone: phone.trim() || null, email: email.trim() || null }, relationshipType, isPrimary, effectiveFrom }
    try {
      if (entity === 'company') await contactsApi.linkCompany(entityId, body)
      else await contactsApi.linkEstablishment(entityId, body)
      showSuccess('Contacto vinculado correctamente.')
      setOpen(false)
      setSelected(null)
      setSearched(false)
      setResults([])
      await load()
    } catch (error) { showError(supportMessage(error, 'No fue posible vincular el contacto.')) }
  }

  const endRelation = async () => {
    if (!ending) return
    try {
      if (entity === 'company') await contactsApi.endCompanyRelation(entityId, ending.id, ending.version, effectiveTo)
      else await contactsApi.endEstablishmentRelation(entityId, ending.id, ending.version, effectiveTo)
      showSuccess('Relación finalizada sin eliminar su historial.')
      setEnding(null)
      await load()
    } catch (error) { showError(supportMessage(error, 'No fue posible finalizar la relación.')) }
  }

  const revealDocument = async (contactId: string) => {
    try {
      const contact = await runWithReauthentication(() => contactsApi.get(contactId))
      setFullDocument({ id: contactId, value: contact.identityDocument ?? null })
    } catch (error) {
      if (!(error instanceof ReauthenticationCancelledError)) showError(supportMessage(error, 'No fue posible consultar el documento.'))
    }
  }

  return (
    <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Contactos relacionados</Typography>
          {canEdit && <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)}>Vincular contacto</Button>}
        </Box>
        {relations.length === 0 ? <Alert severity="info">No existen relaciones de contacto registradas.</Alert> : (
          <Stack spacing={1.5}>
            {relations.map((relation) => (
              <Box key={relation.id} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, bgcolor: relation.effectiveTo ? '#F8FAFC' : '#FFFFFF' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{relation.contact.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">{relation.contact.email || 'Sin correo'} · {relation.contact.phone || 'Sin teléfono'}</Typography>
                    <Typography variant="caption" color="text.secondary">Documento: {fullDocument?.id === relation.contact.id ? (fullDocument.value || 'No registrado') : relation.contact.identityDocumentMasked || 'No registrado'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip size="small" label={relation.relationshipType} />
                    {relation.isPrimary && <Chip size="small" color="primary" label="Primario" />}
                    <Chip size="small" color={relation.effectiveTo ? 'default' : 'success'} label={relation.effectiveTo ? `Finalizada ${relation.effectiveTo}` : 'Vigente'} />
                  </Stack>
                </Box>
                <Typography variant="caption" color="text.secondary">Versión relación: {relation.version} · Versión contacto: {relation.contact.version}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {isGlobal && <Button size="small" startIcon={<VisibilityIcon />} onClick={() => void revealDocument(relation.contact.id)}>Ver documento completo</Button>}
                  {canEdit && !relation.effectiveTo && <Button size="small" color="warning" onClick={() => { setEnding(relation); setEffectiveTo(today()) }}>Finalizar relación</Button>}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Buscar y vincular contacto</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <TextField fullWidth label="Nombre o correo" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => void runSearch()}>Buscar</Button>
          </Stack>
          {searched && <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2">Resultados dentro de su alcance</Typography>
            {results.length === 0 ? <Alert severity="info" sx={{ mt: 1 }}>No se encontraron coincidencias. Complete los datos para crear o reutilizar por documento normalizado.</Alert> : results.map((contact) => (
              <Button key={contact.id} disabled={!isGlobal} onClick={() => { setSelected(contact); setFullName(contact.fullName); setPhone(contact.phone || ''); setEmail(contact.email || '') }} sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                {contact.fullName} · {contact.identityDocumentMasked || 'sin documento'} {isGlobal ? '' : ' (ya relacionado)'}
              </Button>
            ))}
          </Box>}
          <Stack spacing={2}>
            {selected && isGlobal && <Alert severity="success">Se reutilizará el contacto seleccionado.</Alert>}
            {(!selected || !isGlobal) && <>
              <TextField label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              <TextField label="Documento de identidad" value={identityDocument} onChange={(event) => setIdentityDocument(event.target.value)} required helperText="El Core normaliza este valor antes de reutilizar un contacto." />
              <TextField label="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <TextField label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </>}
            <TextField select label="Tipo de relación" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)}>{relationshipTypes.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
            <TextField type="date" label="Vigente desde" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <FormControlLabel control={<Checkbox checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />} label="Contacto primario" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" onClick={() => void link()}>Vincular</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(ending)} onClose={() => setEnding(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Finalizar relación</DialogTitle>
        <DialogContent><TextField fullWidth type="date" label="Vigente hasta" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setEnding(null)}>Cancelar</Button><Button color="warning" variant="contained" onClick={() => void endRelation()}>Finalizar</Button></DialogActions>
      </Dialog>
    </Card>
  )
}
