import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TablePagination, TextField, Typography } from '@mui/material'
import { requestsApi, type PendingDocument } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { useNotification } from '../../components/NoticeProvider'

export function DocumentReviewPage() {
  const navigate = useNavigate()
  const { showError, showSuccess } = useNotification()
  const [items, setItems] = useState<PendingDocument[]>([])
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState<PendingDocument | null>(null)
  const [reason, setReason] = useState('')
  const [stale, setStale] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await requestsApi.pendingDocuments({ page: page + 1, limit })
      setItems(result.data)
      setTotal(result.meta.total ?? result.data.length)
      setStale(false)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar la validación documental.')) }
    finally { setLoading(false) }
  }, [page, limit, navigate, showError])
  useEffect(() => { void load() }, [load])
  const validate = async (item: PendingDocument) => {
    try { await requestsApi.validateDocument(item.requestId, item.id, item.version); showSuccess('Documento validado.'); await load() }
    catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible validar el documento.')) }
  }
  const reject = async () => {
    if (!rejecting || !reason.trim()) return
    try { await requestsApi.rejectDocument(rejecting.requestId, rejecting.id, rejecting.version, reason.trim()); setRejecting(null); setReason(''); showSuccess('Documento rechazado.'); await load() }
    catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible rechazar el documento.')) }
  }
  const download = async (item: PendingDocument) => {
    try { const { signedUrl } = await requestsApi.downloadUrl(item.requestId, item.id); window.open(signedUrl, '_blank', 'noopener,noreferrer') }
    catch (error) { showError(supportMessage(error, 'No fue posible obtener la descarga temporal.')) }
  }
  return <Stack spacing={2}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Validación documental</Typography><Typography color="text.secondary">Documentos pendientes de solicitudes en borrador.</Typography></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Recargar</Button>}>La versión del documento cambió. Recargue antes de decidir.</Alert>}
    {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : items.length === 0 ? <Alert severity="info">No hay documentos pendientes en esta página.</Alert> : items.map((item) => <Card key={item.id}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}><Box><Typography sx={{ fontWeight: 700 }}>{item.fileName}</Typography><Typography variant="body2">{item.establishmentName} · {item.requestType}</Typography><Typography variant="caption">{item.documentType} · versión {item.version}</Typography></Box><Chip label="PENDIENTE" color="warning" /></Stack><Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}><Button onClick={() => void download(item)}>Descargar</Button><Button onClick={() => navigate(`/solicitudes/${item.requestId}`)}>Ver solicitud</Button><Button color="success" onClick={() => void validate(item)}>Validar</Button><Button color="error" onClick={() => { setRejecting(item); setReason('') }}>Rechazar</Button></Stack></CardContent></Card>)}
    <TablePagination component="div" count={total} page={page} rowsPerPage={limit} rowsPerPageOptions={[10, 20]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(event) => { setLimit(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Documentos por página:" />
    <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} fullWidth><DialogTitle>Rechazar documento</DialogTitle><DialogContent><TextField fullWidth multiline minRows={3} label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setRejecting(null)}>Cancelar</Button><Button color="error" disabled={!reason.trim()} onClick={() => void reject()}>Rechazar</Button></DialogActions></Dialog>
  </Stack>
}
