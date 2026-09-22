import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Paper,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FilePicker } from '../../components/FilePicker';
import { apiService } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import type { Company, RequestDocument, Role } from '../../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [fullName, setFullName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('ADMIN_EMPRESA');
  const [companyId, setCompanyId] = useState('');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [authLetter, setAuthLetter] = useState<RequestDocument | null>(null);

  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      const data = await apiService.getCompanies();
      setCompanies(data);
      if (data.length > 0) {
        setCompanyId(data[0].id);
      }
    };
    fetchCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!fullName.trim() || !identityNumber.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Por favor complete todos los campos obligatorios marcados con (*)');
      return;
    }

    if (!authLetter) {
      setErrorMessage('Es obligatorio adjuntar la Carta de Autorización o Poder Notariado de la empresa (máx. 5 MB).');
      return;
    }

    try {
      setLoading(true);
      const selectedCompany = companies.find((c) => c.id === companyId);
      const companyName = companyId === 'NEW' ? customCompanyName : selectedCompany?.legalName;

      await apiService.registerUser({
        fullName,
        identityNumber,
        email,
        phone,
        role,
        companyId: companyId === 'NEW' ? undefined : companyId,
        companyName,
        authorizationLetterName: authLetter.name,
        authorizationLetterUrl: authLetter.url,
      });

      showSuccess('Solicitud de registro enviada con éxito');
      setRegisteredSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el registro.');
      showError(err.message || 'Error al procesar el registro.');
    } finally {
      setLoading(false);
    }
  };

  if (registeredSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 540,
            width: '100%',
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #E2E8F0',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#DCFCE7',
              color: '#15803D',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 42 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
            Registro en Proceso de Validación
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569', mb: 3 }}>
            Su solicitud de cuenta con rol <strong>{role}</strong> ha sido registrada con estado{' '}
            <strong style={{ color: '#D97706' }}>PENDIENTE_VALIDACION</strong>.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#F8FAFC', textAlign: 'left' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
              Pasos siguientes:
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              1. Un Administrador Central evaluará su Carta de Autorización adjunta.
              <br />
              2. Una vez aprobada la validación, podrá acceder con sus credenciales.
            </Typography>
          </Paper>

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/login')}
            sx={{ px: 4, py: 1.2, bgcolor: '#1E3A8A' }}
          >
            Volver a Iniciar Sesión
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        py: 4,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          maxWidth: 720,
          width: '100%',
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <ShieldIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Registro de Usuario y Empresa
            </Typography>
            <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
              Portal de Autenticación EBR/BPM - Módulo de Identidad
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
              1. Datos Personales del Solicitante
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Nombre Completo *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Ing. Manuel Morales"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Cédula o Pasaporte *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. 031-0129482-3"
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Electrónico Corporativo *
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="usuario@empresa.com.do"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Teléfono de Contacto
                </Typography>
                <TextField
                  fullWidth
                  placeholder="(809) 555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Contraseña Segura *
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2 }}>
              2. Rol y Empresa Asociada
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Rol Solicitado *
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <MenuItem value="ADMIN_EMPRESA">Administrador de Empresa (Gestor Principal)</MenuItem>
                  <MenuItem value="DELEGADO">Usuario Delegado (Representante de Sede)</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Empresa Representada *
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.legalName} ({c.rnc})
                    </MenuItem>
                  ))}
                  <MenuItem value="NEW">+ Registrar Nueva Empresa</MenuItem>
                </TextField>
              </Grid>

              {companyId === 'NEW' && (
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Nombre o Razón Social de la Nueva Empresa *
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ej. Industrias Agroalimentarias del Norte, S.R.L."
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                  />
                </Grid>
              )}
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
              3. Carta de Autorización Obligatoria
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
              Debe adjuntar la Carta de Designación o Poder Notariado firmado por el Representante Legal que acredita su facultad para radicar solicitudes BPM en nombre de la empresa.
            </Typography>

            <FilePicker
              label="Carta de Designación / Autorización Corporativa"
              documentType="Carta de Autorización"
              required
              helperText="PDF o Imagen escaneada, máx. 5 MB"
              onFileUploaded={(doc) => setAuthLetter(doc)}
              onFileRemoved={() => setAuthLetter(null)}
              existingDocument={authLetter}
            />

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/login')}
              >
                Volver al Login
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{
                  px: 4,
                  py: 1.2,
                  bgcolor: '#1E3A8A',
                  '&:hover': { bgcolor: '#1E40AF' },
                }}
              >
                {loading ? 'Procesando...' : 'Enviar Solicitud de Registro'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
