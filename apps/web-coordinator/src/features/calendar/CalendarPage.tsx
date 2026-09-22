import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/es'
import type { Dayjs } from 'dayjs'

dayjs.locale('es')

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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  Evaluator,
  Inspection,
} from '../../api/types'

type CalendarView =
  | 'month'
  | 'week'
  | 'day'

interface CalendarDay {
  date: Dayjs
  isCurrentMonth: boolean
}

function formatTime(
  value?: string,
): string {
  if (!value) {
    return '--:--'
  }

  return dayjs(value).format('HH:mm')
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return 'Sin fecha'
  }

  return dayjs(value).format(
    'DD/MM/YYYY',
  )
}

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return 'Sin fecha'
  }

  return dayjs(value).format(
    'DD/MM/YYYY HH:mm',
  )
}

function getStatusLabel(
  inspection: Inspection,
): string {
  if (
    inspection.status === 'CANCELADA'
  ) {
    return 'Cancelada'
  }

  if (
    inspection.status === 'ASIGNADA'
  ) {
    return 'Asignada'
  }

  return 'Programada'
}

function CalendarPage() {
  const navigate = useNavigate()
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

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    currentDate,
    setCurrentDate,
  ] = useState<Dayjs>(dayjs())

  const requestedView = searchParams.get('view')

  const view: CalendarView =
    requestedView === 'day' ||
    requestedView === 'week' ||
    requestedView === 'month'
      ? requestedView
      : 'month'

  const handleViewChange = (
    newView: CalendarView,
  ) => {
    const nextParams =
      new URLSearchParams(searchParams)

    nextParams.set('view', newView)
    setSearchParams(nextParams, {
      replace: true,
    })
  }

  const [
    selectedInspection,
    setSelectedInspection,
  ] = useState<Inspection | null>(
    null,
  )

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        inspectionData,
        evaluatorData,
      ] = await Promise.all([
        coordinatorApi.getInspections(),
        coordinatorApi.getEvaluators(),
      ])

      setInspections(
        inspectionData,
      )

      setEvaluators(
        evaluatorData,
      )
    } catch {
      setError(
        'No fue posible cargar el calendario.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadData()
    })
  }, [])

  const visibleInspections =
    useMemo(
      () =>
        inspections.filter(
          (inspection) =>
            Boolean(inspection.scheduledAt) &&
            inspection.status !== 'CANCELADA',
        ),
      [inspections],
    )

  const evaluatorMap = useMemo(
    () =>
      new Map(
        evaluators.map(
          (evaluator) => [
            evaluator.id,
            evaluator.fullName,
          ],
        ),
      ),
    [evaluators],
  )

  const monthDays =
    useMemo<CalendarDay[]>(() => {
      const firstDay =
        currentDate.startOf(
          'month',
        )

      const lastDay =
        currentDate.endOf('month')

      const gridStart =
        firstDay.startOf('week')

      const gridEnd =
        lastDay.endOf('week')

      const days: CalendarDay[] =
        []

      let cursor = gridStart

      while (
        cursor.isBefore(gridEnd) ||
        cursor.isSame(
          gridEnd,
          'day',
        )
      ) {
        days.push({
          date: cursor,
          isCurrentMonth:
            cursor.month() ===
            currentDate.month(),
        })

        cursor = cursor.add(
          1,
          'day',
        )
      }

      return days
    }, [currentDate])

  const weekDays =
    useMemo(() => {
      const start =
        currentDate.startOf(
          'week',
        )

      return Array.from(
        { length: 7 },
        (_, index) =>
          start.add(index, 'day'),
      )
    }, [currentDate])

  const getInspectionsForDay = useCallback(
    (date: Dayjs) =>
      visibleInspections
        .filter((inspection) =>
          dayjs(
            inspection.scheduledAt,
          ).isSame(date, 'day'),
        )
        .sort(
          (a, b) =>
            dayjs(
              a.scheduledAt,
            ).valueOf() -
            dayjs(
              b.scheduledAt,
            ).valueOf(),
        ),
    [visibleInspections],
  )

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(
        currentDate.subtract(
          1,
          'month',
        ),
      )

      return
    }

    if (view === 'week') {
      setCurrentDate(
        currentDate.subtract(
          1,
          'week',
        ),
      )

      return
    }

    setCurrentDate(
      currentDate.subtract(
        1,
        'day',
      ),
    )
  }

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(
        currentDate.add(
          1,
          'month',
        ),
      )

      return
    }

    if (view === 'week') {
      setCurrentDate(
        currentDate.add(
          1,
          'week',
        ),
      )

      return
    }

    setCurrentDate(
      currentDate.add(
        1,
        'day',
      ),
    )
  }

  const handleToday = () => {
    setCurrentDate(dayjs())
  }

  const title = useMemo(() => {
    if (view === 'month') {
      const formatted =
        currentDate.format(
          'MMMM YYYY',
        )

      return (
        formatted
          .charAt(0)
          .toUpperCase() +
        formatted.slice(1)
      )
    }

    if (view === 'week') {
      const start =
        currentDate.startOf(
          'week',
        )

      const end =
        currentDate.endOf(
          'week',
        )

      return `${start.format(
        'DD/MM/YYYY',
      )} - ${end.format(
        'DD/MM/YYYY',
      )}`
    }

    return currentDate.format(
      'DD/MM/YYYY',
    )
  }, [currentDate, view])

  const todayInspections =
    useMemo(
      () =>
        getInspectionsForDay(
          currentDate,
        ),
      [
        currentDate,
        getInspectionsForDay,
      ],
    )

  const renderInspectionCard = (
    inspection: Inspection,
    compact = false,
  ) => {
    const evaluatorName =
      inspection.assignedEvaluatorId
        ? evaluatorMap.get(
            inspection.assignedEvaluatorId,
          )
        : undefined

    const cancelled =
      inspection.status ===
      'CANCELADA'

    return (
      <Paper
        key={inspection.id}
        variant="outlined"
        onClick={() =>
          setSelectedInspection(
            inspection,
          )
        }
        sx={{
          p: compact ? 1 : 1.5,
          borderRadius: 2,
          cursor: 'pointer',
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          opacity: cancelled
            ? 0.65
            : 1,
          bgcolor: cancelled
            ? '#f5f5f5'
            : 'white',
          '&:hover': {
            boxShadow:
              '0 3px 12px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent:
              'space-between',
            gap: 1,
            alignItems:
              'flex-start',
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <Box
              component="strong"
              sx={{
                display: 'block',
                fontSize: compact
                  ? '0.78rem'
                  : '0.9rem',
                overflow: 'hidden',
                textOverflow:
                  'ellipsis',
                whiteSpace:
                  compact
                    ? 'nowrap'
                    : 'normal',
              }}
            >
              {
                inspection.establishmentName
              }
            </Box>

            <Box
              sx={{
                mt: 0.3,
                color: '#637083',
                fontSize: compact
                  ? '0.72rem'
                  : '0.82rem',
              }}
            >
              {formatTime(
                inspection.scheduledAt,
              )}
              {' - '}
              {formatTime(
                inspection.scheduledEndAt,
              )}
            </Box>

            {!compact && (
              <Box
                sx={{
                  mt: 0.5,
                  color:
                    '#637083',
                  fontSize:
                    '0.82rem',
                }}
              >
                Técnico:{' '}
                {evaluatorName ??
                  'Sin asignar'}
              </Box>
            )}
          </Box>

          {!compact && (
            <Chip
              size="small"
              label={getStatusLabel(
                inspection,
              )}
              color={
                cancelled
                  ? 'default'
                  : 'primary'
              }
              variant="outlined"
            />
          )}
        </Box>

        {inspection.conflictAcknowledged &&
          !compact && (
            <Box sx={{ mt: 1 }}>
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                icon={
                  <WarningAmberIcon />
                }
                label="Conflicto confirmado"
              />
            </Box>
          )}
      </Paper>
    )
  }

  const renderMonthView = () => (
    <Paper
      elevation={0}
      sx={{
        border:
          '1px solid #d9e2ec',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(7, 1fr)',
          bgcolor: '#f7f9fc',
          borderBottom:
            '1px solid #d9e2ec',
        }}
      >
        {[
          'Dom',
          'Lun',
          'Mar',
          'Mié',
          'Jue',
          'Vie',
          'Sáb',
        ].map((day) => (
          <Box
            key={day}
            sx={{
              p: 1.5,
              textAlign: 'center',
              fontWeight: 700,
              color: '#637083',
              fontSize: '0.85rem',
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(7, minmax(0, 1fr))',
        }}
      >
        {monthDays.map(
          ({
            date,
            isCurrentMonth,
          }) => {
            const dayInspections =
              getInspectionsForDay(
                date,
              )

            const isToday =
              date.isSame(
                dayjs(),
                'day',
              )

            return (
              <Box
                key={
                  date.format(
                    'YYYY-MM-DD',
                  )
                }
                onDoubleClick={() => {
                  setCurrentDate(date)
                  handleViewChange('day')
                }}
                sx={{
                  minHeight: 145,
                  p: 1,
                  borderRight:
                    '1px solid #e6ecf2',
                  borderBottom:
                    '1px solid #e6ecf2',
                  bgcolor:
                    isCurrentMonth
                      ? 'white'
                      : '#fafbfc',
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    borderRadius:
                      '50%',
                    mb: 0.8,
                    fontWeight:
                      isToday
                        ? 700
                        : 500,
                    bgcolor:
                      isToday
                        ? 'primary.main'
                        : 'transparent',
                    color:
                      isToday
                        ? 'white'
                        : isCurrentMonth
                          ? '#172033'
                          : '#a5afbd',
                  }}
                >
                  {date.date()}
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 0.6,
                  }}
                >
                  {dayInspections
                    .slice(0, 3)
                    .map(
                      (
                        inspection,
                      ) =>
                        renderInspectionCard(
                          inspection,
                          true,
                        ),
                    )}

                  {dayInspections.length >
                    3 && (
                    <Button
                      size="small"
                      onClick={() => {
                        setCurrentDate(
                          date,
                        )
                        handleViewChange(
                          'day',
                        )
                      }}
                      sx={{
                        justifyContent:
                          'flex-start',
                        fontSize:
                          '0.72rem',
                        p: 0.3,
                      }}
                    >
                      +
                      {dayInspections.length -
                        3}{' '}
                      más
                    </Button>
                  )}
                </Box>
              </Box>
            )
          },
        )}
      </Box>
    </Paper>
  )

  const renderWeekView = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md:
            'repeat(7, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {weekDays.map((date) => {
        const dayInspections =
          getInspectionsForDay(
            date,
          )

        const isToday =
          date.isSame(
            dayjs(),
            'day',
          )

        return (
          <Paper
            key={date.format(
              'YYYY-MM-DD',
            )}
            elevation={0}
            sx={{
              minHeight: 360,
              minWidth: 0,
              overflow: 'hidden',
              p: 1.5,
              border:
                isToday
                  ? '2px solid'
                  : '1px solid #d9e2ec',
              borderColor:
                isToday
                  ? 'primary.main'
                  : '#d9e2ec',
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                textAlign:
                  'center',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  color:
                    '#637083',
                  fontSize:
                    '0.8rem',
                  textTransform:
                    'uppercase',
                }}
              >
                {date.format(
                  'ddd',
                )}
              </Box>

              <Box
                sx={{
                  fontSize:
                    '1.4rem',
                  fontWeight: 700,
                }}
              >
                {date.format(
                  'DD',
                )}
              </Box>
            </Box>

            {dayInspections.length ===
            0 ? (
              <Box
                sx={{
                  color:
                    '#9aa4b2',
                  fontSize:
                    '0.8rem',
                  textAlign:
                    'center',
                  mt: 3,
                }}
              >
                Sin evaluaciones
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  minWidth: 0,
                }}
              >
                {dayInspections.map(
                  (
                    inspection,
                  ) =>
                    renderInspectionCard(
                      inspection,
                      true,
                    ),
                )}
              </Box>
            )}
          </Paper>
        )
      })}
    </Box>
  )

  const renderDayView = () => (
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
          m: 0,
          mb: 0.5,
          fontSize: '1.3rem',
        }}
      >
        {currentDate.format(
          'DD/MM/YYYY',
        )}
      </Box>

      <Box
        sx={{
          color: '#637083',
          mb: 3,
        }}
      >
        {
          todayInspections.length
        }{' '}
        evaluación
        {todayInspections.length ===
        1
          ? ''
          : 'es'}
      </Box>

      {todayInspections.length ===
      0 ? (
        <Alert severity="info">
          No existen evaluaciones
          programadas para este día.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
          }}
        >
          {todayInspections.map(
            (inspection) =>
              renderInspectionCard(
                inspection,
              ),
          )}
        </Box>
      )}
    </Paper>
  )

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
          mb: 3,
        }}
      >
        <Box>
          <Box
            component="h1"
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#172033',
              m: 0,
            }}
          >
            Calendario
          </Box>

          <Box
            component="p"
            sx={{
              color: '#637083',
              mt: 0.5,
              mb: 0,
            }}
          >
            Consulta las evaluaciones
            programadas por día,
            semana o mes.
          </Box>
        </Box>
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
          p: 2,
          mb: 3,
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
            alignItems: {
              xs: 'stretch',
              md: 'center',
            },
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems:
                'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outlined"
              startIcon={
                <TodayIcon />
              }
              onClick={
                handleToday
              }
            >
              Hoy
            </Button>

            <Button
              variant="outlined"
              onClick={
                handlePrevious
              }
              sx={{
                minWidth: 42,
              }}
            >
              <ChevronLeftIcon />
            </Button>

            <Button
              variant="outlined"
              onClick={
                handleNext
              }
              sx={{
                minWidth: 42,
              }}
            >
              <ChevronRightIcon />
            </Button>

            <Box
              sx={{
                ml: {
                  xs: 0,
                  md: 1,
                },
                fontWeight: 700,
                fontSize:
                  '1.05rem',
              }}
            >
              {title}
            </Box>
          </Box>

          <ToggleButtonGroup
            exclusive
            value={view}
            onChange={(
              _event,
              newValue:
                | CalendarView
                | null,
            ) => {
              if (newValue) {
                handleViewChange(
                  newValue,
                )
              }
            }}
            size="small"
          >
            <ToggleButton value="day">
              Día
            </ToggleButton>

            <ToggleButton value="week">
              Semana
            </ToggleButton>

            <ToggleButton value="month">
              Mes
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {view === 'month' &&
        renderMonthView()}

      {view === 'week' &&
        renderWeekView()}

      {view === 'day' &&
        renderDayView()}

      <Dialog
        open={
          selectedInspection !==
          null
        }
        onClose={() =>
          setSelectedInspection(
            null,
          )
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Detalle de evaluación
        </DialogTitle>

        <DialogContent>
          {selectedInspection && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'flex-start',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Box
                    component="strong"
                    sx={{
                      display:
                        'block',
                      fontSize:
                        '1.15rem',
                    }}
                  >
                    {
                      selectedInspection.establishmentName
                    }
                  </Box>

                  <Box
                    sx={{
                      color:
                        '#637083',
                      mt: 0.5,
                    }}
                  >
                    {
                      selectedInspection.id
                    }
                  </Box>
                </Box>

                <Chip
                  label={getStatusLabel(
                    selectedInspection,
                  )}
                  color={
                    selectedInspection.status ===
                    'CANCELADA'
                      ? 'default'
                      : 'primary'
                  }
                  variant="outlined"
                />
              </Box>

              <Divider
                sx={{ mb: 2 }}
              />

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                  }}
                >
                  <AccessTimeIcon
                    color="action"
                  />

                  <Box>
                    <Box
                      component="strong"
                    >
                      Horario
                    </Box>

                    <Box
                      sx={{
                        color:
                          '#637083',
                      }}
                    >
                      {formatDateTime(
                        selectedInspection.scheduledAt,
                      )}
                      {' hasta '}
                      {formatDateTime(
                        selectedInspection.scheduledEndAt,
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                  }}
                >
                  <PersonIcon
                    color="action"
                  />

                  <Box>
                    <Box
                      component="strong"
                    >
                      Técnico
                    </Box>

                    <Box
                      sx={{
                        color:
                          '#637083',
                      }}
                    >
                      {selectedInspection.assignedEvaluatorId
                        ? evaluatorMap.get(
                            selectedInspection.assignedEvaluatorId,
                          ) ??
                          'Técnico no encontrado'
                        : 'Sin asignar'}
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                  }}
                >
                  <BusinessIcon
                    color="action"
                  />

                  <Box>
                    <Box
                      component="strong"
                    >
                      Establecimiento
                    </Box>

                    <Box
                      sx={{
                        color:
                          '#637083',
                      }}
                    >
                      {
                        selectedInspection.establishmentName
                      }
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                  }}
                >
                  <LocationOnIcon
                    color="action"
                  />

                  <Box>
                    <Box
                      component="strong"
                    >
                      Dirección
                    </Box>

                    <Box
                      sx={{
                        color:
                          '#637083',
                      }}
                    >
                      {
                        selectedInspection.establishmentAddress
                      }
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                  }}
                >
                  <CalendarMonthIcon
                    color="action"
                  />

                  <Box>
                    <Box
                      component="strong"
                    >
                      Caso
                    </Box>

                    <Box
                      sx={{
                        color:
                          '#637083',
                      }}
                    >
                      {
                        selectedInspection.caseId
                      }
                    </Box>
                  </Box>
                </Box>
              </Box>

              {selectedInspection.conflictAcknowledged && (
                <Alert
                  severity="warning"
                  sx={{ mt: 3 }}
                  icon={
                    <WarningAmberIcon />
                  }
                >
                  Esta programación fue
                  confirmada a pesar de
                  tener un conflicto de
                  agenda.
                  {selectedInspection.conflictComment
                    ? ` Justificación: ${selectedInspection.conflictComment}`
                    : ''}
                </Alert>
              )}

              {selectedInspection.status ===
                'CANCELADA' &&
                selectedInspection.cancellationReason && (
                  <Alert
                    severity="error"
                    sx={{ mt: 3 }}
                  >
                    Motivo de cancelación:{' '}
                    {
                      selectedInspection.cancellationReason
                    }
                  </Alert>
                )}

              <Box
                sx={{
                  mt: 2,
                  color: '#8a94a3',
                  fontSize:
                    '0.8rem',
                }}
              >
                Última actualización:{' '}
                {formatDate(
                  selectedInspection.updatedAt,
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {selectedInspection &&
            selectedInspection.status !== 'CANCELADA' && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const inspectionId = selectedInspection.id
                    setSelectedInspection(null)
                    navigate(
                      `/scheduling?inspectionId=${encodeURIComponent(inspectionId)}`,
                    )
                  }}
                >
                  Reprogramar
                </Button>

                <Button
                  variant="contained"
                  onClick={() => {
                    const inspectionId = selectedInspection.id
                    setSelectedInspection(null)
                    navigate(
                      `/assignments?inspectionId=${encodeURIComponent(inspectionId)}`,
                    )
                  }}
                >
                  Reasignar técnico
                </Button>
              </>
            )}

          <Button
            onClick={() =>
              setSelectedInspection(
                null,
              )
            }
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CalendarPage