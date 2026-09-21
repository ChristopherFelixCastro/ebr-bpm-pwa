import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useSearchParams } from 'react-router-dom'

import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

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

import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import CancelIcon from '@mui/icons-material/Cancel'
import HistoryIcon from '@mui/icons-material/History'

import {
  DatePicker,
  TimePicker,
} from '@mui/x-date-pickers'

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  CoordinatorCase,
  Evaluator,
  Inspection,
  ScheduleConflict,
  ScheduleHistory,
} from '../../api/types'

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return 'Sin fecha'
  }

  return new Date(value).toLocaleString()
}

function buildDateTime(
  date: Dayjs | null,
  time: Dayjs | null,
): string {
  if (!date || !time) {
    return ''
  }

  return date
    .hour(time.hour())
    .minute(time.minute())
    .second(0)
    .millisecond(0)
    .format('YYYY-MM-DDTHH:mm:ss')
}

function SchedulingPage() {
  const [searchParams] = useSearchParams()

  const [cases, setCases] =
    useState<CoordinatorCase[]>([])

  const [evaluators, setEvaluators] =
    useState<Evaluator[]>([])

  const [inspections, setInspections] =
    useState<Inspection[]>([])

  const [scheduleHistory, setScheduleHistory] =
    useState<ScheduleHistory[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [caseId, setCaseId] =
    useState('')

  const [evaluatorId, setEvaluatorId] =
    useState('')

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<Dayjs | null>(null)

  const [startTime, setStartTime] =
    useState<Dayjs | null>(null)

  const [endTime, setEndTime] =
    useState<Dayjs | null>(null)

  const [conflicts, setConflicts] =
    useState<ScheduleConflict[]>([])

  const [
    conflictAcknowledged,
    setConflictAcknowledged,
  ] = useState(false)

  const [
    conflictComment,
    setConflictComment,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [
    rescheduleInspection,
    setRescheduleInspection,
  ] = useState<Inspection | null>(null)

  const [
    rescheduleDate,
    setRescheduleDate,
  ] = useState<Dayjs | null>(null)

  const [
    rescheduleStartTime,
    setRescheduleStartTime,
  ] = useState<Dayjs | null>(null)

  const [
    rescheduleEndTime,
    setRescheduleEndTime,
  ] = useState<Dayjs | null>(null)

  const [
    rescheduleReason,
    setRescheduleReason,
  ] = useState('')

  const [
    rescheduleConflicts,
    setRescheduleConflicts,
  ] = useState<ScheduleConflict[]>([])

  const [
    rescheduleConflictAcknowledged,
    setRescheduleConflictAcknowledged,
  ] = useState(false)

  const [
    rescheduleConflictComment,
    setRescheduleConflictComment,
  ] = useState('')

  const [
    cancelTarget,
    setCancelTarget,
  ] = useState<Inspection | null>(null)

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState('')

  const [
    historyInspectionId,
    setHistoryInspectionId,
  ] = useState<string | null>(null)

  const scheduledAt = useMemo(
    () =>
      buildDateTime(
        selectedDate,
        startTime,
      ),
    [selectedDate, startTime],
  )

  const scheduledEndAt = useMemo(
    () =>
      buildDateTime(
        selectedDate,
        endTime,
      ),
    [selectedDate, endTime],
  )

  const rescheduledAt = useMemo(
    () =>
      buildDateTime(
        rescheduleDate,
        rescheduleStartTime,
      ),
    [
      rescheduleDate,
      rescheduleStartTime,
    ],
  )

  const rescheduledEndAt = useMemo(
    () =>
      buildDateTime(
        rescheduleDate,
        rescheduleEndTime,
      ),
    [
      rescheduleDate,
      rescheduleEndTime,
    ],
  )

  const selectedCase = useMemo(
    () =>
      cases.find(
        (item) => item.id === caseId,
      ),
    [cases, caseId],
  )

  const selectedEvaluator = useMemo(
    () =>
      evaluators.find(
        (item) =>
          item.id === evaluatorId,
      ),
    [evaluators, evaluatorId],
  )

  const selectedScheduleHistory =
    useMemo(
      () =>
        scheduleHistory.filter(
          (item) =>
            item.inspectionId ===
            historyInspectionId,
        ),
      [
        scheduleHistory,
        historyInspectionId,
      ],
    )

  const loadData = async () => {
    setLoading(true)

    try {
      const [
        caseData,
        evaluatorData,
        inspectionData,
        historyData,
      ] = await Promise.all([
        coordinatorApi.getSchedulableCases(),
        coordinatorApi.getEvaluators(),
        coordinatorApi.getInspections(),
        coordinatorApi.getScheduleHistory(),
      ])

      setCases(caseData)
      setEvaluators(evaluatorData)
      setInspections(inspectionData)
      setScheduleHistory(historyData)
    } catch {
      setError(
        'No fue posible cargar los datos de programación.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    Promise.all([
      coordinatorApi.getSchedulableCases(),
      coordinatorApi.getEvaluators(),
      coordinatorApi.getInspections(),
      coordinatorApi.getScheduleHistory(),
    ])
      .then(([
        caseData,
        evaluatorData,
        inspectionData,
        historyData,
      ]) => {
        if (!active) {
          return
        }

        setCases(caseData)
        setEvaluators(evaluatorData)
        setInspections(inspectionData)
        setScheduleHistory(historyData)
      })
      .catch(() => {
        if (!active) {
          return
        }

        setError(
          'No fue posible cargar los datos de programación.',
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
        if (loading) {
          return
        }

        const requestedCaseId =
          searchParams.get('caseId')

        const requestedInspectionId =
          searchParams.get('inspectionId')

        if (requestedCaseId) {
          const requestedCase =
            cases.find(
              (item) =>
                item.id === requestedCaseId,
            )

          if (requestedCase) {
            setCaseId(requestedCase.id)
            setError('')
          } else {
            setError(
              'El caso solicitado no está disponible para programación.',
            )
          }

          return
        }

        if (requestedInspectionId) {
          const requestedInspection =
            inspections.find(
              (inspection) =>
                inspection.id ===
                  requestedInspectionId &&
                inspection.status !==
                  'CANCELADA',
            )

          if (requestedInspection) {
            setError('')
            setRescheduleInspection(
              requestedInspection,
            )
            setRescheduleReason('')
            setRescheduleConflicts([])
            setRescheduleConflictAcknowledged(
              false,
            )
            setRescheduleConflictComment('')

            if (
              requestedInspection.scheduledAt
            ) {
              const current =
                dayjs(
                  requestedInspection.scheduledAt,
                )

              setRescheduleDate(current)
              setRescheduleStartTime(current)
            } else {
              setRescheduleDate(null)
              setRescheduleStartTime(null)
            }

            if (
              requestedInspection.scheduledEndAt
            ) {
              setRescheduleEndTime(
                dayjs(
                  requestedInspection.scheduledEndAt,
                ),
              )
            } else {
              setRescheduleEndTime(null)
            }
          } else {
            setError(
              'La inspección solicitada no está disponible para reprogramación.',
            )
          }
        }    })

  }, [
    loading,
    searchParams,
    cases,
    inspections,
  ])

  useEffect(() => {
    const checkConflicts = async () => {
      setConflicts([])
      setConflictAcknowledged(false)
      setConflictComment('')

      if (
        !evaluatorId ||
        !scheduledAt ||
        !scheduledEndAt
      ) {
        return
      }

      const start =
        new Date(
          scheduledAt,
        ).getTime()

      const end =
        new Date(
          scheduledEndAt,
        ).getTime()

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        end <= start
      ) {
        return
      }

      try {
        const result =
          await coordinatorApi.checkScheduleConflicts(
            evaluatorId,
            scheduledAt,
            scheduledEndAt,
          )

        setConflicts(result)
      } catch {
        setError(
          'No fue posible verificar los conflictos de horario.',
        )
      }
    }

    void checkConflicts()
  }, [
    evaluatorId,
    scheduledAt,
    scheduledEndAt,
  ])

  useEffect(() => {
    const checkConflicts = async () => {
      setRescheduleConflicts([])
      setRescheduleConflictAcknowledged(
        false,
      )
      setRescheduleConflictComment('')

      if (
        !rescheduleInspection ||
        !rescheduleInspection.assignedEvaluatorId ||
        !rescheduledAt ||
        !rescheduledEndAt
      ) {
        return
      }

      const start =
        new Date(
          rescheduledAt,
        ).getTime()

      const end =
        new Date(
          rescheduledEndAt,
        ).getTime()

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        end <= start
      ) {
        return
      }

      try {
        const result =
          await coordinatorApi.checkScheduleConflicts(
            rescheduleInspection.assignedEvaluatorId,
            rescheduledAt,
            rescheduledEndAt,
            rescheduleInspection.id,
          )

        setRescheduleConflicts(result)
      } catch {
        setError(
          'No fue posible verificar los conflictos de la nueva programación.',
        )
      }
    }

    void checkConflicts()
  }, [
    rescheduleInspection,
    rescheduledAt,
    rescheduledEndAt,
  ])

  const resetNewScheduleForm = () => {
    setCaseId('')
    setEvaluatorId('')
    setSelectedDate(null)
    setStartTime(null)
    setEndTime(null)
    setConflicts([])
    setConflictAcknowledged(false)
    setConflictComment('')
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!caseId) {
      setError(
        'Selecciona un caso.',
      )
      return
    }

    if (!evaluatorId) {
      setError(
        'Selecciona un técnico evaluador.',
      )
      return
    }

    if (!selectedDate) {
      setError(
        'Selecciona una fecha para la evaluación.',
      )
      return
    }

    if (!startTime) {
      setError(
        'Selecciona la hora de inicio.',
      )
      return
    }

    if (!endTime) {
      setError(
        'Selecciona la hora de finalización.',
      )
      return
    }

    const start =
      new Date(
        scheduledAt,
      ).getTime()

    const end =
      new Date(
        scheduledEndAt,
      ).getTime()

    if (end <= start) {
      setError(
        'La hora de finalización debe ser posterior a la hora de inicio.',
      )
      return
    }

    if (
      conflicts.length > 0 &&
      !conflictAcknowledged
    ) {
      setError(
        'Debes confirmar que deseas continuar a pesar del conflicto.',
      )
      return
    }

    if (
      conflicts.length > 0 &&
      !conflictComment.trim()
    ) {
      setError(
        'Debes escribir un comentario justificando el conflicto.',
      )
      return
    }

    setSaving(true)

    try {
      const inspection =
        await coordinatorApi.scheduleInspection({
          caseId,
          evaluatorId,
          scheduledAt,
          scheduledEndAt,
          conflictAcknowledged,
          conflictComment,
        })

      setSuccess(
        `Inspección ${inspection.id} programada y asignada correctamente.`,
      )

      resetNewScheduleForm()
      await loadData()
    } catch (caughtError) {
      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message,
        )
      } else {
        setError(
          'No fue posible programar la inspección.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const openRescheduleDialog = (
    inspection: Inspection,
  ) => {
    setError('')
    setRescheduleInspection(
      inspection,
    )
    setRescheduleReason('')
    setRescheduleConflicts([])
    setRescheduleConflictAcknowledged(
      false,
    )
    setRescheduleConflictComment('')

    if (inspection.scheduledAt) {
      const current =
        dayjs(
          inspection.scheduledAt,
        )

      setRescheduleDate(current)
      setRescheduleStartTime(
        current,
      )
    } else {
      setRescheduleDate(null)
      setRescheduleStartTime(null)
    }

    if (
      inspection.scheduledEndAt
    ) {
      setRescheduleEndTime(
        dayjs(
          inspection.scheduledEndAt,
        ),
      )
    } else {
      setRescheduleEndTime(null)
    }
  }

  const closeRescheduleDialog = () => {
    if (saving) {
      return
    }

    setRescheduleInspection(null)
    setRescheduleDate(null)
    setRescheduleStartTime(null)
    setRescheduleEndTime(null)
    setRescheduleReason('')
    setRescheduleConflicts([])
    setRescheduleConflictAcknowledged(
      false,
    )
    setRescheduleConflictComment('')
  }

  const handleReschedule = async () => {
    setError('')
    setSuccess('')

    if (!rescheduleInspection) {
      return
    }

    if (!rescheduleDate) {
      setError(
        'Selecciona la nueva fecha.',
      )
      return
    }

    if (!rescheduleStartTime) {
      setError(
        'Selecciona la nueva hora de inicio.',
      )
      return
    }

    if (!rescheduleEndTime) {
      setError(
        'Selecciona la nueva hora de finalización.',
      )
      return
    }

    if (!rescheduleReason.trim()) {
      setError(
        'Debes indicar el motivo de la reprogramación.',
      )
      return
    }

    const start =
      new Date(
        rescheduledAt,
      ).getTime()

    const end =
      new Date(
        rescheduledEndAt,
      ).getTime()

    if (end <= start) {
      setError(
        'La hora de finalización debe ser posterior a la hora de inicio.',
      )
      return
    }

    if (
      rescheduleConflicts.length > 0 &&
      !rescheduleConflictAcknowledged
    ) {
      setError(
        'Debes confirmar el conflicto antes de reprogramar.',
      )
      return
    }

    if (
      rescheduleConflicts.length > 0 &&
      !rescheduleConflictComment.trim()
    ) {
      setError(
        'Debes justificar el conflicto antes de reprogramar.',
      )
      return
    }

    setSaving(true)

    try {
      await coordinatorApi.rescheduleInspection({
        inspectionId:
          rescheduleInspection.id,
        scheduledAt:
          rescheduledAt,
        scheduledEndAt:
          rescheduledEndAt,
        reason:
          rescheduleReason.trim(),
        conflictAcknowledged:
          rescheduleConflictAcknowledged,
        conflictComment:
          rescheduleConflictComment,
      })

      setSuccess(
        `Inspección ${rescheduleInspection.id} reprogramada correctamente.`,
      )

      closeRescheduleDialog()
      await loadData()
    } catch (caughtError) {
      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message,
        )
      } else {
        setError(
          'No fue posible reprogramar la inspección.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancelInspection =
    async () => {
      setError('')
      setSuccess('')

      if (!cancelTarget) {
        return
      }

      if (
        !cancellationReason.trim()
      ) {
        setError(
          'Debes indicar el motivo de la cancelación.',
        )
        return
      }

      setSaving(true)

      try {
        await coordinatorApi.cancelInspection({
          inspectionId:
            cancelTarget.id,
          reason:
            cancellationReason.trim(),
        })

        setSuccess(
          `Inspección ${cancelTarget.id} cancelada correctamente.`,
        )

        setCancelTarget(null)
        setCancellationReason('')

        await loadData()
      } catch (caughtError) {
        if (
          caughtError instanceof Error
        ) {
          setError(
            caughtError.message,
          )
        } else {
          setError(
            'No fue posible cancelar la inspección.',
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
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
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
          Programación
        </Box>

        <Box
          component="p"
          sx={{
            color: '#637083',
            mt: 0,
            mb: 3,
          }}
        >
          Programa, reprograma y cancela
          evaluaciones del proceso de
          coordinación.
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
              mb: 1,
              fontSize: '1.25rem',
            }}
          >
            Nueva programación
          </Box>

          <Box
            component="p"
            sx={{
              mt: 0,
              mb: 3,
              color: '#637083',
            }}
          >
            Selecciona el caso, técnico,
            fecha y horario de la
            evaluación.
          </Box>

          {cases.length === 0 ? (
            <Alert severity="info">
              No existen casos pendientes
              de programación.
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
                <FormControl fullWidth>
                  <InputLabel>
                    Caso
                  </InputLabel>

                  <Select
                    value={caseId}
                    label="Caso"
                    onChange={(event) =>
                      setCaseId(
                        event.target.value,
                      )
                    }
                  >
                    {cases.map(
                      (item) => (
                        <MenuItem
                          key={item.id}
                          value={item.id}
                        >
                          {item.id} -{' '}
                          {item.companyName}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>
                    Técnico evaluador
                  </InputLabel>

                  <Select
                    value={evaluatorId}
                    label="Técnico evaluador"
                    onChange={(event) =>
                      setEvaluatorId(
                        event.target.value,
                      )
                    }
                  >
                    {evaluators.map(
                      (evaluator) => (
                        <MenuItem
                          key={evaluator.id}
                          value={evaluator.id}
                        >
                          {evaluator.fullName}
                          {' - '}
                          {evaluator.available
                            ? 'Disponible'
                            : 'No disponible'}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: 3,
                  bgcolor: '#fafcff',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2.5,
                  }}
                >
                  <CalendarMonthIcon
                    color="primary"
                  />

                  <Box
                    component="h3"
                    sx={{
                      m: 0,
                      fontSize: '1.05rem',
                    }}
                  >
                    Fecha y horario
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md:
                        '1fr 1fr 1fr',
                    },
                    gap: 3,
                  }}
                >
                  <DatePicker
                    label="Fecha"
                    value={selectedDate}
                    onChange={(value) =>
                      setSelectedDate(
                        value,
                      )
                    }
                    disablePast
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />

                  <TimePicker
                    label="Hora de inicio"
                    value={startTime}
                    onChange={(value) =>
                      setStartTime(value)
                    }
                    minutesStep={30}
                    ampm={false}
                    slots={{
                      openPickerIcon:
                        AccessTimeIcon,
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />

                  <TimePicker
                    label="Hora de finalización"
                    value={endTime}
                    onChange={(value) =>
                      setEndTime(value)
                    }
                    minutesStep={30}
                    ampm={false}
                    slots={{
                      openPickerIcon:
                        AccessTimeIcon,
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Box>
              </Paper>

              {selectedCase && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 3,
                    p: 2.5,
                    bgcolor: '#fafcff',
                    borderRadius: 2,
                  }}
                >
                  <Box
                    component="strong"
                    sx={{
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    Caso seleccionado
                  </Box>

                  <Box>
                    {selectedCase.companyName}
                  </Box>

                  <Box
                    sx={{
                      color: '#637083',
                      fontSize: '0.9rem',
                    }}
                  >
                    {
                      selectedCase.establishmentName
                    }
                    {' — '}
                    {
                      selectedCase.establishmentAddress
                    }
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={
                        selectedCase.priority
                      }
                      variant="outlined"
                    />
                  </Box>
                </Paper>
              )}

              {selectedEvaluator &&
                !selectedEvaluator.available && (
                  <Alert
                    severity="warning"
                    sx={{ mt: 3 }}
                  >
                    El técnico figura como no
                    disponible. Verifica su
                    disponibilidad antes de
                    confirmar.
                  </Alert>
                )}

              {conflicts.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 3,
                    p: 3,
                    borderColor:
                      'warning.main',
                    bgcolor: '#fffaf0',
                  }}
                >
                  <Alert
                    severity="warning"
                    icon={
                      <WarningAmberIcon />
                    }
                    sx={{ mb: 2 }}
                  >
                    Existe un conflicto de
                    horario. Puedes continuar
                    si reconoces y justificas
                    la excepción.
                  </Alert>

                  {conflicts.map(
                    (conflict) => (
                      <Box
                        key={
                          conflict.inspectionId
                        }
                        sx={{
                          mb: 2,
                          p: 2,
                          bgcolor: 'white',
                          borderRadius: 2,
                        }}
                      >
                        <strong>
                          {
                            conflict.inspectionId
                          }
                          {' — '}
                          {
                            conflict.establishmentName
                          }
                        </strong>

                        <Box>
                          {formatDateTime(
                            conflict.scheduledAt,
                          )}
                          {' hasta '}
                          {formatDateTime(
                            conflict.scheduledEndAt,
                          )}
                        </Box>
                      </Box>
                    ),
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={
                          conflictAcknowledged
                        }
                        onChange={(event) =>
                          setConflictAcknowledged(
                            event.target
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
                    sx={{ mt: 2 }}
                    label="Justificación del conflicto"
                    value={conflictComment}
                    onChange={(event) =>
                      setConflictComment(
                        event.target.value,
                      )
                    }
                  />
                </Paper>
              )}

              <Divider sx={{ my: 3 }} />

              <Button
                variant="contained"
                size="large"
                startIcon={
                  saving ? (
                    <CircularProgress
                      size={18}
                      color="inherit"
                    />
                  ) : (
                    <EventAvailableIcon />
                  )
                }
                disabled={saving}
                onClick={() =>
                  void handleSubmit()
                }
              >
                Programar y asignar
              </Button>
            </>
          )}
        </Paper>

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
              mt: 0,
              mb: 2,
              fontSize: '1.25rem',
            }}
          >
            Programaciones actuales
          </Box>

          {inspections.length === 0 ? (
            <Alert severity="info">
              No existen evaluaciones
              programadas.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
              }}
            >
              {inspections.map(
                (inspection) => {
                  const evaluator =
                    evaluators.find(
                      (item) =>
                        item.id ===
                        inspection.assignedEvaluatorId,
                    )

                  const cancelled =
                    inspection.status ===
                    'CANCELADA'

                  return (
                    <Paper
                      key={inspection.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        opacity:
                          cancelled
                            ? 0.72
                            : 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'flex-start',
                          gap: 2,
                          flexWrap:
                            'wrap',
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
                            {inspection.id}
                            {' — '}
                            {
                              inspection.establishmentName
                            }
                          </Box>

                          <Box
                            sx={{
                              color:
                                '#637083',
                              fontSize:
                                '0.9rem',
                            }}
                          >
                            Técnico:{' '}
                            {evaluator?.fullName ??
                              'Sin asignar'}
                          </Box>

                          <Box
                            sx={{
                              color:
                                '#637083',
                              fontSize:
                                '0.9rem',
                              mt: 0.5,
                            }}
                          >
                            {formatDateTime(
                              inspection.scheduledAt,
                            )}

                            {inspection.scheduledEndAt
                              ? ` hasta ${formatDateTime(
                                  inspection.scheduledEndAt,
                                )}`
                              : ''}
                          </Box>

                          {inspection.cancellationReason && (
                            <Box
                              sx={{
                                mt: 1,
                                color:
                                  'error.main',
                                fontSize:
                                  '0.9rem',
                              }}
                            >
                              Motivo de
                              cancelación:{' '}
                              {
                                inspection.cancellationReason
                              }
                            </Box>
                          )}
                        </Box>

                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            flexWrap:
                              'wrap',
                            alignItems:
                              'center',
                          }}
                        >
                          <Chip
                            size="small"
                            label={
                              inspection.status
                            }
                            color={
                              cancelled
                                ? 'default'
                                : 'primary'
                            }
                            variant="outlined"
                          />

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

                          {!cancelled && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                  <EditCalendarIcon />
                                }
                                onClick={() =>
                                  openRescheduleDialog(
                                    inspection,
                                  )
                                }
                              >
                                Reprogramar
                              </Button>

                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={
                                  <CancelIcon />
                                }
                                onClick={() => {
                                  setError('')
                                  setCancellationReason(
                                    '',
                                  )
                                  setCancelTarget(
                                    inspection,
                                  )
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  )
                },
              )}
            </Box>
          )}
        </Paper>

        {historyInspectionId && (
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
                    m: 0,
                    fontSize:
                      '1.25rem',
                  }}
                >
                  Historial de programación
                </Box>

                <Box
                  sx={{
                    color: '#637083',
                    mt: 0.5,
                  }}
                >
                  Inspección{' '}
                  {historyInspectionId}
                </Box>
              </Box>

              <Button
                onClick={() =>
                  setHistoryInspectionId(
                    null,
                  )
                }
              >
                Cerrar
              </Button>
            </Box>

            {selectedScheduleHistory.length ===
            0 ? (
              <Alert severity="info">
                No existen cambios de
                programación registrados.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                }}
              >
                {selectedScheduleHistory.map(
                  (record) => (
                    <Paper
                      key={record.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                      }}
                    >
                      <Chip
                        size="small"
                        label={
                          record.action ===
                          'PROGRAMACION'
                            ? 'Programación'
                            : record.action ===
                                'REPROGRAMACION'
                              ? 'Reprogramación'
                              : 'Cancelación'
                        }
                        color={
                          record.action ===
                          'CANCELACION'
                            ? 'error'
                            : record.action ===
                                'REPROGRAMACION'
                              ? 'warning'
                              : 'success'
                        }
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />

                      {record.previousScheduledAt && (
                        <Box
                          sx={{
                            mb: 0.5,
                          }}
                        >
                          Horario anterior:{' '}
                          {formatDateTime(
                            record.previousScheduledAt,
                          )}
                          {record.previousScheduledEndAt
                            ? ` hasta ${formatDateTime(
                                record.previousScheduledEndAt,
                              )}`
                            : ''}
                        </Box>
                      )}

                      {record.scheduledAt && (
                        <Box>
                          Nuevo horario:{' '}
                          {formatDateTime(
                            record.scheduledAt,
                          )}
                          {record.scheduledEndAt
                            ? ` hasta ${formatDateTime(
                                record.scheduledEndAt,
                              )}`
                            : ''}
                        </Box>
                      )}

                      {record.reason && (
                        <Box
                          sx={{
                            mt: 0.7,
                            color: '#637083',
                          }}
                        >
                          Motivo:{' '}
                          {record.reason}
                        </Box>
                      )}

                      {record.conflictAcknowledged && (
                        <Alert
                          severity="warning"
                          sx={{ mt: 1.5 }}
                        >
                          Esta programación
                          fue confirmada con
                          conflicto de agenda.
                          {record.conflictComment
                            ? ` Justificación: ${record.conflictComment}`
                            : ''}
                        </Alert>
                      )}

                      <Box
                        sx={{
                          mt: 1,
                          color: '#637083',
                          fontSize:
                            '0.85rem',
                        }}
                      >
                        Registrado:{' '}
                        {formatDateTime(
                          record.createdAt,
                        )}
                      </Box>
                    </Paper>
                  ),
                )}
              </Box>
            )}
          </Paper>
        )}

        <Dialog
          open={
            rescheduleInspection !== null
          }
          onClose={
            closeRescheduleDialog
          }
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            Reprogramar inspección
          </DialogTitle>

          <DialogContent>
            {rescheduleInspection && (
              <>
                <Alert
                  severity="info"
                  sx={{ mb: 3 }}
                >
                  {rescheduleInspection.id}
                  {' — '}
                  {
                    rescheduleInspection.establishmentName
                  }
                  <br />
                  Horario actual:{' '}
                  {formatDateTime(
                    rescheduleInspection.scheduledAt,
                  )}
                  {' hasta '}
                  {formatDateTime(
                    rescheduleInspection.scheduledEndAt,
                  )}
                </Alert>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md:
                        '1fr 1fr 1fr',
                    },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <DatePicker
                    label="Nueva fecha"
                    value={
                      rescheduleDate
                    }
                    onChange={(value) =>
                      setRescheduleDate(
                        value,
                      )
                    }
                    disablePast
                    format="DD/MM/YYYY"
                  />

                  <TimePicker
                    label="Nueva hora de inicio"
                    value={
                      rescheduleStartTime
                    }
                    onChange={(value) =>
                      setRescheduleStartTime(
                        value,
                      )
                    }
                    minutesStep={30}
                    ampm={false}
                  />

                  <TimePicker
                    label="Nueva hora de finalización"
                    value={
                      rescheduleEndTime
                    }
                    onChange={(value) =>
                      setRescheduleEndTime(
                        value,
                      )
                    }
                    minutesStep={30}
                    ampm={false}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Motivo de la reprogramación"
                  value={
                    rescheduleReason
                  }
                  onChange={(event) =>
                    setRescheduleReason(
                      event.target.value,
                    )
                  }
                  required
                />

                {rescheduleConflicts.length >
                  0 && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 3,
                      p: 2,
                      borderColor:
                        'warning.main',
                    }}
                  >
                    <Alert
                      severity="warning"
                      sx={{ mb: 2 }}
                    >
                      El nuevo horario tiene
                      conflictos con la agenda
                      del técnico.
                    </Alert>

                    {rescheduleConflicts.map(
                      (conflict) => (
                        <Box
                          key={
                            conflict.inspectionId
                          }
                          sx={{
                            mb: 1.5,
                          }}
                        >
                          <strong>
                            {
                              conflict.inspectionId
                            }
                            {' — '}
                            {
                              conflict.establishmentName
                            }
                          </strong>

                          <Box>
                            {formatDateTime(
                              conflict.scheduledAt,
                            )}
                            {' hasta '}
                            {formatDateTime(
                              conflict.scheduledEndAt,
                            )}
                          </Box>
                        </Box>
                      ),
                    )}

                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            rescheduleConflictAcknowledged
                          }
                          onChange={(
                            event,
                          ) =>
                            setRescheduleConflictAcknowledged(
                              event.target
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
                      minRows={2}
                      sx={{ mt: 2 }}
                      label="Justificación del conflicto"
                      value={
                        rescheduleConflictComment
                      }
                      onChange={(event) =>
                        setRescheduleConflictComment(
                          event.target
                            .value,
                        )
                      }
                    />
                  </Paper>
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
                closeRescheduleDialog
              }
              disabled={saving}
            >
              Volver
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleReschedule()
              }
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <EditCalendarIcon />
                )
              }
            >
              Confirmar reprogramación
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={cancelTarget !== null}
          onClose={() => {
            if (!saving) {
              setCancelTarget(null)
              setCancellationReason('')
            }
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Cancelar inspección
          </DialogTitle>

          <DialogContent>
            {cancelTarget && (
              <>
                <Alert
                  severity="warning"
                  sx={{ mb: 3 }}
                >
                  Vas a cancelar la inspección{' '}
                  <strong>
                    {cancelTarget.id}
                  </strong>
                  . El registro permanecerá
                  visible en el historial.
                </Alert>

                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Motivo de la cancelación"
                  value={
                    cancellationReason
                  }
                  onChange={(event) =>
                    setCancellationReason(
                      event.target.value,
                    )
                  }
                  required
                />
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
              onClick={() => {
                setCancelTarget(null)
                setCancellationReason('')
              }}
              disabled={saving}
            >
              Volver
            </Button>

            <Button
              color="error"
              variant="contained"
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <CancelIcon />
                )
              }
              onClick={() =>
                void handleCancelInspection()
              }
            >
              Confirmar cancelación
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
    </LocalizationProvider>
  )
}

export default SchedulingPage