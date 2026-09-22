import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'

import SearchIcon from '@mui/icons-material/Search'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  CaseOrigin,
  CasePriority,
  CaseStatus,
  CoordinatorCase,
} from '../../api/types'

const statusLabels: Record<
  CaseStatus,
  string
> = {
  RECIBIDO: 'Recibido',
  EN_ANALISIS: 'En análisis',
  PROCEDE_EVALUACION:
    'Procede evaluación',
  PROGRAMADO: 'Programado',
  NO_PROCEDE: 'No procede',
  REMITIDO: 'Remitido',
  CANCELADO: 'Cancelado',
}

const originLabels: Record<
  CaseOrigin,
  string
> = {
  SOLICITUD_EMPRESA:
    'Solicitud de empresa',
  PROGRAMACION_INSTITUCIONAL:
    'Programación institucional',
  ALERTA_LAPCH: 'Alerta LAPCH',
  DENUNCIA: 'Denuncia',
}

function getPriorityColor(
  priority: CasePriority,
) {
  switch (priority) {
    case 'Urgente':
      return 'error'

    case 'Alta':
      return 'warning'

    case 'Media':
      return 'primary'

    default:
      return 'default'
  }
}

function isCaseStatus(
  value: string | null,
): value is CaseStatus {
  return (
    value === 'RECIBIDO' ||
    value === 'EN_ANALISIS' ||
    value ===
      'PROCEDE_EVALUACION' ||
    value === 'PROGRAMADO' ||
    value === 'NO_PROCEDE' ||
    value === 'REMITIDO' ||
    value === 'CANCELADO'
  )
}

function isCasePriority(
  value: string | null,
): value is CasePriority {
  return (
    value === 'Baja' ||
    value === 'Media' ||
    value === 'Alta' ||
    value === 'Urgente'
  )
}

function isCaseOrigin(
  value: string | null,
): value is CaseOrigin {
  return (
    value ===
      'SOLICITUD_EMPRESA' ||
    value ===
      'PROGRAMACION_INSTITUCIONAL' ||
    value === 'ALERTA_LAPCH' ||
    value === 'DENUNCIA'
  )
}

