import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  Alert,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import BusinessIcon from '@mui/icons-material/Business'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import StoreIcon from '@mui/icons-material/Store'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { StatusChip } from '../../components/StatusChip'
import { requestsApi, companiesApi, establishmentsApi, type CompanyRequest, type Company } from '../../api/resources'
import { supportMessage, routeForError } from '../../api/presentation'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { showError } = useNotification()

  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<CompanyRequest[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [totalCompanies, setTotalCompanies] = useState<number>(0)
  const [totalEstablishments, setTotalEstablishments] = useState<number>(0)

  const isGlobal = currentUser?.roleCode === 'ADMIN' || currentUser?.roleCode === 'UNIVERSAL'

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const [reqsResult, compsResult, estsResult] = await Promise.all([
        requestsApi.list({ page: 1, limit: 20 }),
        isGlobal
          ? companiesApi.list({ page: 1, limit: 100, status: 'ACTIVE' })
          : currentUser?.companyId
            ? companiesApi.get(currentUser.companyId).then((c) => ({ data: [c], meta: { total: 1, page: 1, limit: 1, correlationId: '' } }))
            : Promise.resolve({ data: [] as Company[], meta: { total: 0, page: 1, limit: 1, correlationId: '' } }),
        establishmentsApi.list({ page: 1, limit: 100, status: 'ACTIVE' }),
      ])

      setRequests(reqsResult.data)
      setTotalCompanies(compsResult.meta?.total ?? compsResult.data.length)
      setTotalEstablishments(estsResult.meta?.total ?? estsResult.data.length)

      if (!isGlobal && compsResult.data.length > 0) {
        setCompany(compsResult.data[0])
      }
    } catch (error) {
      const route = routeForError(error)
      if (route) navigate(route, { replace: true })
      else showError(supportMessage(error, 'Error al cargar datos del panel'))
    } finally {
      setLoading(false)
    }
  }, [currentUser, isGlobal, navigate, showError])


  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1E3A8A' }} />
      </Box>
    )
  }

  const draftRequests = requests.filter((r) => r.status === 'DRAFT').length
  const pendingRequests = requests.filter((r) => r.status === 'PENDING_ASSIGNMENT').length

  return (
    <Box>
      {/* Top Welcome Banner */}
      <Box
        sx={{
          p: 3.5,
          mb: 3.5,
          borderRadius: 2.5,
          bgcolor: '#1E3A8A',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF', mb: 0.5 }}>
            Bienvenido, {currentUser?.fullName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#BFDBFE' }}>
            {isGlobal
              ? 'Panel de control institucional para administración central de EBR/BPM'
              : `Portal administrativo corporativo para ${company?.legalName || 'su empresa'}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/requests/new')}
            sx={{
              bgcolor: '#2563EB',
              '&:hover': { bgcolor: '#1D4ED8' },
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Nueva Solicitud
          </Button>
        </Stack>
      </Box>

      {/* KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Solicitudes
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#EFF6FF', color: '#1E3A8A' }}>
                  <AssignmentIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A' }}>
                {requests.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                Trámites registrados en el Core
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Borradores
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F1F5F9', color: '#64748B' }}>
                  <HourglassEmptyIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#64748B' }}>
                {draftRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                En preparación para envío
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Pendiente Asignación
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#FEF3C7', color: '#D97706' }}>
                  <HourglassEmptyIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706' }}>
                {pendingRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                Radicadas con carta válida
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  {isGlobal ? 'Empresas Activas' : 'Establecimientos'}
                </Typography>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#DCFCE7', color: '#15803D' }}>
                  {isGlobal ? <BusinessIcon sx={{ fontSize: 20 }} /> : <StoreIcon sx={{ fontSize: 20 }} />}
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#15803D' }}>
                {isGlobal ? totalCompanies : totalEstablishments}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                {isGlobal ? 'Entidades registradas activas' : 'Locales y plantas en su alcance'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tables section */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Solicitudes Recientes
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569' }}>
                  Trámites de registro y renovación radicados en plataforma
                </Typography>
              </Box>
              <Button size="small" onClick={() => navigate('/requests')} sx={{ color: '#1E3A8A', fontWeight: 600 }}>
                Ver todas
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Establecimiento / ID</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#64748B' }}>
                          No hay solicitudes registradas en su alcance.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.slice(0, 5).map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                            {req.establishmentName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            ID: {req.id.slice(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{req.requestType}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={req.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => navigate(`/requests/${req.id}`)}
                            sx={{ fontSize: '0.75rem', py: 0.4 }}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
              Estado del Módulo
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
              Sesión conectada al Core EBR/BPM con control RBAC de servidor.
            </Typography>

            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: '0.82rem' }}>
              <strong>Ciclo de Inspección:</strong> El módulo de inspecciones en campo, cálculos algorítmicos e informes oficiales se encuentra en desarrollo por el equipo técnico del Core.
            </Alert>

            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Rol activo: <strong>{currentUser?.roleCode}</strong>
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
