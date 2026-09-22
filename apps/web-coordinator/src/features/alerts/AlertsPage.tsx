import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
} from '@mui/material'

import AddAlertIcon from '@mui/icons-material/AddAlert'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { useNavigate } from 'react-router-dom'

import { coordinatorApi } from '../../api/coordinatorApi'

import type {
  CasePriority,
  CoordinatorCase,
} from '../../api/types'

function formatDateTime(
  value: string,
): string {
  return new Date(value).toLocaleString()
}

function AlertsPage() {
  const navigate = useNavigate()

  const [alerts, setAlerts] =
    useState<CoordinatorCase[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [
    referenceCode,
    setReferenceCode,
  ] = useState('')

  const [
    companyName,
    setCompanyName,
  ] = useState('')

  const [
    establishmentName,
    setEstablishmentName,
  ] = useState('')

  const [
    establishmentAddress,
    setEstablishmentAddress,
  ] = useState('')

  const [priority, setPriority] =
    useState<CasePriority>('Alta')

  const [
    description,
    setDescription,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const loadAlerts = async () => {
    setLoading(true)

    try {
      const caseData =
        await coordinatorApi.getCases()

      const alertCases = caseData
        .filter(
          (item) =>
            item.origin ===
            'ALERTA_LAPCH',
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

      setAlerts(alertCases)
    } catch {
      setError(
        'No fue posible cargar las alertas LAPCH.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadAlerts()
    })
  }, [])

  const resetForm = () => {
    setReferenceCode('')
    setCompanyName('')
    setEstablishmentName('')
    setEstablishmentAddress('')
    setPriority('Alta')
    setDescription('')
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!referenceCode.trim()) {
      setError(
        'Debes indicar el código o referencia de la alerta LAPCH.',
      )
      return
    }

    if (!companyName.trim()) {
      setError(
        'Debes indicar la empresa o razón social.',
      )
      return
    }

    if (!establishmentName.trim()) {
      setError(
        'Debes indicar el establecimiento relacionado con la alerta.',
      )
      return
    }

    if (
      !establishmentAddress.trim()
    ) {
      setError(
        'Debes indicar la dirección del establecimiento.',
      )
      return
    }

    if (!description.trim()) {
      setError(
        'Debes describir la alerta recibida.',
      )
      return
    }

    setSaving(true)

    try {
      const newCase =
        await coordinatorApi.createCase({
          origin: 'ALERTA_LAPCH',
          referenceCode:
            referenceCode.trim(),
          companyName:
            companyName.trim(),
          establishmentName:
            establishmentName.trim(),
          establishmentAddress:
            establishmentAddress.trim(),
          priority,
          description:
            description.trim(),
        })

      setSuccess(
        `Alerta registrada correctamente. Se creó el caso ${newCase.id}.`,
      )

      resetForm()

      await loadAlerts()
    } catch (caughtError) {
      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message,
        )
      } else {
        setError(
          'No fue posible registrar la alerta LAPCH.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          mb: 1,
        }}
      >
        <WarningAmberIcon
          color="warning"
          sx={{ mt: 0.7 }}
        />

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
            Alertas LAPCH
          </Box>

          <Box
            component="p"
            sx={{
              color: '#637083',
              mt: 0.5,
              mb: 0,
            }}
          >
            Registra alertas recibidas y
            genera el caso correspondiente
            para su análisis.
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
            mb: 0.7,
            fontSize: '1.3rem',
          }}
        >
          Registrar nueva alerta
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0,
            mb: 3,
            color: '#637083',
          }}
        >
          La alerta registrada generará
          automáticamente un caso con
          estado RECIBIDO.
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
            gap: 2.5,
          }}
        >
          <TextField
            fullWidth
            required
            label="Código o referencia LAPCH"
            value={referenceCode}
            onChange={(event) =>
              setReferenceCode(
                event.target.value,
              )
            }
            placeholder="Ej. LAPCH-2026-001"
          />

          <FormControl fullWidth>
            <InputLabel>
              Prioridad
            </InputLabel>

            <Select
              value={priority}
              label="Prioridad"
              onChange={(event) =>
                setPriority(
                  event.target
                    .value as CasePriority,
                )
              }
            >
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

          <TextField
            fullWidth
            required
            label="Empresa o razón social"
            value={companyName}
            onChange={(event) =>
              setCompanyName(
                event.target.value,
              )
            }
          />

          <TextField
            fullWidth
            required
            label="Establecimiento"
            value={establishmentName}
            onChange={(event) =>
              setEstablishmentName(
                event.target.value,
              )
            }
          />

          <TextField
            fullWidth
            required
            label="Dirección del establecimiento"
            value={
              establishmentAddress
            }
            onChange={(event) =>
              setEstablishmentAddress(
                event.target.value,
              )
            }
            sx={{
              gridColumn: {
                xs: 'auto',
                md: '1 / -1',
              },
            }}
          />

          <TextField
            fullWidth
            required
            multiline
            minRows={4}
            label="Descripción de la alerta"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Describe la situación reportada por LAPCH..."
            sx={{
              gridColumn: {
                xs: 'auto',
                md: '1 / -1',
              },
            }}
          />
        </Box>

        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent:
              'flex-end',
          }}
        >
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
                <AddAlertIcon />
              )
            }
            disabled={saving}
            onClick={() =>
              void handleSubmit()
            }
          >
            Registrar alerta
          </Button>
        </Box>
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
                fontSize: '1.3rem',
              }}
            >
              Alertas registradas
            </Box>

            <Box
              sx={{
                mt: 0.5,
                color: '#637083',
                fontSize: '0.9rem',
              }}
            >
              {alerts.length}{' '}
              alerta
              {alerts.length === 1
                ? ''
                : 's'}
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box
            sx={{
              py: 4,
              display: 'flex',
              justifyContent:
                'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : alerts.length === 0 ? (
          <Alert severity="info">
            Todavía no existen alertas
            LAPCH registradas.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
            }}
          >
            {alerts.map(
              (alert) => (
                <Paper
                  key={alert.id}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: {
                        xs:
                          'flex-start',
                        md: 'center',
                      },
                      flexDirection: {
                        xs: 'column',
                        md: 'row',
                      },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box
                        component="strong"
                        sx={{
                          display:
                            'block',
                          fontSize:
                            '1rem',
                        }}
                      >
                        {alert.id}
                        {' — '}
                        {
                          alert.establishmentName
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
                        Referencia:{' '}
                        {alert.referenceCode ??
                          'Sin referencia'}
                      </Box>

                      <Box
                        sx={{
                          mt: 0.3,
                          color:
                            '#637083',
                          fontSize:
                            '0.9rem',
                        }}
                      >
                        {
                          alert.companyName
                        }
                      </Box>

                      {alert.description && (
                        <Box
                          sx={{
                            mt: 1,
                            color:
                              '#637083',
                            fontSize:
                              '0.9rem',
                          }}
                        >
                          {
                            alert.description
                          }
                        </Box>
                      )}

                      <Box
                        sx={{
                          mt: 1,
                          color:
                            '#8a94a3',
                          fontSize:
                            '0.8rem',
                        }}
                      >
                        Registrada:{' '}
                        {formatDateTime(
                          alert.createdAt,
                        )}
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
                          alert.priority
                        }
                        color={
                          alert.priority ===
                          'Urgente'
                            ? 'error'
                            : alert.priority ===
                                'Alta'
                              ? 'warning'
                              : 'default'
                        }
                        variant="outlined"
                      />

                      <Chip
                        size="small"
                        label={
                          alert.status
                        }
                        color="primary"
                        variant="outlined"
                      />

                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={
                          <OpenInNewIcon />
                        }
                        onClick={() =>
                          navigate(
                            `/cases/${alert.id}`,
                          )
                        }
                      >
                        Abrir caso
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ),
            )}
          </Box>
        )}
      </Paper>

      <Snackbar
        open={success !== ''}
        autoHideDuration={4500}
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

export default AlertsPage