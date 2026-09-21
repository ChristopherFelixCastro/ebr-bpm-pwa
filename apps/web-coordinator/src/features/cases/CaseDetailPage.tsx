import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  TextField,
} from '@mui/material'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import ForwardIcon from '@mui/icons-material/Forward'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  AssignmentHistory,
  CaseDecisionAction,
  CaseDecisionHistory,
  CaseStatus,
  CoordinatorCase,
  Evaluator,
  Inspection,
  ScheduleHistory,
} from '../../api/types'

const statusLabels: Record<CaseStatus, string> = {
  RECIBIDO: 'Recibido',
  EN_ANALISIS: 'En análisis',
  PROCEDE_EVALUACION: 'Procede evaluación',
  PROGRAMADO: 'Programado',
  NO_PROCEDE: 'No procede',
  REMITIDO: 'Remitido',
  CANCELADO: 'Cancelado',
}

const originLabels = {
  SOLICITUD_EMPRESA:
    'Solicitud de empresa',
  PROGRAMACION_INSTITUCIONAL:
    'Programación institucional',
  ALERTA_LAPCH:
    'Alerta LAPCH',
  DENUNCIA:
    'Denuncia',
}

const decisionLabels: Record<
  CaseDecisionAction,
  string
> = {
  PROCEDE_EVALUACION:
    'Procede evaluación',
  NO_PROCEDE:
    'No procede',
  REMITIDO:
    'Remitido',
}

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return 'No disponible'
  }

  return new Date(
    value,
  ).toLocaleString()
}

function CaseDetailPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [
    caseData,
    setCaseData,
  ] =
    useState<CoordinatorCase | null>(
      null,
    )

  const [
    inspections,
    setInspections,
  ] = useState<Inspection[]>([])

  const [
    evaluators,
    setEvaluators,
  ] = useState<Evaluator[]>([])

  const [
    decisionHistory,
    setDecisionHistory,
  ] =
    useState<CaseDecisionHistory[]>([])

  const [
    scheduleHistory,
    setScheduleHistory,
  ] = useState<ScheduleHistory[]>([])

  const [
    assignmentHistory,
    setAssignmentHistory,
  ] =
    useState<AssignmentHistory[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    decisionDialogOpen,
    setDecisionDialogOpen,
  ] = useState(false)

  const [
    selectedDecision,
    setSelectedDecision,
  ] =
    useState<CaseDecisionAction | null>(
      null,
    )

  const [
    justification,
    setJustification,
  ] = useState('')

  const loadCaseData = useCallback(async () => {
    if (!caseId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [
        caseResult,
        inspectionResult,
        evaluatorResult,
        decisionResult,
        scheduleResult,
        assignmentResult,
      ] = await Promise.all([
        coordinatorApi.getCaseById(
          caseId,
        ),
        coordinatorApi.getInspections(),
        coordinatorApi.getEvaluators(),
        coordinatorApi.getCaseDecisionHistory(
          caseId,
        ),
        coordinatorApi.getScheduleHistory(),
        coordinatorApi.getAssignmentHistory(),
      ])

      setCaseData(
        caseResult ?? null,
      )

      const caseInspections =
        inspectionResult.filter(
          (inspection) =>
            inspection.caseId ===
            caseId,
        )

      const inspectionIds =
        new Set(
          caseInspections.map(
            (inspection) =>
              inspection.id,
          ),
        )

      setInspections(
        caseInspections,
      )

      setEvaluators(
        evaluatorResult,
      )

      setDecisionHistory(
        decisionResult,
      )

      setScheduleHistory(
        scheduleResult.filter(
          (record) =>
            inspectionIds.has(
              record.inspectionId,
            ),
        ),
      )

      setAssignmentHistory(
        assignmentResult.filter(
          (record) =>
            inspectionIds.has(
              record.inspectionId,
            ),
        ),
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el expediente.',
      )
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadCaseData()
    })
  }, [loadCaseData])

  const activeInspection =
    useMemo(
      () =>
        inspections.find(
          (inspection) =>
            inspection.status !==
            'CANCELADA',
        ),
      [inspections],
    )

  const latestInspection =
    useMemo(() => {
      if (
        activeInspection
      ) {
        return activeInspection
      }

      return [...inspections].sort(
        (a, b) =>
          new Date(
            b.updatedAt,
          ).getTime() -
          new Date(
            a.updatedAt,
          ).getTime(),
      )[0]
    }, [
      activeInspection,
      inspections,
    ])

  const assignedEvaluator =
    useMemo(() => {
      if (
        !activeInspection
          ?.assignedEvaluatorId
      ) {
        return undefined
      }

      return evaluators.find(
        (evaluator) =>
          evaluator.id ===
          activeInspection
            .assignedEvaluatorId,
      )
    }, [
      activeInspection,
      evaluators,
    ])

  const openDecisionDialog = (
    decision: CaseDecisionAction,
  ) => {
    setSelectedDecision(
      decision,
    )
    setJustification('')
    setError('')
    setDecisionDialogOpen(
      true,
    )
  }

  const closeDecisionDialog =
    () => {
      if (saving) {
        return
      }

      setDecisionDialogOpen(
        false,
      )
      setSelectedDecision(null)
      setJustification('')
    }

  const saveDecision =
    async () => {
      if (
        !caseData ||
        !selectedDecision
      ) {
        return
      }

      if (
        !justification.trim()
      ) {
        setError(
          'Debes escribir una justificación para registrar la decisión.',
        )
        return
      }

      setSaving(true)
      setError('')

      try {
        const updated =
          await coordinatorApi.registerCaseDecision(
            {
              caseId:
                caseData.id,
              decision:
                selectedDecision,
              justification,
            },
          )

        setCaseData(updated)

        const history =
          await coordinatorApi.getCaseDecisionHistory(
            caseData.id,
          )

        setDecisionHistory(
          history,
        )

        setMessage(
          `Decisión registrada: ${
            decisionLabels[
              selectedDecision
            ]
          }.`,
        )

        setDecisionDialogOpen(
          false,
        )
        setSelectedDecision(
          null,
        )
        setJustification('')
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'No fue posible registrar la decisión.',
        )
      } finally {
        setSaving(false)
      }
    }

  const getEvaluatorName = (
    evaluatorId?: string,
  ) => {
    if (!evaluatorId) {
      return 'Sin técnico'
    }

    return (
      evaluators.find(
        (evaluator) =>
          evaluator.id ===
          evaluatorId,
      )?.fullName ??
      evaluatorId
    )
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 300,
          display: 'flex',
          justifyContent:
            'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!caseData) {
    return (
      <Box>
        <Alert severity="error">
          {error ||
            'No se encontró el caso solicitado.'}
        </Alert>

        <Button
          sx={{ mt: 2 }}
          startIcon={
            <ArrowBackIcon />
          }
          onClick={() =>
            navigate('/cases')
          }
        >
          Volver a casos
        </Button>
      </Box>
    )
  }

  const canRegisterDecision =
    caseData.status !==
      'PROGRAMADO' &&
    caseData.status !==
      'CANCELADO'

  return (
    <Box>
      <Button
        startIcon={
          <ArrowBackIcon />
        }
        onClick={() =>
          navigate('/cases')
        }
        sx={{ mb: 2 }}
      >
        Volver a casos
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent:
            'space-between',
          gap: 2,
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          mb: 1,
        }}
      >
        <Box
          component="h1"
          sx={{
            fontSize: '2rem',
            color: '#172033',
            m: 0,
          }}
        >
          Caso {caseData.id}
        </Box>

        <Chip
          label={
            statusLabels[
              caseData.status
            ]
          }
          color={
            caseData.status ===
              'PROCEDE_EVALUACION' ||
            caseData.status ===
              'PROGRAMADO'
              ? 'success'
              : caseData.status ===
                    'NO_PROCEDE' ||
                  caseData.status ===
                    'CANCELADO'
                ? 'error'
                : caseData.status ===
                    'REMITIDO'
                  ? 'warning'
                  : 'default'
          }
        />
      </Box>

      <Box
        component="p"
        sx={{
          color: '#637083',
          mt: 0,
          mb: 3,
        }}
      >
        Expediente, decisión,
        programación, asignación y
        trazabilidad del caso.
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

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            mt: 0,
            fontSize:
              '1.25rem',
          }}
        >
          Información general
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
            gap: 3,
          }}
        >
          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Origen
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {
                originLabels[
                  caseData.origin
                ]
              }
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Prioridad
            </Box>

            <Chip
              label={
                caseData.priority
              }
              size="small"
              variant="outlined"
              color={
                caseData.priority ===
                'Urgente'
                  ? 'error'
                  : caseData.priority ===
                      'Alta'
                    ? 'warning'
                    : 'default'
              }
            />
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Empresa
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {
                caseData.companyName
              }
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Establecimiento
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {
                caseData.establishmentName
              }
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Dirección
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {
                caseData.establishmentAddress
              }
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Referencia
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {caseData.referenceCode ||
                'Sin referencia'}
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Fecha de creación
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {formatDateTime(
                caseData.createdAt,
              )}
            </Box>
          </Box>

          <Box>
            <Box
              component="strong"
              sx={{
                display:
                  'block',
                mb: 0.5,
              }}
            >
              Última actualización
            </Box>

            <Box
              sx={{
                color: '#637083',
              }}
            >
              {formatDateTime(
                caseData.updatedAt,
              )}
            </Box>
          </Box>
        </Box>

        <Divider
          sx={{
            my: 3,
          }}
        />

        <Box
          component="strong"
          sx={{
            display: 'block',
            mb: 1,
          }}
        >
          Descripción
        </Box>

        <Box
          sx={{
            color: '#637083',
            whiteSpace:
              'pre-wrap',
          }}
        >
          {caseData.description ||
            'Este caso no tiene una descripción registrada.'}
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            mt: 0,
            mb: 1,
            fontSize:
              '1.25rem',
          }}
        >
          Decisión de Coordinación
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          Toda decisión requiere una
          justificación y queda
          registrada en el historial
          del expediente.
        </Box>

        {canRegisterDecision ? (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              color="success"
              disabled={saving}
              startIcon={
                <CheckCircleIcon />
              }
              onClick={() =>
                openDecisionDialog(
                  'PROCEDE_EVALUACION',
                )
              }
            >
              Procede
            </Button>

            <Button
              variant="outlined"
              color="error"
              disabled={saving}
              startIcon={
                <BlockIcon />
              }
              onClick={() =>
                openDecisionDialog(
                  'NO_PROCEDE',
                )
              }
            >
              No procede
            </Button>

            <Button
              variant="outlined"
              disabled={saving}
              startIcon={
                <ForwardIcon />
              }
              onClick={() =>
                openDecisionDialog(
                  'REMITIDO',
                )
              }
            >
              Remitir
            </Button>
          </Box>
        ) : (
          <Alert severity="info">
            El estado actual del caso
            no permite registrar una
            nueva decisión de
            Coordinación.
          </Alert>
        )}

        {caseData.status ===
          'PROCEDE_EVALUACION' && (
          <Box sx={{ mt: 3 }}>
            <Alert
              severity="success"
              sx={{ mb: 2 }}
            >
              El caso está aprobado
              para evaluación. El
              siguiente paso es
              programar la inspección.
            </Alert>

            <Button
              variant="contained"
              startIcon={
                <ScheduleIcon />
              }
              onClick={() =>
                navigate(
                  `/scheduling?caseId=${caseData.id}`,
                )
              }
            >
              Programar evaluación
            </Button>
          </Box>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            mt: 0,
            mb: 1,
            fontSize:
              '1.25rem',
          }}
        >
          Programación y asignación
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          Estado operativo actual del
          expediente.
        </Box>

        {!latestInspection ? (
          <Alert severity="info">
            Este caso todavía no tiene
            una inspección registrada.
          </Alert>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                },
                gap: 3,
              }}
            >
              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Inspección
                </Box>

                <Box
                  sx={{
                    color:
                      '#637083',
                  }}
                >
                  {
                    latestInspection.id
                  }
                </Box>
              </Box>

              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Estado
                </Box>

                <Chip
                  size="small"
                  label={
                    latestInspection.status
                  }
                  color={
                    latestInspection.status ===
                    'CANCELADA'
                      ? 'error'
                      : 'success'
                  }
                  variant="outlined"
                />
              </Box>

              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Inicio
                </Box>

                <Box
                  sx={{
                    color:
                      '#637083',
                  }}
                >
                  {formatDateTime(
                    latestInspection.scheduledAt,
                  )}
                </Box>
              </Box>

              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Finalización
                </Box>

                <Box
                  sx={{
                    color:
                      '#637083',
                  }}
                >
                  {formatDateTime(
                    latestInspection.scheduledEndAt,
                  )}
                </Box>
              </Box>

              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Técnico activo
                </Box>

                <Box
                  sx={{
                    color:
                      '#637083',
                  }}
                >
                  {assignedEvaluator
                    ?.fullName ||
                    (latestInspection.status ===
                    'CANCELADA'
                      ? 'Inspección cancelada'
                      : 'Sin técnico asignado')}
                </Box>
              </Box>

              <Box>
                <Box
                  component="strong"
                  sx={{
                    display:
                      'block',
                    mb: 0.5,
                  }}
                >
                  Plantilla
                </Box>

                <Box
                  sx={{
                    color:
                      '#637083',
                  }}
                >
                  {
                    latestInspection.templateVersionId
                  }
                </Box>
              </Box>
            </Box>

            {latestInspection
              .conflictAcknowledged && (
              <Alert
                severity="warning"
                sx={{ mt: 3 }}
              >
                Esta programación fue
                confirmada con un
                conflicto de horario.
                {latestInspection.conflictComment
                  ? ` Justificación: ${latestInspection.conflictComment}`
                  : ''}
              </Alert>
            )}

            {latestInspection.status ===
              'CANCELADA' &&
              latestInspection.cancellationReason && (
                <Alert
                  severity="error"
                  sx={{ mt: 3 }}
                >
                  Motivo de cancelación:{' '}
                  {
                    latestInspection.cancellationReason
                  }
                </Alert>
              )}

            {activeInspection && (
              <Box
                sx={{
                  mt: 3,
                  display: 'flex',
                  gap: 1.5,
                  flexWrap:
                    'wrap',
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={
                    <CalendarMonthIcon />
                  }
                  onClick={() =>
                    navigate(
                      '/calendar',
                    )
                  }
                >
                  Ver calendario
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    <EventRepeatIcon />
                  }
                  onClick={() =>
                    navigate(
                      `/scheduling?inspectionId=${activeInspection.id}`,
                    )
                  }
                >
                  Reprogramar
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    <AssignmentIndIcon />
                  }
                  onClick={() =>
                    navigate(
                      `/assignments?inspectionId=${activeInspection.id}`,
                    )
                  }
                >
                  Reasignar técnico
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            mt: 0,
            mb: 1,
            fontSize:
              '1.25rem',
          }}
        >
          Historial de decisiones
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          Decisiones tomadas por
          Coordinación sobre este
          expediente.
        </Box>

        {decisionHistory.length ===
        0 ? (
          <Alert severity="info">
            No existen decisiones
            registradas para este caso.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
            }}
          >
            {decisionHistory.map(
              (record) => (
                <Paper
                  key={record.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 2,
                      flexWrap:
                        'wrap',
                    }}
                  >
                    <Box>
                      <Chip
                        size="small"
                        label={
                          decisionLabels[
                            record.decision
                          ]
                        }
                        color={
                          record.decision ===
                          'PROCEDE_EVALUACION'
                            ? 'success'
                            : record.decision ===
                                'NO_PROCEDE'
                              ? 'error'
                              : 'warning'
                        }
                        variant="outlined"
                      />

                      <Box
                        sx={{
                          mt: 1,
                          color:
                            '#637083',
                        }}
                      >
                        {
                          record.justification
                        }
                      </Box>
                    </Box>

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
                </Paper>
              ),
            )}
          </Box>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mt: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          component="h2"
          sx={{
            mt: 0,
            mb: 1,
            fontSize:
              '1.25rem',
          }}
        >
          Historial operativo
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          Programaciones,
          reprogramaciones,
          cancelaciones y cambios de
          técnico.
        </Box>

        {scheduleHistory.length ===
          0 &&
        assignmentHistory.length ===
          0 ? (
          <Alert severity="info">
            Este expediente todavía no
            tiene actividad operativa.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
            }}
          >
            {scheduleHistory.map(
              (record) => (
                <Paper
                  key={`schedule-${record.id}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems:
                        'flex-start',
                    }}
                  >
                    <HistoryIcon
                      color="primary"
                    />

                    <Box>
                      <Box
                        component="strong"
                      >
                        {record.action ===
                        'PROGRAMACION'
                          ? 'Programación'
                          : record.action ===
                              'REPROGRAMACION'
                            ? 'Reprogramación'
                            : 'Cancelación'}
                      </Box>

                      <Box
                        sx={{
                          color:
                            '#637083',
                          mt: 0.5,
                        }}
                      >
                        Inspección:{' '}
                        {
                          record.inspectionId
                        }
                      </Box>

                      {record.scheduledAt && (
                        <Box
                          sx={{
                            color:
                              '#637083',
                            mt: 0.5,
                          }}
                        >
                          Fecha:{' '}
                          {formatDateTime(
                            record.scheduledAt,
                          )}
                        </Box>
                      )}

                      {record.reason && (
                        <Box
                          sx={{
                            color:
                              '#637083',
                            mt: 0.5,
                          }}
                        >
                          Motivo:{' '}
                          {
                            record.reason
                          }
                        </Box>
                      )}

                      <Box
                        sx={{
                          color:
                            '#8a94a3',
                          fontSize:
                            '0.8rem',
                          mt: 0.5,
                        }}
                      >
                        Registrado:{' '}
                        {formatDateTime(
                          record.createdAt,
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ),
            )}

            {assignmentHistory.map(
              (record) => (
                <Paper
                  key={`assignment-${record.id}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems:
                        'flex-start',
                    }}
                  >
                    <AssignmentIndIcon
                      color="primary"
                    />

                    <Box>
                      <Box
                        component="strong"
                      >
                        {record.action ===
                        'REASIGNACION'
                          ? 'Reasignación de técnico'
                          : 'Asignación de técnico'}
                      </Box>

                      <Box
                        sx={{
                          color:
                            '#637083',
                          mt: 0.5,
                        }}
                      >
                        Técnico:{' '}
                        {getEvaluatorName(
                          record.evaluatorId,
                        )}
                      </Box>

                      {record.previousEvaluatorId && (
                        <Box
                          sx={{
                            color:
                              '#637083',
                            mt: 0.5,
                          }}
                        >
                          Técnico anterior:{' '}
                          {getEvaluatorName(
                            record.previousEvaluatorId,
                          )}
                        </Box>
                      )}

                      {record.reason && (
                        <Box
                          sx={{
                            color:
                              '#637083',
                            mt: 0.5,
                          }}
                        >
                          Motivo:{' '}
                          {
                            record.reason
                          }
                        </Box>
                      )}

                      <Box
                        sx={{
                          color:
                            '#8a94a3',
                          fontSize:
                            '0.8rem',
                          mt: 0.5,
                        }}
                      >
                        Registrado:{' '}
                        {formatDateTime(
                          record.createdAt,
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ),
            )}
          </Box>
        )}
      </Paper>

      <Dialog
        open={decisionDialogOpen}
        onClose={
          closeDecisionDialog
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Registrar decisión
        </DialogTitle>

        <DialogContent>
          {selectedDecision && (
            <Alert
              severity={
                selectedDecision ===
                'PROCEDE_EVALUACION'
                  ? 'success'
                  : selectedDecision ===
                      'NO_PROCEDE'
                    ? 'error'
                    : 'warning'
              }
              sx={{ mb: 2 }}
            >
              Decisión:{' '}
              {
                decisionLabels[
                  selectedDecision
                ]
              }
            </Alert>
          )}

          <TextField
            label="Justificación"
            value={justification}
            onChange={(event) =>
              setJustification(
                event.target.value,
              )
            }
            fullWidth
            multiline
            minRows={4}
            required
            placeholder="Describe el motivo de la decisión..."
            disabled={saving}
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeDecisionDialog
            }
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void saveDecision()
            }
            disabled={
              saving ||
              !justification.trim()
            }
          >
            {saving
              ? 'Guardando...'
              : 'Confirmar decisión'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={message !== ''}
        autoHideDuration={3000}
        onClose={() =>
          setMessage('')
        }
        message={message}
      />
    </Box>
  )
}

export default CaseDetailPage