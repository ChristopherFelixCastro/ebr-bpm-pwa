import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, MenuItem, Radio, Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import SendIcon from '@mui/icons-material/Send'
import { contactsApi, requestsApi, validatePrivateFile, type CompanyRequestDetail, type Contact, type DocumentType, type RequestDocument } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { isRequestReadOnly, submitPreconditionError } from '../../access/requestRules'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useSession } from '../../session/SessionContext'
import { useNotification } from '../../components/NoticeProvider'
import { canArchiveDocument, canEditRequest, canReviewDocuments } from '../../access/resourceRules'

const relationshipTypes = ['LEGAL_REPRESENTATIVE', 'QUALITY_CONTACT', 'PRIMARY_CONTACT', 'OWNER', 'REPRESENTATIVE'] as const
const formatBytes = (value: number) => value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / (1024 * 1024)).toFixed(2)} MiB`

export const RequestDetailPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const fileInput = useRef<HTMLInputElement>(null)
  const [request, setRequest] = useState<CompanyRequestDetail | null>(null)
  const [documents, setDocuments] = useState<RequestDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [caseId, setCaseId] = useState<string | null>((location.state as { caseId?: string } | null)?.caseId ?? null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [relationshipType, setRelationshipType] = useState<(typeof relationshipTypes)[number]>('PRIMARY_CONTACT')
  const [isPrimary, setIsPrimary] = useState(false)
  const [documentType, setDocumentType] = useState<DocumentType>('SUPPORTING_DOCUMENT')
  const [rejecting, setRejecting] = useState<RequestDocument | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [stale, setStale] = useState(false)
  const editable = request ? canEditRequest(user, request.companyId, request.status) : false
  const reviewer = request ? canReviewDocuments(user, request.status) : false
  const archiveAllowed = request ? canArchiveDocument(user, request.companyId, request.status) : false

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, docs] = await Promise.all([requestsApi.get(id), requestsApi.documents(id)])
      setRequest(detail); setDocuments(docs); setStale(false)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar la solicitud.')) }
    finally { setLoading(false) }
  }, [id, navigate, showError])

  useEffect(() => { void load() }, [load])

  const searchContacts = async () => {
    try { setContacts((await contactsApi.list({ page: 1, limit: 20, ...(contactSearch.trim() ? { search: contactSearch.trim() } : {}) })).data) }
    catch (error) { showError(supportMessage(error, 'No fue posible buscar contactos.')) }
  }

  const addContact = async () => {
    if (!selectedContact) return showError('Seleccione un contacto real dentro del alcance.')
    try {
      await requestsApi.addContact(id, { contactId: selectedContact.id, relationshipType, isPrimary })
      setContactOpen(false); setSelectedContact(null); showSuccess('Contacto vinculado al borrador.'); await load()
    } catch (error) { showError(supportMessage(error, 'No fue posible vincular el contacto.')) }
  }

  const removeContact = async (contactId: string, version: number) => {
    try { await requestsApi.removeContact(id, contactId, version); showSuccess('Contacto retirado sin borrar el historial.'); await load() }
    catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible retirar el contacto.')) }
  }

  const upload = async (file: File) => {
    const active = documents.filter((document) => document.status !== 'ARCHIVED')
    const invalid = validatePrivateFile(file, active.length)
    if (invalid) return showError(invalid)
    if (documentType === 'AUTHORIZATION_LETTER' && active.some((document) => document.documentType === 'AUTHORIZATION_LETTER')) return showError('Ya existe una carta de autorización activa; archive la rechazada antes de reemplazarla.')
    try { await requestsApi.uploadDocument(id, documentType, file); showSuccess('Documento privado cargado.'); await load() }
    catch (error) { showError(supportMessage(error, 'No fue posible cargar el documento.')) }
    finally { if (fileInput.current) fileInput.current.value = '' }
  }

  const documentAction = async (document: RequestDocument, action: 'validate' | 'archive') => {
    try {
      if (action === 'validate') await requestsApi.validateDocument(id, document.id, document.version)
      else await requestsApi.archiveDocument(id, document.id, document.version)
      showSuccess(action === 'validate' ? 'Documento validado.' : 'Documento archivado.'); await load()
    } catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible procesar el documento.')) }
  }

  const reject = async () => {
    if (!rejecting || !rejectReason.trim()) return
    try { await requestsApi.rejectDocument(id, rejecting.id, rejecting.version, rejectReason.trim()); setRejecting(null); setRejectReason(''); showSuccess('Documento rechazado.'); await load() }
    catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible rechazar el documento.')) }
  }

  const download = async (documentId: string) => {
    try { const result = await requestsApi.downloadUrl(id, documentId); window.open(result.signedUrl, '_blank', 'noopener,noreferrer') }
    catch (error) { showError(supportMessage(error, 'No fue posible emitir la descarga temporal.')) }
  }

  const submit = async () => {
    if (!request || submitting) return
    const precondition = submitPreconditionError(request, documents)
    if (precondition) { setSubmitOpen(false); return showError(precondition) }
    setSubmitting(true)
    try {
      const result = await requestsApi.submit(id, request.version)
      setRequest({ ...request, ...result.request })
      setCaseId(result.caseId)
      setSubmitOpen(false)
      showSuccess('Solicitud enviada y caso creado.')
      navigate(`/solicitudes/${id}`, { replace: true, state: { caseId: result.caseId } })
      await load()
    } catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible enviar la solicitud.')) }
    finally { setSubmitting(false) }
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!request) return null
  const draft = !isRequestReadOnly(request.status)
  const activeContacts = request.contacts.filter((contact) => !contact.removedAt)
  const submitIssue = submitPreconditionError(request, documents)

  return <Stack spacing={3}>
    <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/solicitudes')}>Solicitudes</Button><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{request.requestType}</Typography><Typography color="text.secondary">UUID: {request.id} · Versión {request.version}</Typography></Box><Chip color={draft ? 'warning' : 'info'} label={request.status} /></Box></Box>
    {caseId && <Alert severity="success">Caso creado: {caseId}</Alert>}
    {!draft && <Alert severity="info">La solicitud fue enviada y se presenta en modo solo lectura.</Alert>}
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Recargar recurso</Button>}>El recurso cambió en el servidor; no se sobrescribió automáticamente.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700 }}>Datos de solicitud</Typography><Divider sx={{ my: 2 }} /><Typography><strong>Establecimiento:</strong> {request.establishmentName || request.establishmentId}</Typography><Typography><strong>Motivo:</strong> {request.reason}</Typography><Typography><strong>Observaciones:</strong> {request.observations || '—'}</Typography>{editable && <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(`/solicitudes/${id}/editar`)}>Editar borrador</Button>}</CardContent></Card>

    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Contactos de la solicitud</Typography>{editable && <Button startIcon={<AddIcon />} onClick={() => setContactOpen(true)}>Vincular</Button>}</Box>{activeContacts.length === 0 ? <Alert severity="warning">Debe vincular al menos un contacto.</Alert> : <Stack spacing={1}>{activeContacts.map((contact) => <Box key={contact.id} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}><Box><Typography sx={{ fontWeight: 700 }}>{contact.fullName}</Typography><Typography variant="body2" color="text.secondary">{contact.relationshipType} · versión {contact.version}</Typography></Box><Stack direction="row" spacing={1}>{contact.isPrimary && <Chip size="small" color="primary" label="Primario" />}{editable && <Button size="small" color="error" onClick={() => void removeContact(contact.id, contact.version)}>Retirar</Button>}</Stack></Box>)}</Stack>}</CardContent></Card>

    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Documentos privados</Typography>{editable && <Stack direction="row" spacing={1}><TextField select size="small" value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)}><MenuItem value="AUTHORIZATION_LETTER">Carta de autorización</MenuItem><MenuItem value="SUPPORTING_DOCUMENT">Documento de soporte</MenuItem></TextField><Button component="label" startIcon={<CloudUploadIcon />} variant="outlined">Cargar<input ref={fileInput} hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} /></Button></Stack>}</Box>
      {documents.length === 0 ? <Alert severity="warning">No existen documentos.</Alert> : <Stack spacing={1}>{documents.map((document) => <Box key={document.id} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}><Box><Typography sx={{ fontWeight: 700 }}>{document.fileName}</Typography><Typography variant="body2" color="text.secondary">{document.documentType} · {formatBytes(document.sizeBytes)} · versión {document.version}</Typography></Box><Chip size="small" label={document.status} color={document.status === 'VALID' ? 'success' : document.status === 'REJECTED' ? 'error' : 'default'} /></Box><Stack direction="row" spacing={1} sx={{ mt: 1 }}>{document.status !== 'ARCHIVED' && <Button size="small" startIcon={<DownloadIcon />} onClick={() => void download(document.id)}>Descarga temporal</Button>}{reviewer && document.status === 'PENDING' && <><Button size="small" color="success" onClick={() => void documentAction(document, 'validate')}>Validar</Button><Button size="small" color="error" onClick={() => setRejecting(document)}>Rechazar</Button></>}{archiveAllowed && document.status === 'REJECTED' && <Button size="small" color="warning" onClick={() => void documentAction(document, 'archive')}>Archivar</Button>}</Stack>{document.rejectionReason && <Alert severity="error" sx={{ mt: 1 }}>{document.rejectionReason}</Alert>}</Box>)}</Stack>}
    </CardContent></Card>

    {editable && submitIssue && <Alert severity="info">Para enviar: {submitIssue}</Alert>}
    {editable && !submitIssue && <Button size="large" variant="contained" startIcon={<SendIcon />} onClick={() => setSubmitOpen(true)}>Enviar solicitud</Button>}

    <Dialog open={contactOpen} onClose={() => setContactOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Vincular contacto real</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><Stack direction="row" spacing={1}><TextField fullWidth label="Nombre o correo" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} /><Button onClick={() => void searchContacts()}>Buscar</Button></Stack>{contacts.map((contact) => <FormControlLabel key={contact.id} control={<Radio checked={selectedContact?.id === contact.id} onChange={() => setSelectedContact(contact)} />} label={`${contact.fullName} · ${contact.identityDocumentMasked || 'sin documento'}`} />)}<TextField select label="Tipo de relación" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)}>{relationshipTypes.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField><FormControlLabel control={<Radio checked={isPrimary} onClick={() => setIsPrimary((value) => !value)} />} label="Contacto primario" /><Alert severity="info">Si el contacto no aparece, vincúlelo primero a la empresa o establecimiento mediante el flujo seguro del Core.</Alert></Stack></DialogContent><DialogActions><Button onClick={() => setContactOpen(false)}>Cancelar</Button><Button variant="contained" onClick={() => void addContact()}>Vincular</Button></DialogActions></Dialog>

    <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth><DialogTitle>Rechazar documento</DialogTitle><DialogContent><TextField fullWidth multiline minRows={3} label="Motivo" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setRejecting(null)}>Cancelar</Button><Button color="error" variant="contained" onClick={() => void reject()}>Rechazar</Button></DialogActions></Dialog>
    <ConfirmDialog open={submitOpen} title="Enviar solicitud" message="El Core validará que exista una carta válida y exactamente un contacto primario. Después del envío quedará en solo lectura." confirmText="Enviar" variant="info" loading={submitting} onClose={() => setSubmitOpen(false)} onConfirm={() => void submit()} />
  </Stack>
}