function CasesPage() {
  const navigate = useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [
    cases,
    setCases,
  ] = useState<CoordinatorCase[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get('search') ?? '',
  )

  const [
    status,
    setStatus,
  ] = useState<
    CaseStatus | 'TODOS'
  >(() => {
    const value =
      searchParams.get('status')

    return isCaseStatus(value)
      ? value
      : 'TODOS'
  })

  const [
    priority,
    setPriority,
  ] = useState<
    CasePriority | 'TODAS'
  >(() => {
    const value =
      searchParams.get('priority')

    return isCasePriority(value)
      ? value
      : 'TODAS'
  })

  const [
    origin,
    setOrigin,
  ] = useState<
    CaseOrigin | 'TODOS'
  >(() => {
    const value =
      searchParams.get('origin')

    return isCaseOrigin(value)
      ? value
      : 'TODOS'
  })

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true)
      setError('')

      try {
        const data =
          await coordinatorApi.getCases()

        setCases(data)
      } catch {
        setError(
          'No fue posible cargar los casos.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCases()
  }, [])

  useEffect(() => {
    const newParams =
      new URLSearchParams()

    if (search.trim()) {
      newParams.set(
        'search',
        search.trim(),
      )
    }

    if (status !== 'TODOS') {
      newParams.set(
        'status',
        status,
      )
    }

    if (priority !== 'TODAS') {
      newParams.set(
        'priority',
        priority,
      )
    }

    if (origin !== 'TODOS') {
      newParams.set(
        'origin',
        origin,
      )
    }

    setSearchParams(
      newParams,
      {
        replace: true,
      },
    )
  }, [
    search,
    status,
    priority,
    origin,
    setSearchParams,
  ])

  const filteredCases =
    useMemo(() => {
      const normalizedSearch =
        search
          .toLowerCase()
          .trim()

      return cases.filter(
        (item) => {
          const matchesSearch =
            normalizedSearch === '' ||
            item.id
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            item.companyName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            item.establishmentName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            (
              item.referenceCode ??
              ''
            )
              .toLowerCase()
              .includes(
                normalizedSearch,
              )

          const matchesStatus =
            status === 'TODOS' ||
            item.status === status

          const matchesPriority =
            priority === 'TODAS' ||
            item.priority ===
              priority

          const matchesOrigin =
            origin === 'TODOS' ||
            item.origin === origin

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority &&
            matchesOrigin
          )
        },
      )
    }, [
      cases,
      search,
      status,
      priority,
      origin,
    ])

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== 'TODOS' ||
    priority !== 'TODAS' ||
    origin !== 'TODOS'

  const clearFilters = () => {
    setSearch('')
    setStatus('TODOS')
    setPriority('TODAS')
    setOrigin('TODOS')
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
        Casos
      </Box>

      <Box
        component="p"
        sx={{
          color: '#637083',
          mt: 0,
          mb: 3,
        }}
      >
        Bandeja de casos y
        expedientes recibidos por
        Coordinación.
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
          p: 2.5,
          mb: 3,
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            label="Buscar"
            placeholder="ID, referencia, empresa o establecimiento"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            sx={{
              minWidth: 280,
              flexGrow: 1,
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl
            sx={{
              minWidth: 220,
            }}
          >
            <InputLabel>
              Origen
            </InputLabel>

            <Select
              value={origin}
              label="Origen"
              onChange={(event) =>
                setOrigin(
                  event.target
                    .value as
                    | CaseOrigin
                    | 'TODOS',
                )
              }
            >
              <MenuItem value="TODOS">
                Todos
              </MenuItem>

              <MenuItem value="SOLICITUD_EMPRESA">
                Solicitud de empresa
              </MenuItem>

              <MenuItem value="PROGRAMACION_INSTITUCIONAL">
                Programación institucional
              </MenuItem>

              <MenuItem value="ALERTA_LAPCH">
                Alerta LAPCH
              </MenuItem>

              <MenuItem value="DENUNCIA">
                Denuncia
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl
            sx={{
              minWidth: 210,
            }}
          >
            <InputLabel>
              Estado
            </InputLabel>

            <Select
              value={status}
              label="Estado"
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    | CaseStatus
                    | 'TODOS',
                )
              }
            >
              <MenuItem value="TODOS">
                Todos
              </MenuItem>

              <MenuItem value="RECIBIDO">
                Recibido
              </MenuItem>

              <MenuItem value="EN_ANALISIS">
                En análisis
              </MenuItem>

              <MenuItem value="PROCEDE_EVALUACION">
                Procede evaluación
              </MenuItem>

              <MenuItem value="PROGRAMADO">
                Programado
              </MenuItem>

              <MenuItem value="NO_PROCEDE">
                No procede
              </MenuItem>

              <MenuItem value="REMITIDO">
                Remitido
              </MenuItem>

              <MenuItem value="CANCELADO">
                Cancelado
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl
            sx={{
              minWidth: 180,
            }}
          >
            <InputLabel>
              Prioridad
            </InputLabel>

            <Select
              value={priority}
              label="Prioridad"
              onChange={(event) =>
                setPriority(
                  event.target
                    .value as
                    | CasePriority
                    | 'TODAS',
                )
              }
            >
              <MenuItem value="TODAS">
                Todas
              </MenuItem>

              <MenuItem value="Baja">
                Baja
              </MenuItem>

              <MenuItem value="Media">
                Media
              </MenuItem>

              <MenuItem value="Alta">
                Alta
              </MenuItem>

              <MenuItem value="Urgente">
                Urgente
              </MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={
              <FilterAltOffIcon />
            }
            disabled={
              !hasActiveFilters
            }
            onClick={clearFilters}
            sx={{
              minHeight: 56,
            }}
          >
            Limpiar
          </Button>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Chip
            label={`${filteredCases.length} de ${cases.length} casos`}
            color={
              hasActiveFilters
                ? 'primary'
                : 'default'
            }
            variant="outlined"
          />

          {origin !== 'TODOS' && (
            <Chip
              label={`Origen: ${originLabels[origin]}`}
              size="small"
              onDelete={() =>
                setOrigin('TODOS')
              }
            />
          )}

          {status !== 'TODOS' && (
            <Chip
              label={`Estado: ${statusLabels[status]}`}
              size="small"
              onDelete={() =>
                setStatus('TODOS')
              }
            />
          )}

          {priority !== 'TODAS' && (
            <Chip
              label={`Prioridad: ${priority}`}
              size="small"
              onDelete={() =>
                setPriority('TODAS')
              }
            />
          )}
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border:
            '1px solid #d9e2ec',
          borderRadius: 3,
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: '#edf7fc',
              }}
            >
              <TableCell>
                <strong>ID</strong>
              </TableCell>

              <TableCell>
                <strong>
                  Origen
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Empresa /
                  Establecimiento
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Prioridad
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Estado
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Actualización
                </strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredCases.map(
              (item) => (
                <TableRow
                  key={item.id}
                  hover
                  onClick={() =>
                    navigate(
                      `/cases/${item.id}`,
                    )
                  }
                  sx={{
                    cursor:
                      'pointer',
                  }}
                >
                  <TableCell>
                    <strong>
                      {item.id}
                    </strong>

                    {item.referenceCode && (
                      <Box
                        sx={{
                          mt: 0.4,
                          color:
                            '#637083',
                          fontSize:
                            '0.78rem',
                        }}
                      >
                        {
                          item.referenceCode
                        }
                      </Box>
                    )}
                  </TableCell>

                  <TableCell>
                    {
                      originLabels[
                        item.origin
                      ]
                    }
                  </TableCell>

                  <TableCell>
                    <Box
                      sx={{
                        fontWeight:
                          600,
                      }}
                    >
                      {
                        item.companyName
                      }
                    </Box>

                    <Box
                      sx={{
                        fontSize:
                          '0.85rem',
                        color:
                          '#637083',
                      }}
                    >
                      {
                        item.establishmentName
                      }
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        item.priority
                      }
                      color={getPriorityColor(
                        item.priority,
                      )}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        statusLabels[
                          item.status
                        ]
                      }
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    {new Date(
                      item.updatedAt,
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              ),
            )}

            {filteredCases.length ===
              0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ py: 6 }}
                >
                  No se encontraron
                  casos con los filtros
                  seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default CasesPage