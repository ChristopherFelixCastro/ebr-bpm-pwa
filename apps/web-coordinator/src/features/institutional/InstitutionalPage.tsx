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

import EventNoteIcon from '@mui/icons-material/EventNote'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

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

function InstitutionalPage() {
  const navigate = useNavigate()

  const [
    institutionalCases,
    setInstitutionalCases,
  ] = useState<CoordinatorCase[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

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

  const [
    priority,
    setPriority,
  ] = useState<CasePriority>('Media')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const loadInstitutionalCases =
    async () => {
      setLoading(true)

      try {
        const caseData =
          await coordinatorApi.getCases()

        const institutional =
          caseData
            .filter(
              (item) =>
                item.origin ===
                'PROGRAMACION_INSTITUCIONAL',
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

        setInstitutionalCases(
          institutional,
        )
      } catch {
        setError(
          'No fue posible cargar las programaciones institucionales.',
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadInstitutionalCases()
    })
  }, [])

  const resetForm = () => {
    setReferenceCode('')
    setCompanyName('')
    setEstablishmentName('')
    setEstablishmentAddress('')
    setPriority('Media')
    setDescription('')
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!referenceCode.trim()) {
      setError(
        'Debes indicar una referencia para la programación institucional.',
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
        'Debes indicar el establecimiento.',
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
        'Debes indicar el motivo o descripción de la programación institucional.',
      )
      return
    }

    setSaving(true)

    try {
      const newCase =
        await coordinatorApi.createCase({
          origin:
            'PROGRAMACION_INSTITUCIONAL',
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
        `Programación institucional registrada. Se creó el caso ${newCase.id}.`,
      )

      resetForm()

      await loadInstitutionalCases()
    } catch (caughtError) {
      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message,
        )
      } else {
        setError(
          'No fue posible registrar la programación institucional.',
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
        }}
      >
        <EventNoteIcon
          color="primary"
          sx={{ mt: 0.7 }}
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
            Programación institucional
          </Box>

          <Box
            component="p"
            sx={{
              mt: 0.5,
              mb: 0,
              color: '#637083',
            }}
          >
            Registra evaluaciones
            originadas por la planificación
            institucional.
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
            m: 0,
            fontSize: '1.3rem',
          }}
        >
          Nueva programación institucional
        </Box>

        <Box
          component="p"
          sx={{
            mt: 0.7,
            mb: 3,
            color: '#637083',
          }}
        >
          Este registro generará un caso
          con origen PROGRAMACION_INSTITUCIONAL
          para continuar con el flujo de
          análisis y evaluación.
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
            label="Referencia institucional"
            value={referenceCode}
            placeholder="Ej. PI-2026-001"
            onChange={(event) =>
              setReferenceCode(
                event.target.value,
              )
            }
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
            label="Motivo o descripción"
            value={description}
            placeholder="Describe el motivo de la evaluación planificada..."
            onChange={(event) =>
              setDescription(
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
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <AddIcon />
              )
            }
            onClick={() =>
              void handleSubmit()
            }
          >
            Registrar programación
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
          component="h2"
          sx={{
            m: 0,
            fontSize: '1.3rem',
          }}
        >
          Programaciones institucionales
        </Box>

        <Box
          sx={{
            mt: 0.5,
            mb: 2,
            color: '#637083',
          }}
        >
          {institutionalCases.length}{' '}
          registro
          {institutionalCases.length ===
          1
            ? ''
            : 's'}
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
        ) : institutionalCases.length ===
          0 ? (
          <Alert severity="info">
            Todavía no existen
            programaciones institucionales
            registradas.
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
            }}
          >
            {institutionalCases.map(
              (caseData) => (
                <Paper
                  key={caseData.id}
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
                        {caseData.id}
                        {' — '}
                        {
                          caseData.establishmentName
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
                        {caseData.referenceCode ??
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
                          caseData.companyName
                        }
                      </Box>

                      {caseData.description && (
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
                            caseData.description
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
                          caseData.createdAt,
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
                          caseData.priority
                        }
                        color={
                          caseData.priority ===
                          'Urgente'
                            ? 'error'
                            : caseData.priority ===
                                'Alta'
                              ? 'warning'
                              : 'default'
                        }
                        variant="outlined"
                      />

                      <Chip
                        size="small"
                        label={
                          caseData.status
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
                            `/cases/${caseData.id}`,
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

export default InstitutionalPage