import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
} from '@mui/material'

import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AddAlertIcon from '@mui/icons-material/AddAlert'
import HistoryIcon from '@mui/icons-material/History'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import { useNavigate } from 'react-router-dom'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  CoordinatorCase,
  DashboardSummary,
  Inspection,
  ScheduleHistory,
} from '../../api/types'

function isSameDay(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  )
}

function getStartOfWeek(
  date: Date,
): Date {
  const result = new Date(date)
  const day = result.getDay()

  result.setDate(
    result.getDate() - day,
  )

  result.setHours(0, 0, 0, 0)

  return result
}

function getEndOfWeek(
  date: Date,
): Date {
  const result =
    getStartOfWeek(date)

  result.setDate(
    result.getDate() + 7,
  )

  return result
}

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return 'Sin fecha'
  }

  return new Date(
    value,
  ).toLocaleString()
}

function DashboardPage() {
  const navigate = useNavigate()

  const [
    summary,
    setSummary,
  ] =
    useState<DashboardSummary | null>(
      null,
    )

  const [
    cases,
    setCases,
  ] = useState<CoordinatorCase[]>([])

  const [
    inspections,
    setInspections,
  ] = useState<Inspection[]>([])

  const [
    scheduleHistory,
    setScheduleHistory,
  ] = useState<ScheduleHistory[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        summaryData,
        caseData,
        inspectionData,
        historyData,
      ] = await Promise.all([
        coordinatorApi.getDashboard(),
        coordinatorApi.getCases(),
        coordinatorApi.getInspections(),
        coordinatorApi.getScheduleHistory(),
      ])

      setSummary(summaryData)
      setCases(caseData)
      setInspections(
        inspectionData,
      )
      setScheduleHistory(
        historyData,
      )
    } catch {
      setError(
        'No fue posible cargar la información del Dashboard.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadDashboard()
    })
  }, [])

  const dashboardData =
    useMemo(() => {
      const now = new Date()

      const startOfWeek =
        getStartOfWeek(now)

      const endOfWeek =
        getEndOfWeek(now)

      const activeInspections =
        inspections.filter(
          (inspection) =>
            inspection.status !==
            'CANCELADA',
        )

      const todayInspections =
        activeInspections.filter(
          (inspection) => {
            if (
              !inspection.scheduledAt
            ) {
              return false
            }

            return isSameDay(
              new Date(
                inspection.scheduledAt,
              ),
              now,
            )
          },
        )

      const weekInspections =
        activeInspections.filter(
          (inspection) => {
            if (
              !inspection.scheduledAt
            ) {
              return false
            }

            const scheduledDate =
              new Date(
                inspection.scheduledAt,
              )

            return (
              scheduledDate >=
                startOfWeek &&
              scheduledDate <
                endOfWeek
            )
          },
        )

      const pendingLapch =
        cases.filter(
          (caseData) =>
            caseData.origin ===
              'ALERTA_LAPCH' &&
            caseData.status !==
              'NO_PROCEDE' &&
            caseData.status !==
              'REMITIDO' &&
            caseData.status !==
              'CANCELADO' &&
            caseData.status !==
              'PROGRAMADO',
        )

      const pendingComplaints =
        cases.filter(
          (caseData) =>
            caseData.origin ===
              'DENUNCIA' &&
            caseData.status !==
              'NO_PROCEDE' &&
            caseData.status !==
              'REMITIDO' &&
            caseData.status !==
              'CANCELADO' &&
            caseData.status !==
              'PROGRAMADO',
        )

      const recentScheduleChanges =
        [...scheduleHistory]
          .filter(
            (record) =>
              record.action ===
                'REPROGRAMACION' ||
              record.action ===
                'CANCELACION',
          )
          .sort(
            (a, b) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          )
          .slice(0, 5)

      const conflictInspections =
        activeInspections.filter(
          (inspection) =>
            inspection
              .conflictAcknowledged,
        )

      return {
        todayInspections,
        weekInspections,
        pendingLapch,
        pendingComplaints,
        recentScheduleChanges,
        conflictInspections,
      }
    }, [
      cases,
      inspections,
      scheduleHistory,
    ])

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!summary) {
    return (
      <Alert severity="error">
        {error ||
          'No fue posible cargar el Dashboard.'}
      </Alert>
    )
  }

  const metrics = [
    {
      label: 'Casos pendientes',
      value: summary.pendingCases,
      description:
        'Casos que requieren seguimiento.',
      icon: <FolderOpenIcon />,
      path: '/cases',
    },
    {
      label:
        'Evaluaciones programadas',
      value:
        summary.scheduledInspections,
      description:
        'Inspecciones activas programadas.',
      icon: <EventAvailableIcon />,
      path: '/calendar',
    },
    {
      label: 'Casos urgentes',
      value: summary.urgentCases,
      description:
        'Casos con prioridad urgente.',
      icon: <WarningAmberIcon />,
      path:
        '/cases?priority=Urgente',
    },
    {
      label:
        'Pendientes de asignación',
      value:
        summary.unassignedInspections,
      description:
        'Inspecciones sin técnico.',
      icon: <AssignmentLateIcon />,
      path: '/assignments',
    },
    {
      label:
        'Alertas LAPCH pendientes',
      value:
        dashboardData.pendingLapch
          .length,
      description:
        'Alertas pendientes de decisión.',
      icon: (
        <NotificationsActiveIcon />
      ),
      path:
        '/cases?origin=ALERTA_LAPCH',
    },
    {
      label:
        'Denuncias pendientes',
      value:
        dashboardData
          .pendingComplaints.length,
      description:
        'Denuncias pendientes de análisis.',
      icon: <ReportProblemIcon />,
      path:
        '/cases?origin=DENUNCIA',
    },
    {
      label: 'Programadas hoy',
      value:
        dashboardData
          .todayInspections.length,
      description:
        'Evaluaciones para el día de hoy.',
      icon: <EventNoteIcon />,
      path:
        '/calendar?view=day',
    },
    {
      label:
        'Programadas esta semana',
      value:
        dashboardData
          .weekInspections.length,
      description:
        'Evaluaciones de la semana actual.',
      icon: <CalendarMonthIcon />,
      path:
        '/calendar?view=week',
    },
  ]

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Box
            component="h1"
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#172033',
              mt: 0,
              mb: 1,
            }}
          >
            Dashboard
          </Box>

          <Box
            component="p"
            sx={{
              color: '#637083',
              mt: 0,
              mb: 0,
            }}
          >
            Resumen general de la
            operación de Coordinación.
          </Box>
        </Box>

        <Button
          variant="outlined"
          onClick={() =>
            void loadDashboard()
          }
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() =>
            setError('')
          }
        >
          {error}
        </Alert>
      )}

      <Grid
        container
        spacing={2.5}
      >
        {metrics.map((metric) => (
          <Grid
            key={metric.label}
            size={{
              xs: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border:
                  '1px solid #d9e2ec',
                borderRadius: 3,
              }}
            >
              <CardActionArea
                onClick={() =>
                  navigate(metric.path)
                }
                sx={{
                  height: '100%',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box
                        component="p"
                        sx={{
                          color:
                            '#637083',
                          mt: 0,
                          mb: 1,
                          fontWeight: 500,
                        }}
                      >
                        {metric.label}
                      </Box>

                      <Box
                        component="strong"
                        sx={{
                          display:
                            'block',
                          fontSize: '2rem',
                          color:
                            '#172033',
                        }}
                      >
                        {metric.value}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        bgcolor:
                          '#e8f1fa',
                        color:
                          '#0b2545',
                        borderRadius: 2,
                        p: 1.2,
                        display: 'flex',
                      }}
                    >
                      {metric.icon}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      mt: 2,
                      color: '#637083',
                      fontSize:
                        '0.85rem',
                    }}
                  >
                    {
                      metric.description
                    }
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          mt: 4,
          p: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            fontSize: '1.25rem',
            mt: 0,
            mb: 0.5,
            color: '#172033',
          }}
        >
          Acciones rápidas
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 2.5,
            color: '#637083',
          }}
        >
          Accesos directos a las
          operaciones principales del
          Coordinador.
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            startIcon={
              <AddAlertIcon />
            }
            onClick={() =>
              navigate('/alerts')
            }
          >
            Registrar alerta
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <ReportProblemIcon />
            }
            onClick={() =>
              navigate('/complaints')
            }
          >
            Registrar denuncia
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <EventNoteIcon />
            }
            onClick={() =>
              navigate(
                '/institutional',
              )
            }
          >
            Programación institucional
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <AssignmentIndIcon />
            }
            onClick={() =>
              navigate(
                '/assignments',
              )
            }
          >
            Asignar técnico
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <CalendarMonthIcon />
            }
            onClick={() =>
              navigate('/calendar')
            }
          >
            Calendario
          </Button>
        </Box>
      </Paper>

      <Grid
        container
        spacing={3}
        sx={{ mt: 1 }}
      >
        <Grid
          size={{
            xs: 12,
            lg: 6,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border:
                '1px solid #d9e2ec',
              borderRadius: 3,
            }}
          >
            <Box
              component="h2"
              sx={{
                fontSize:
                  '1.25rem',
                mt: 0,
                mb: 2,
              }}
            >
              Atención requerida
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Chip
                label={`${summary.urgentCases} casos urgentes`}
                color="error"
                variant="outlined"
                clickable
                onClick={() =>
                  navigate(
                    '/cases?priority=Urgente',
                  )
                }
              />

              <Chip
                label={`${summary.unassignedInspections} pendientes de asignación`}
                color="warning"
                variant="outlined"
                clickable
                onClick={() =>
                  navigate(
                    '/assignments',
                  )
                }
              />

              <Chip
                label={`${dashboardData.pendingLapch.length} alertas LAPCH pendientes`}
                color="warning"
                variant="outlined"
                clickable
                onClick={() =>
                  navigate(
                    '/cases?origin=ALERTA_LAPCH',
                  )
                }
              />

              <Chip
                label={`${dashboardData.pendingComplaints.length} denuncias pendientes`}
                color="error"
                variant="outlined"
                clickable
                onClick={() =>
                  navigate(
                    '/cases?origin=DENUNCIA',
                  )
                }
              />

              <Chip
                label={`${dashboardData.conflictInspections.length} programaciones con conflicto`}
                color="warning"
                variant="outlined"
                clickable
                onClick={() =>
                  navigate(
                    '/calendar',
                  )
                }
              />
            </Box>
          </Paper>
        </Grid>

        <Grid
          size={{
            xs: 12,
            lg: 6,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              border:
                '1px solid #d9e2ec',
              borderRadius: 3,
            }}
          >
            <Box
              component="h2"
              sx={{
                fontSize:
                  '1.25rem',
                mt: 0,
                mb: 2,
              }}
            >
              Operación de hoy
            </Box>

            {dashboardData
              .todayInspections
              .length === 0 ? (
              <Alert severity="info">
                No hay evaluaciones
                programadas para hoy.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                }}
              >
                {dashboardData.todayInspections
                  .slice(0, 4)
                  .map(
                    (
                      inspection,
                    ) => (
                      <Paper
                        key={
                          inspection.id
                        }
                        variant="outlined"
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                        }}
                      >
                        <Box
                          component="strong"
                        >
                          {
                            inspection.id
                          }
                          {' — '}
                          {
                            inspection.establishmentName
                          }
                        </Box>

                        <Box
                          sx={{
                            mt: 0.5,
                            color:
                              '#637083',
                            fontSize:
                              '0.85rem',
                          }}
                        >
                          {formatDateTime(
                            inspection.scheduledAt,
                          )}
                        </Box>
                      </Paper>
                    ),
                  )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Box
              component="h2"
              sx={{
                fontSize:
                  '1.25rem',
                m: 0,
              }}
            >
              Actividad reciente
            </Box>

            <Box
              sx={{
                color: '#637083',
                mt: 0.5,
                fontSize: '0.9rem',
              }}
            >
              Reprogramaciones y
              cancelaciones recientes.
            </Box>
          </Box>

          <Button
            endIcon={
              <ArrowForwardIcon />
            }
            onClick={() =>
              navigate(
                '/scheduling',
              )
            }
          >
            Ver programación
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {dashboardData
          .recentScheduleChanges
          .length === 0 ? (
          <Alert severity="info">
            No existen cambios
            recientes de programación.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
            }}
          >
            {dashboardData.recentScheduleChanges.map(
              (record) => (
                <Box
                  key={record.id}
                  sx={{
                    display: 'flex',
                    alignItems: {
                      xs:
                        'flex-start',
                      md: 'center',
                    },
                    justifyContent:
                      'space-between',
                    flexDirection: {
                      xs: 'column',
                      md: 'row',
                    },
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor:
                      '#f7f9fc',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems:
                        'center',
                    }}
                  >
                    <HistoryIcon
                      color="primary"
                    />

                    <Box>
                      <Box
                        component="strong"
                      >
                        {
                          record.inspectionId
                        }
                      </Box>

                      <Box
                        sx={{
                          mt: 0.3,
                          color:
                            '#637083',
                          fontSize:
                            '0.85rem',
                        }}
                      >
                        {record.reason ??
                          'Sin motivo registrado'}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 1,
                      flexWrap:
                        'wrap',
                    }}
                  >
                    <Chip
                      size="small"
                      label={
                        record.action ===
                        'REPROGRAMACION'
                          ? 'Reprogramación'
                          : 'Cancelación'
                      }
                      color={
                        record.action ===
                        'CANCELACION'
                          ? 'error'
                          : 'warning'
                      }
                      variant="outlined"
                    />

                    <Box
                      sx={{
                        color:
                          '#637083',
                        fontSize:
                          '0.8rem',
                      }}
                    >
                      {formatDateTime(
                        record.createdAt,
                      )}
                    </Box>
                  </Box>
                </Box>
              ),
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default DashboardPage
