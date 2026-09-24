import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { establishmentsApi, type Establishment } from '../../api/resources'
import { isStaleVersion, routeForError, supportMessage } from '../../api/presentation'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ContactRelationsPanel } from '../../components/ContactRelationsPanel'
import { OperationalProfilesPanel } from '../../components/OperationalProfilesPanel'
import { useNotification } from '../../components/NoticeProvider'
import { ReauthenticationCancelledError, useSession } from '../../session/SessionContext'
import { canEditEstablishment } from '../../access/resourceRules'

export const EstablishmentDetailPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { showError, showSuccess } = useNotification()
  const { runWithReauthentication } = useSession()
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canEdit = establishment ? canEditEstablishment(user, establishment.companyId) : false

  const load = useCallback(async () => {
    setLoading(true)
    try { setEstablishment(await establishmentsApi.get(id)); setStale(false) }
    catch (error) { const route = routeForError(error); if (route) navigate(route, { replace: true }); else showError(supportMessage(error, 'No fue posible cargar el establecimiento.')) }
    finally { setLoading(false) }
  }, [id, navigate, showError])

  useEffect(() => { void load() }, [load])

  const update = async () => {
    if (!establishment) return
    try {
      const updated = await establishmentsApi.update(establishment.id, {
        version: establishment.version, name: establishment.name, establishmentTypeCode: establishment.establishmentTypeCode,
        address: establishment.address, provinceCode: establishment.provinceCode, municipalityCode: establishment.municipalityCode,
        healthJurisdictionCode: establishment.healthJurisdictionCode, sanitaryPermitNumber: establishment.sanitaryPermitNumber,
        sanitaryPermitExpiresAt: establishment.sanitaryPermitExpiresAt, operationsStartedAt: establishment.operationsStartedAt,
      })
      setEstablishment(updated); setStale(false); showSuccess('Establecimiento actualizado correctamente.')
    } catch (error) { if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible guardar.')) }
  }

  const deactivate = async () => {
    if (!establishment) return
    try {
      setEstablishment(await runWithReauthentication(() => establishmentsApi.deactivate(establishment.id, establishment.version)))
      setConfirmOpen(false)
      showSuccess('Establecimiento desactivado.')
    } catch (error) { if (error instanceof ReauthenticationCancelledError) return; if (isStaleVersion(error)) setStale(true); else showError(supportMessage(error, 'No fue posible desactivar.')) }
  }

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
  if (!establishment) return null
  const editable = canEdit && establishment.status === 'ACTIVE'

  return <Stack spacing={3}>
    <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/directorio/establecimientos')}>Establecimientos</Button><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{establishment.name}</Typography><Typography color="text.secondary">{establishment.companyLegalName} · Versión {establishment.version}</Typography></Box><Chip color={establishment.status === 'ACTIVE' ? 'success' : 'default'} label={establishment.status} /></Box></Box>
    {stale && <Alert severity="warning" action={<Button onClick={() => void load()}>Recargar recurso</Button>}>El recurso cambió en el servidor. Los valores editados se conservaron.</Alert>}
    <Card sx={{ border: '1px solid #E2E8F0' }}><CardContent><Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Datos del establecimiento</Typography><Stack spacing={2}>
      <TextField label="Nombre" disabled={!editable} value={establishment.name} onChange={(event) => setEstablishment({ ...establishment, name: event.target.value })} />
      <TextField label="Tipo" disabled={!editable} value={establishment.establishmentTypeCode || ''} onChange={(event) => setEstablishment({ ...establishment, establishmentTypeCode: event.target.value || null })} />
      <TextField label="Dirección" disabled={!editable} value={establishment.address || ''} onChange={(event) => setEstablishment({ ...establishment, address: event.target.value || null })} />
      <TextField label="Provincia" disabled={!editable} value={establishment.provinceCode || ''} onChange={(event) => setEstablishment({ ...establishment, provinceCode: event.target.value || null })} />
      <TextField label="Municipio" disabled={!editable} value={establishment.municipalityCode || ''} onChange={(event) => setEstablishment({ ...establishment, municipalityCode: event.target.value || null })} />
      <TextField label="Jurisdicción sanitaria" disabled={!editable} value={establishment.healthJurisdictionCode || ''} onChange={(event) => setEstablishment({ ...establishment, healthJurisdictionCode: event.target.value || null })} />
      <TextField label="Permiso sanitario" disabled={!editable} value={establishment.sanitaryPermitNumber || ''} onChange={(event) => setEstablishment({ ...establishment, sanitaryPermitNumber: event.target.value || null })} />
      <TextField type="date" label="Vencimiento del permiso" disabled={!editable} value={establishment.sanitaryPermitExpiresAt || ''} onChange={(event) => setEstablishment({ ...establishment, sanitaryPermitExpiresAt: event.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField type="date" label="Inicio de operaciones" disabled={!editable} value={establishment.operationsStartedAt || ''} onChange={(event) => setEstablishment({ ...establishment, operationsStartedAt: event.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
      {editable && <Stack direction="row" spacing={1}><Button variant="contained" startIcon={<SaveIcon />} onClick={() => void update()}>Guardar</Button><Button color="error" variant="outlined" onClick={() => setConfirmOpen(true)}>Desactivar</Button></Stack>}
    </Stack></CardContent></Card>
    <ContactRelationsPanel entity="establishment" entityId={establishment.id} canEdit={editable} />
    <OperationalProfilesPanel establishmentId={establishment.id} canCreate={editable} />
    <ConfirmDialog open={confirmOpen} title="Desactivar establecimiento" message="El establecimiento quedará inactivo y la operación requiere reautenticación reciente." confirmText="Desactivar" variant="danger" onClose={() => setConfirmOpen(false)} onConfirm={() => void deactivate()} />
  </Stack>
}
