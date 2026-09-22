import {
  useMemo,
  useState,
  useEffect,
} from 'react'

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
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
} from '@mui/material'

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import HistoryIcon from '@mui/icons-material/History'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import PersonIcon from '@mui/icons-material/Person'
import CloseIcon from '@mui/icons-material/Close'

import {
  useSearchParams,
} from 'react-router-dom'

import {
  coordinatorApi,
} from '../../api/coordinatorApi'

import type {
  AssignmentHistory,
  Evaluator,
  Inspection,
  ScheduleConflict,
} from '../../api/types'

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return 'Sin fecha'
  }

  return new Date(value).toLocaleString()
}

function AssignmentsPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [
    inspections,
    setInspections,
  ] = useState<Inspection[]>([])

  const [
    evaluators,
    setEvaluators,
  ] = useState<Evaluator[]>([])

  const [
    assignmentHistory,
    setAssignmentHistory,
  ] = useState<AssignmentHistory[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    selectedInspection,
    setSelectedInspection,
  ] = useState<Inspection | null>(null)

  const [
    evaluatorId,
    setEvaluatorId,
  ] = useState('')

  const [
    reassignmentReason,
    setReassignmentReason,
  ] = useState('')

  const [
    assignmentConflicts,
    setAssignmentConflicts,
  ] = useState<ScheduleConflict[]>([])

  const [
    checkingConflicts,
    setCheckingConflicts,
  ] = useState(false)

  const [
    conflictAcknowledged,
    setConflictAcknowledged,
  ] = useState(false)

  const [
    conflictComment,
    setConflictComment,
  ] = useState('')

  const [
    historyInspectionId,
    setHistoryInspectionId,
  ] = useState<string | null>(null)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([
      coordinatorApi.getInspections(),
      coordinatorApi.getEvaluators(),
      coordinatorApi.getAssignmentHistory(),
    ])
      .then(
        ([
          inspectionData,
          evaluatorData,
          historyData,
        ]) => {
          if (!active) {
            return
          }

          setInspections(inspectionData)
          setEvaluators(evaluatorData)
          setAssignmentHistory(historyData)
          setLoading(false)

          const requestedInspectionId =
            searchParams.get(
              'inspectionId',
            )

          if (!requestedInspectionId) {
            return
          }

          const requestedInspection =
            inspectionData.find(
              (inspection) =>
                inspection.id ===
                  requestedInspectionId &&
                inspection.status !==
                  'CANCELADA',
            )

          if (!requestedInspection) {
            setError(
              `No se encontró una inspección activa con el ID ${requestedInspectionId}.`,
            )

            setSearchParams(
              {},
              {
                replace: true,
              },
            )

            return
          }

          setSelectedInspection(
            requestedInspection,
          )

          setEvaluatorId(
            requestedInspection
              .assignedEvaluatorId ?? '',
          )

          setReassignmentReason('')
          setAssignmentConflicts([])
          setConflictAcknowledged(false)
          setConflictComment('')

          setSearchParams(
            {},
            {
              replace: true,
            },
          )
        },
      )
      .catch(() => {
        if (!active) {
          return
        }

        setError(
          'No fue posible cargar los datos de asignación.',
        )

        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [
    searchParams,
    setSearchParams,
  ])

  const activeInspections =
    useMemo(
      () =>
        inspections.filter(
          (inspection) =>
            inspection.status !==
            'CANCELADA',
        ),
      [inspections],
    )

  const selectedEvaluator =
    useMemo(
      () =>
        evaluators.find(
          (evaluator) =>
            evaluator.id ===
            evaluatorId,
        ),
      [
        evaluators,
        evaluatorId,
      ],
    )

  const currentEvaluator =
    useMemo(
      () => {
        if (
          !selectedInspection
            ?.assignedEvaluatorId
        ) {
          return undefined
        }

        return evaluators.find(
          (evaluator) =>
            evaluator.id ===
            selectedInspection
              .assignedEvaluatorId,
        )
      },
      [
        evaluators,
        selectedInspection,
      ],
    )

  const selectedAssignmentHistory =
    useMemo(
      () =>
        assignmentHistory.filter(
          (record) =>
            record.inspectionId ===
            historyInspectionId,
        ),
      [
        assignmentHistory,
        historyInspectionId,
      ],
    )

  const assignedCount =
    useMemo(
      () =>
        activeInspections.filter(
          (inspection) =>
            Boolean(
              inspection
                .assignedEvaluatorId,
            ),
        ).length,
      [activeInspections],
    )

  const unassignedCount =
    useMemo(
      () =>
        activeInspections.filter(
          (inspection) =>
            !inspection
              .assignedEvaluatorId,
        ).length,
      [activeInspections],
    )

  const reloadData = async () => {
    const [
      inspectionData,
      evaluatorData,
      historyData,
    ] = await Promise.all([
      coordinatorApi.getInspections(),
      coordinatorApi.getEvaluators(),
      coordinatorApi.getAssignmentHistory(),
    ])

    setInspections(inspectionData)
    setEvaluators(evaluatorData)
    setAssignmentHistory(historyData)
  }

  const resetAssignmentForm = () => {
    setSelectedInspection(null)
    setEvaluatorId('')
    setReassignmentReason('')
    setAssignmentConflicts([])
    setConflictAcknowledged(false)
    setConflictComment('')
    setCheckingConflicts(false)
  }

  const openAssignmentDialog = (
    inspection: Inspection,
  ) => {
    setError('')
    setSelectedInspection(inspection)

    setEvaluatorId(
      inspection.assignedEvaluatorId ??
        '',
    )

    setReassignmentReason('')
    setAssignmentConflicts([])
    setConflictAcknowledged(false)
    setConflictComment('')
    setCheckingConflicts(false)
  }

  const closeAssignmentDialog = () => {
    if (saving) {
      return
    }

    resetAssignmentForm()
  }

  const handleEvaluatorChange =
    async (
      newEvaluatorId: string,
    ) => {
      setEvaluatorId(
        newEvaluatorId,
      )

      setAssignmentConflicts([])
      setConflictAcknowledged(false)
      setConflictComment('')
      setError('')

      if (
        !selectedInspection ||
        !newEvaluatorId
      ) {
        return
      }

      if (
        newEvaluatorId ===
        selectedInspection
          .assignedEvaluatorId
      ) {
        return
      }

      if (
        !selectedInspection
          .scheduledAt ||
        !selectedInspection
          .scheduledEndAt
      ) {
        return
      }

      setCheckingConflicts(true)

      try {
        const conflicts =
          await coordinatorApi
            .checkScheduleConflicts(
              newEvaluatorId,
              selectedInspection
                .scheduledAt,
              selectedInspection
                .scheduledEndAt,
              selectedInspection.id,
            )

        setAssignmentConflicts(
          conflicts,
        )
      } catch {
        setError(
          'No fue posible verificar los conflictos de agenda del técnico.',
        )
      } finally {
        setCheckingConflicts(false)
      }
    }

  const handleSaveAssignment =
    async () => {
      setError('')
      setSuccess('')

      if (!selectedInspection) {
        setError(
          'Selecciona una inspección.',
        )
        return
      }

      if (!evaluatorId) {
        setError(
          'Selecciona un técnico evaluador.',
        )
        return
      }

      const previousEvaluatorId =
        selectedInspection
          .assignedEvaluatorId

      const isReassignment =
        Boolean(previousEvaluatorId)

      if (
        previousEvaluatorId ===
        evaluatorId
      ) {
        setError(
          'Selecciona un técnico diferente al actualmente asignado.',
        )
        return
      }

      if (
        isReassignment &&
        !reassignmentReason.trim()
      ) {
        setError(
          'Debes indicar el motivo de la reasignación.',
        )
        return
      }

      if (
        assignmentConflicts.length >
          0 &&
        !conflictAcknowledged
      ) {
        setError(
          'Debes confirmar que deseas continuar a pesar del conflicto de agenda.',
        )
        return
      }

      if (
        assignmentConflicts.length >
          0 &&
        !conflictComment.trim()
      ) {
        setError(
          'Debes justificar el conflicto de agenda antes de continuar.',
        )
        return
      }

      setSaving(true)

      try {
        let reason =
          isReassignment
            ? reassignmentReason.trim()
            : 'Asignación inicial'

        if (
          assignmentConflicts.length >
          0
        ) {
          reason +=
            ` | Conflicto de agenda confirmado: ${conflictComment.trim()}`
        }

        await coordinatorApi
          .updateAssignment({
            inspectionId:
              selectedInspection.id,
            evaluatorId,
            reason,
          })

        await reloadData()

        setSuccess(
          isReassignment
            ? `Inspección ${selectedInspection.id} reasignada correctamente.`
            : `Inspección ${selectedInspection.id} asignada correctamente.`,
        )

        resetAssignmentForm()
      } catch (caughtError) {
        if (
          caughtError instanceof Error
        ) {
          setError(
            caughtError.message,
          )
        } else {
          setError(
            'No fue posible actualizar la asignación.',
          )
        }
      } finally {
        setSaving(false)
      }
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

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems:
            'flex-start',
          gap: 1.5,
        }}
      >
        <AssignmentIndIcon
          color="primary"
          sx={{
            mt: 0.7,
          }}
        />

        <Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontSize: '2rem',
              fontWeight: 700,
              color: '#172033',
            }}
          >
            Asignaciones
          </Box>

          <Box
            component="p"
            sx={{
              mt: 0.5,
              mb: 0,
              color: '#637083',
            }}
          >
            Gestiona la asignación
            y reasignación de
            técnicos evaluadores.
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 3,
            mb: 3,
          }}
          onClose={() =>
            setError('')
          }
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md:
              'repeat(3, 1fr)',
          },
          gap: 2,
          mt: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border:
              '1px solid #d9e2ec',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              color: '#637083',
              fontSize: '0.9rem',
            }}
          >
            Inspecciones activas
          </Box>

          <Box
            sx={{
              mt: 0.5,
              fontSize: '2rem',
              fontWeight: 700,
              color: '#172033',
            }}
          >
            {
              activeInspections
                .length
            }
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border:
              '1px solid #d9e2ec',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              color: '#637083',
              fontSize: '0.9rem',
            }}
          >
            Con técnico asignado
          </Box>

          <Box
            sx={{
              mt: 0.5,
              fontSize: '2rem',
              fontWeight: 700,
              color: 'success.main',
            }}
          >
            {assignedCount}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border:
              '1px solid #d9e2ec',
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              color: '#637083',
              fontSize: '0.9rem',
            }}
          >
            Sin técnico
          </Box>

          <Box
            sx={{
              mt: 0.5,
              fontSize: '2rem',
              fontWeight: 700,
              color:
                unassignedCount >
                0
                  ? 'warning.main'
                  : 'success.main',
            }}
          >
            {unassignedCount}
          </Box>
        </Paper>
      </Box>

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
          component="h2"
          sx={{
            m: 0,
            mb: 0.5,
            fontSize: '1.3rem',
          }}
        >
          Inspecciones
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          Cada inspección puede
          mantener un único
          técnico activo. Las
          reasignaciones quedan
          registradas en el
          historial.
        </Box>

        {activeInspections
          .length === 0 ? (
          <Alert severity="info">
            No existen inspecciones
            activas para asignar.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
            }}
          >
            {activeInspections.map(
              (inspection) => {
                const evaluator =
                  evaluators.find(
                    (item) =>
                      item.id ===
                      inspection
                        .assignedEvaluatorId,
                  )

                return (
                  <Paper
                    key={
                      inspection.id
                    }
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: 2,
                        flexWrap:
                          'wrap',
                      }}
                    >
                      <Box
                        sx={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Box
                          component="strong"
                          sx={{
                            display:
                              'block',
                            fontSize:
                              '1rem',
                            mb: 0.7,
                          }}
                        >
                          {
                            inspection.id
                          }
                          {' — '}
                          {
                            inspection
                              .establishmentName
                          }
                        </Box>

                        <Box
                          sx={{
                            color:
                              '#637083',
                            fontSize:
                              '0.9rem',
                            mb: 0.5,
                          }}
                        >
                          {
                            inspection
                              .establishmentAddress
                          }
                        </Box>

                        <Box
                          sx={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 0.7,
                            mt: 1.5,
                          }}
                        >
                          <EventIcon
                            sx={{
                              fontSize:
                                18,
                              color:
                                '#637083',
                            }}
                          />

                          <Box
                            sx={{
                              fontSize:
                                '0.9rem',
                            }}
                          >
                            {formatDateTime(
                              inspection
                                .scheduledAt,
                            )}

                            {inspection
                              .scheduledEndAt
                              ? ` hasta ${formatDateTime(
                                  inspection
                                    .scheduledEndAt,
                                )}`
                              : ''}
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 0.7,
                            mt: 1,
                          }}
                        >
                          <PersonIcon
                            sx={{
                              fontSize:
                                18,
                              color:
                                '#637083',
                            }}
                          />

                          <Box
                            sx={{
                              fontSize:
                                '0.9rem',
                            }}
                          >
                            Técnico:{' '}
                            <strong>
                              {evaluator
                                ?.fullName ??
                                'Sin asignar'}
                            </strong>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            mt: 1.5,
                            display:
                              'flex',
                            gap: 1,
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <Chip
                            size="small"
                            label={
                              inspection.status
                            }
                            color="primary"
                            variant="outlined"
                          />

                          <Chip
                            size="small"
                            label={
                              evaluator
                                ? 'Asignada'
                                : 'Pendiente de asignación'
                            }
                            color={
                              evaluator
                                ? 'success'
                                : 'warning'
                            }
                            variant="outlined"
                          />
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display:
                            'flex',
                          gap: 1,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            <HistoryIcon />
                          }
                          onClick={() =>
                            setHistoryInspectionId(
                              inspection.id,
                            )
                          }
                        >
                          Historial
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            evaluator ? (
                              <SwapHorizIcon />
                            ) : (
                              <PersonAddIcon />
                            )
                          }
                          onClick={() =>
                            openAssignmentDialog(
                              inspection,
                            )
                          }
                        >
                          {evaluator
                            ? 'Reasignar'
                            : 'Asignar'}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                )
              },
            )}
          </Box>
        )}
      </Paper>

      <Dialog
        open={
          selectedInspection !==
          null
        }
        onClose={
          closeAssignmentDialog
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedInspection
            ?.assignedEvaluatorId
            ? 'Reasignar técnico'
            : 'Asignar técnico'}
        </DialogTitle>

        <DialogContent>
          {selectedInspection && (
            <>
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                }}
              >
                <strong>
                  {
                    selectedInspection
                      .id
                  }
                </strong>
                {' — '}
                {
                  selectedInspection
                    .establishmentName
                }

                <br />

                Horario:{' '}
                {formatDateTime(
                  selectedInspection
                    .scheduledAt,
                )}

                {selectedInspection
                  .scheduledEndAt
                  ? ` hasta ${formatDateTime(
                      selectedInspection
                        .scheduledEndAt,
                    )}`
                  : ''}
              </Alert>

              {currentEvaluator && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    bgcolor:
                      '#fafcff',
                  }}
                >
                  <Box
                    sx={{
                      color:
                        '#637083',
                      fontSize:
                        '0.85rem',
                      mb: 0.5,
                    }}
                  >
                    Técnico actual
                  </Box>

                  <Box
                    component="strong"
                  >
                    {
                      currentEvaluator
                        .fullName
                    }
                  </Box>
                </Paper>
              )}

              <FormControl
                fullWidth
              >
                <InputLabel>
                  Técnico evaluador
                </InputLabel>

                <Select
                  value={
                    evaluatorId
                  }
                  label="Técnico evaluador"
                  onChange={(
                    event,
                  ) =>
                    void handleEvaluatorChange(
                      event.target
                        .value,
                    )
                  }
                >
                  {evaluators.map(
                    (evaluator) => (
                      <MenuItem
                        key={
                          evaluator.id
                        }
                        value={
                          evaluator.id
                        }
                      >
                        {
                          evaluator
                            .fullName
                        }
                        {' — '}
                        {evaluator
                          .available
                          ? 'Disponible'
                          : 'No disponible'}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              {selectedEvaluator &&
                !selectedEvaluator
                  .available && (
                  <Alert
                    severity="warning"
                    sx={{
                      mt: 2,
                    }}
                  >
                    El técnico
                    seleccionado figura
                    como no disponible.
                    Verifica su
                    disponibilidad antes
                    de confirmar.
                  </Alert>
                )}

              {checkingConflicts && (
                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 1,
                    color:
                      '#637083',
                  }}
                >
                  <CircularProgress
                    size={18}
                  />
                  Verificando agenda...
                </Box>
              )}

              {selectedInspection
                .assignedEvaluatorId && (
                <TextField
                  fullWidth
                  required
                  multiline
                  minRows={3}
                  label="Motivo de la reasignación"
                  value={
                    reassignmentReason
                  }
                  onChange={(
                    event,
                  ) =>
                    setReassignmentReason(
                      event.target
                        .value,
                    )
                  }
                  sx={{
                    mt: 3,
                  }}
                />
              )}

              {assignmentConflicts
                .length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: 2,
                    borderColor:
                      'warning.main',
                    bgcolor:
                      '#fffaf0',
                  }}
                >
                  <Alert
                    severity="warning"
                    icon={
                      <WarningAmberIcon />
                    }
                    sx={{
                      mb: 2,
                    }}
                  >
                    El técnico tiene
                    otra evaluación que
                    coincide con este
                    horario. El
                    conflicto no bloquea
                    la reasignación,
                    pero debe ser
                    confirmado y
                    justificado.
                  </Alert>

                  {assignmentConflicts.map(
                    (conflict) => (
                      <Paper
                        key={
                          conflict
                            .inspectionId
                        }
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 1.5,
                          bgcolor:
                            'white',
                        }}
                      >
                        <Box
                          component="strong"
                        >
                          {
                            conflict
                              .inspectionId
                          }
                          {' — '}
                          {
                            conflict
                              .establishmentName
                          }
                        </Box>

                        <Box
                          sx={{
                            mt: 0.5,
                            color:
                              '#637083',
                            fontSize:
                              '0.9rem',
                          }}
                        >
                          {formatDateTime(
                            conflict
                              .scheduledAt,
                          )}
                          {' hasta '}
                          {formatDateTime(
                            conflict
                              .scheduledEndAt,
                          )}
                        </Box>
                      </Paper>
                    ),
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={
                          conflictAcknowledged
                        }
                        onChange={(
                          event,
                        ) =>
                          setConflictAcknowledged(
                            event
                              .target
                              .checked,
                          )
                        }
                      />
                    }
                    label="Confirmo que deseo continuar a pesar del conflicto"
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Justificación del conflicto"
                    value={
                      conflictComment
                    }
                    onChange={(
                      event,
                    ) =>
                      setConflictComment(
                        event.target
                          .value,
                      )
                    }
                    sx={{
                      mt: 2,
                    }}
                  />
                </Paper>
              )}

              {selectedInspection
                .assignedEvaluatorId &&
                evaluatorId ===
                  selectedInspection
                    .assignedEvaluatorId && (
                  <Alert
                    severity="info"
                    sx={{
                      mt: 3,
                    }}
                  >
                    Selecciona un
                    técnico diferente
                    para realizar una
                    reasignación.
                  </Alert>
                )}
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={
              closeAssignmentDialog
            }
            disabled={saving}
          >
            Volver
          </Button>

          <Button
            variant="contained"
            disabled={
              saving ||
              checkingConflicts
            }
            startIcon={
              saving ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : selectedInspection
                  ?.assignedEvaluatorId ? (
                <SwapHorizIcon />
              ) : (
                <PersonAddIcon />
              )
            }
            onClick={() =>
              void handleSaveAssignment()
            }
          >
            {selectedInspection
              ?.assignedEvaluatorId
              ? 'Confirmar reasignación'
              : 'Confirmar asignación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={
          historyInspectionId !==
          null
        }
        onClose={() =>
          setHistoryInspectionId(
            null,
          )
        }
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              gap: 2,
            }}
          >
            <Box>
              Historial de
              asignaciones
            </Box>

            <Button
              size="small"
              startIcon={
                <CloseIcon />
              }
              onClick={() =>
                setHistoryInspectionId(
                  null,
                )
              }
            >
              Cerrar
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              color: '#637083',
              mb: 2,
            }}
          >
            Inspección{' '}
            {historyInspectionId}
          </Box>

          {selectedAssignmentHistory
            .length === 0 ? (
            <Alert severity="info">
              No existen cambios de
              asignación registrados
              para esta inspección.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
              }}
            >
              {selectedAssignmentHistory.map(
                (record) => {
                  const previous =
                    evaluators.find(
                      (item) =>
                        item.id ===
                        record
                          .previousEvaluatorId,
                    )

                  const current =
                    evaluators.find(
                      (item) =>
                        item.id ===
                        record
                          .evaluatorId,
                    )

                  return (
                    <Paper
                      key={
                        record.id
                      }
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: 1,
                          flexWrap:
                            'wrap',
                          mb: 1.5,
                        }}
                      >
                        <Chip
                          size="small"
                          label={
                            record.action ===
                            'REASIGNACION'
                              ? 'Reasignación'
                              : 'Asignación'
                          }
                          color={
                            record.action ===
                            'REASIGNACION'
                              ? 'warning'
                              : 'success'
                          }
                          variant="outlined"
                        />

                        <Box
                          sx={{
                            color:
                              '#637083',
                            fontSize:
                              '0.85rem',
                          }}
                        >
                          {formatDateTime(
                            record
                              .createdAt,
                          )}
                        </Box>
                      </Box>

                      {previous && (
                        <Box
                          sx={{
                            mb: 0.7,
                          }}
                        >
                          Técnico
                          anterior:{' '}
                          <strong>
                            {
                              previous
                                .fullName
                            }
                          </strong>
                        </Box>
                      )}

                      <Box>
                        Técnico
                        asignado:{' '}
                        <strong>
                          {current
                            ?.fullName ??
                            record
                              .evaluatorId}
                        </strong>
                      </Box>

                      {record.reason && (
                        <>
                          <Divider
                            sx={{
                              my: 1.5,
                            }}
                          />

                          <Box
                            sx={{
                              color:
                                '#637083',
                              whiteSpace:
                                'pre-wrap',
                            }}
                          >
                            Motivo:{' '}
                            {
                              record.reason
                            }
                          </Box>
                        </>
                      )}
                    </Paper>
                  )
                },
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setHistoryInspectionId(
                null,
              )
            }
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success !== ''}
        autoHideDuration={4000}
        onClose={() =>
          setSuccess('')
        }
      >
        <Alert
          severity="success"
          icon={
            <CheckCircleIcon />
          }
          onClose={() =>
            setSuccess('')
          }
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AssignmentsPage