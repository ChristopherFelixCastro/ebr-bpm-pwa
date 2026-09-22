import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { companiesApi, establishmentsApi, requestsApi, type Company, type Establishment } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'

export const RequestFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showError, showSuccess } = useNotification()
  const [companies, setCompanies] = useState<Company[]>([])
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [companyId, setCompanyId] = useState(currentUser?.companyId ?? '')
  const [establishmentId, setEstablishmentId] = useState('')
  const [requestType, setRequestType] = useState('REGISTRATION')
  const [reason, setReason] = useState('')
  const [observations, setObservations] = useState('')
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stale, setStale] = useState(false)
  const isGlobal = currentUser?.roleCode === 'ADMIN' || currentUser?.roleCode === 'UNIVERSAL'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let resolvedCompanyId = currentUser?.companyId ?? ''
      if (id) {
        const request = await requestsApi.get(id)
        if (request.status !== 'DRAFT') { navigate(`/requests/${id}`, { replace: true }); return }
        resolvedCompanyId = request.companyId
        setCompanyId(request.companyId); setEstablishmentId(request.establishmentId); setRequestType(request.requestType); setReason(request.reason); setObservations(request.observations || ''); setVersion(request.version)
      }
      const [companyResult, establishmentResult] = await Promise.all([
        isGlobal ? companiesApi.list({ page: 1, limit: 100, status: 'ACTIVE' }) : Promise.resolve({ data: [] as Company[], meta: { correlationId: '' } }),
        establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE', ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}) }),
      ])
      setCompanies(companyResult.data)
      setEstablishments(establishmentResult.data)
      setStale(false)
    } catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el formulario.')) }
    finally { setLoading(false) }
  }, [currentUser?.companyId, id, isGlobal, navigate, showError])

  useEffect(() => { void load() }, [load])

  const reloadEstablishments = async (nextCompanyId: string) => {
    setCompanyId(nextCompanyId); setEstablishmentId('')
    try { setEstablishments((await establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE', companyId: nextCompanyId })).data) }
    catch (error) { showError(supportMessage(error, 'No fue posible cargar los establecimientos.')) }
  }

  const save = async () => {
    if (!establishmentId || !requestType.trim() || !reason.trim()) return showError('Establecimiento, tipo y motivo son obligatorios.')
    setSaving(true)
    try {
      if (id && version) {
        const updated = await requestsApi.update(id, { version, establishmentId, requestType: requestType.trim(), reason: reason.trim(), observations: observations.trim() || null })
        setVersion(updated.version); setStale(false); showSuccess('Borrador actualizado.'); navigate(`/requests/${id}`)
      } else {
        const created = await requestsApi.create({ ...(isGlobal ? { companyId } : {}), establishmentId, requestType: requestType.trim(), reason: reason.trim(), observations: observations.trim() || null })
        showSuccess('Borrador creado con UUID real.'); navigate(`/requests/${created.id}`, { replace: true })
      }
    } catch (error) { if (isStaleVersion(error)) setStale(true); else { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible guardar el borrador.')) } }
    finally { setSaving(false) }
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>

  return <Stack spacing={3}>
    <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate(id ? `/requests/${id}` : '/requests')}>Volver</Button><Typography variant="h5" sx={{ fontWeight: 800 }}>{id ? 'Editar borrador' : 'Nueva solicitud BPM'}</Typography><Typography color="text.secondary">La solicitud se crea inicialmente en estado DRAFT.</Typography></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Recargar recurso</Button>}>La versión cambió en el servidor. Los datos escritos permanecen en el formulario.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Stack spacing={2}>
      {isGlobal && <TextField select label="Empresa" required value={companyId} onChange={(event) => void reloadEstablishments(event.target.value)}>{companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.legalName}</MenuItem>)}</TextField>}
      <TextField select label="Establecimiento" required value={establishmentId} onChange={(event) => setEstablishmentId(event.target.value)} disabled={!companyId && isGlobal}>{establishments.map((establishment) => <MenuItem key={establishment.id} value={establishment.id}>{establishment.name}</MenuItem>)}</TextField>
      <TextField label="Tipo de solicitud" required value={requestType} onChange={(event) => setRequestType(event.target.value)} />
      <TextField label="Motivo" required multiline minRows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
      <TextField label="Observaciones" multiline minRows={3} value={observations} onChange={(event) => setObservations(event.target.value)} />
      <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={() => void save()}>{id ? 'Guardar borrador' : 'Crear borrador'}</Button>
    </Stack></CardContent></Card>
  </Stack>
}
