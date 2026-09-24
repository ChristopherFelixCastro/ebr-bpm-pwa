import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Stack, TextField, Typography,
} from '@mui/material'
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { companiesApi, establishmentsApi, type Company, type Establishment, type EstablishmentCreate } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { ContactRelationsPanel } from '../../components/ContactRelationsPanel'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'
import { canEditCompany, isGlobal as hasGlobalAccess } from '../../access/resourceRules'

export const CompanyDetailPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const { runWithReauthentication } = useSession()
  const [company, setCompany] = useState<Company | null>(null)
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [establishmentOpen, setEstablishmentOpen] = useState(false)
  const [establishmentForm, setEstablishmentForm] = useState<Omit<EstablishmentCreate, 'companyId'>>({ name: '', establishmentTypeCode: null, address: null, provinceCode: null, municipalityCode: null, healthJurisdictionCode: null, sanitaryPermitNumber: null, sanitaryPermitExpiresAt: null, operationsStartedAt: null })
  const isGlobal = hasGlobalAccess(user)
  const canEdit = canEditCompany(user, id)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [companyResult, establishmentsResult] = await Promise.all([
        companiesApi.get(id),
        establishmentsApi.list({ page: 1, limit: 100, companyId: id }),
      ])
      setCompany(companyResult)
      setEstablishments(establishmentsResult.data)
      setStale(false)
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'No fue posible cargar la empresa.'))
    } finally { setLoading(false) }
  }, [id, navigate, showError])

  useEffect(() => { void load() }, [load])

  const update = async () => {
    if (!company) return
    try {
      const updated = await companiesApi.update(company.id, {
        version: company.version, legalName: company.legalName, tradeName: company.tradeName,
        rnc: company.rnc || undefined, address: company.address, phone: company.phone,
        email: company.email, economicActivityCode: company.economicActivityCode,
      })
      setCompany(updated)
      setStale(false)
      showSuccess('Empresa actualizada correctamente.')
    } catch (error) {
      if (isStaleVersion(error)) setStale(true)
      else showError(supportMessage(error, 'No fue posible actualizar la empresa.'))
    }
  }

  const deactivate = async () => {
    if (!company) return
    try {
      const updated = await runWithReauthentication(() => companiesApi.deactivate(company.id, company.version))
      setCompany(updated)
      setDeactivateOpen(false)
      showSuccess('Empresa y establecimientos activos desactivados.')
    } catch (error) {
      if (error instanceof ReauthenticationCancelledError) return
      if (isStaleVersion(error)) setStale(true)
      else showError(supportMessage(error, 'No fue posible desactivar la empresa.'))
    }
  }

  const createEstablishment = async () => {
    try {
      const created = await establishmentsApi.create({ companyId: id, ...establishmentForm })
      setEstablishmentOpen(false)
      showSuccess('Establecimiento creado correctamente.')
      navigate(`/directorio/establecimientos/${created.id}`)
    } catch (error) { showError(supportMessage(error, 'No fue posible crear el establecimiento.')) }
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!company) return null

  return <Stack spacing={3}>
    <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/directorio/empresas')}>Empresas</Button><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{company.legalName}</Typography><Typography color="text.secondary">RNC: {company.rnc || '—'} · Versión {company.version}</Typography></Box><Chip color={company.status === 'ACTIVE' ? 'success' : 'default'} label={company.status} /></Box></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Recargar recurso</Button>}>La empresa cambió en el servidor. Sus valores permanecen visibles; recargue antes de volver a guardar.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Datos empresariales</Typography><Stack spacing={2}>
      <TextField label="Razón social" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.legalName} onChange={(event) => setCompany({ ...company, legalName: event.target.value })} />
      <TextField label="Nombre comercial" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.tradeName || ''} onChange={(event) => setCompany({ ...company, tradeName: event.target.value || null })} />
      <TextField label="RNC" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.rnc || ''} onChange={(event) => setCompany({ ...company, rnc: event.target.value || null })} />
      <TextField label="Dirección" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.address || ''} onChange={(event) => setCompany({ ...company, address: event.target.value || null })} />
      <TextField label="Correo" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.email || ''} onChange={(event) => setCompany({ ...company, email: event.target.value || null })} />
      <TextField label="Teléfono" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.phone || ''} onChange={(event) => setCompany({ ...company, phone: event.target.value || null })} />
      <TextField label="Actividad económica" disabled={!canEdit || company.status !== 'ACTIVE'} value={company.economicActivityCode || ''} onChange={(event) => setCompany({ ...company, economicActivityCode: event.target.value || null })} />
      {canEdit && company.status === 'ACTIVE' && <Stack direction="row" spacing={1}><Button startIcon={<SaveIcon />} variant="contained" onClick={() => void update()}>Guardar cambios</Button>{isGlobal && <Button color="error" variant="outlined" onClick={() => setDeactivateOpen(true)}>Desactivar</Button>}</Stack>}
    </Stack></CardContent></Card>

    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Establecimientos</Typography>{canEdit && company.status === 'ACTIVE' && <Button startIcon={<AddLocationAltIcon />} onClick={() => setEstablishmentOpen(true)}>Crear establecimiento</Button>}</Box><Button size="small" onClick={() => navigate(`/directorio/establecimientos?companyId=${company.id}`)}>Ver todos con paginación</Button><Divider sx={{ mb: 2 }} />
      {establishments.length === 0 ? <Alert severity="info">No existen establecimientos registrados.</Alert> : <Stack spacing={1}>{establishments.map((item) => <Button key={item.id} onClick={() => navigate(`/directorio/establecimientos/${item.id}`)} sx={{ justifyContent: 'space-between', border: '1px solid #E2E8F0', p: 1.5 }}><span>{item.name}</span><Chip size="small" label={item.status} color={item.status === 'ACTIVE' ? 'success' : 'default'} /></Button>)}</Stack>}
    </CardContent></Card>

    <ContactRelationsPanel entity="company" entityId={company.id} canEdit={canEdit && company.status === 'ACTIVE'} />

    <Dialog open={establishmentOpen} onClose={() => setEstablishmentOpen(false)} maxWidth="md" fullWidth><DialogTitle>Crear establecimiento</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="Nombre" required value={establishmentForm.name} onChange={(event) => setEstablishmentForm({ ...establishmentForm, name: event.target.value })} />
      <TextField label="Tipo" value={establishmentForm.establishmentTypeCode || ''} onChange={(event) => setEstablishmentForm({ ...establishmentForm, establishmentTypeCode: event.target.value || null })} />
      <TextField label="Dirección" value={establishmentForm.address || ''} onChange={(event) => setEstablishmentForm({ ...establishmentForm, address: event.target.value || null })} />
      <TextField label="Provincia" value={establishmentForm.provinceCode || ''} onChange={(event) => setEstablishmentForm({ ...establishmentForm, provinceCode: event.target.value || null })} />
      <TextField label="Municipio" value={establishmentForm.municipalityCode || ''} onChange={(event) => setEstablishmentForm({ ...establishmentForm, municipalityCode: event.target.value || null })} />
      <TextField label="Permiso sanitario" value={establishmentForm.sanitaryPermitNumber || ''} onChange={(event) => setEstablishmentForm({ ...establishmentForm, sanitaryPermitNumber: event.target.value || null })} />
    </Stack></DialogContent><DialogActions><Button onClick={() => setEstablishmentOpen(false)}>Cancelar</Button><Button variant="contained" onClick={() => void createEstablishment()}>Crear</Button></DialogActions></Dialog>

    <ConfirmDialog open={deactivateOpen} title="Desactivar empresa" message="La empresa y sus establecimientos activos quedarán inactivos. Se solicitará reautenticación reciente." confirmText="Desactivar" variant="danger" onClose={() => setDeactivateOpen(false)} onConfirm={() => void deactivate()} />
  </Stack>
}
