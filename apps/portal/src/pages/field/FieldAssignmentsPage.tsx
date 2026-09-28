import { displayLabel } from '../../api/displayLabels'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { type CoreInspection } from '@ebr-bpm/core-client'
import { core } from '../../api/core'
import { operationApi, type Assignment } from '../../api/operation'
import { listOfflinePackages } from '../../offline/vault'
import { useSession } from '../../session/SessionContext'

export function FieldAssignmentsPage() {
  const { user, unlockVaultOnline } = useSession()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [inspections, setInspections] = useState<CoreInspection[]>([])
  const [vaultReady, setVaultReady] = useState(false)
  const [page, setPage] = useState(0)
  const [assignmentPage, setAssignmentPage] = useState(0)
  const [inspectionTotal, setInspectionTotal] = useState(0)
  const [assignmentTotal, setAssignmentTotal] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [password, setPassword] = useState('')
  const load = useCallback(async () => {
    if (!user) return
    try {
      const scope = user.roleCode === 'EVALUATOR' ? `&evaluatorUserId=${encodeURIComponent(user.id)}` : ''
      const [a, i] = await Promise.all([
        operationApi.assignments({ page: assignmentPage + 1, limit: 20, active: true }),
        core.request<CoreInspection[]>(`/v1/inspections?page=${page + 1}&limit=20${scope}`, { cache: 'no-store' }),
      ])
      setAssignments(a.data.filter((item) => user.roleCode === 'UNIVERSAL' || item.evaluator.id === user.id))
      setAssignmentTotal(a.meta.total ?? a.data.length)
      setInspections(i.data)
      setInspectionTotal(i.meta.total ?? i.data.length)
      try { await listOfflinePackages(user.id); setVaultReady(true) } catch { setVaultReady(false) }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las inspecciones.') }
  }, [user, page, assignmentPage])
  useEffect(() => { void load() }, [load])
  const create = async (caseId: string) => {
    setBusy(caseId); setError('')
    try { await core.request(`/v1/cases/${encodeURIComponent(caseId)}/inspections`, { method: 'POST', body: '{}' }); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo crear la inspección.') }
    finally { setBusy('') }
  }
  return <Stack spacing={2}>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>Mis inspecciones</Typography>
    <Typography>Abra una inspección con conexión para preparar automáticamente su trabajo sin conexión. Los cambios se guardan cifrados en este dispositivo y se envían al recuperar la conexión.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {!vaultReady && <Card><CardContent><Typography variant="h6">Desbloquear trabajo local</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>Tras recargar, confirme su contraseña para abrir el trabajo guardado en este dispositivo. Si cambió, recupere primero los datos en Mi cuenta.</Typography>
      <input aria-label="Contraseña del vault" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button disabled={!password} onClick={() => void unlockVaultOnline(password).then(() => { setPassword(''); void load() }).catch((caught: Error) => setError(caught.message))}>Desbloquear</Button>
    </CardContent></Card>}
    <Card><CardContent><Typography variant="h6">Inspecciones existentes</Typography>
      <Table><TableHead><TableRow><TableCell>Establecimiento</TableCell><TableCell>Estado</TableCell><TableCell>Versión</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead><TableBody>
        {inspections.map((item) => <TableRow key={item.id}><TableCell>{item.establishmentName ?? item.caseId}</TableCell><TableCell><Chip size="small" label={displayLabel(item.status)} /></TableCell><TableCell>{item.version}</TableCell><TableCell>
          <Button component={Link} to={`/campo/inspecciones/${item.id}`}>Abrir</Button>
        </TableCell></TableRow>)}
      </TableBody></Table><TablePagination component="div" count={inspectionTotal} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, next) => setPage(next)} /></CardContent></Card>
    <Card><CardContent><Typography variant="h6">Asignaciones activas sin inspección editable</Typography>
      {assignments.filter((item) => item.case.status === 'ASSIGNED' && !item.hasEditableInspection && !inspections.some((inspection) => inspection.caseId === item.caseId)).map((item) =>
        <Button key={item.id} disabled={busy === item.caseId} onClick={() => void create(item.caseId)}>Crear inspección: {item.caseId}</Button>)}
      <TablePagination component="div" count={assignmentTotal} page={assignmentPage} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, next) => setAssignmentPage(next)} />
    </CardContent></Card>
  </Stack>
}
