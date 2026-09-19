import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Por favor ingrese su correo electrónico');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await login(email);
      showSuccess('Inicio de sesión exitoso');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
      showError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Secret123*');
  };

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
          maxWidth: 480,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Header with #1E3A8A institutional accent */}
        <Box
          sx={{
            p: 3.5,
            textAlign: 'center',
            backgroundColor: '#1E3A8A',
            color: '#FFFFFF',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              mb: 1.5,
            }}
          >
            <ShieldIcon sx={{ fontSize: 38, color: '#FFFFFF' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
            Sistema EBR / BPM
          </Typography>
          <Typography variant="body2" sx={{ color: '#BFDBFE', mt: 0.5 }}>
            Portal de Identidad, Empresas y Solicitudes
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
            Ingrese sus credenciales para acceder al módulo administrativo
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ color: '#0F172A', mb: 0.75 }}>
                Correo Electrónico
              </Typography>
              <TextField
                fullWidth
                placeholder="ejemplo@salud.gob.do"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography variant="subtitle2" sx={{ color: '#0F172A' }}>
                  Contraseña
                </Typography>
                <RouterLink
                  to="/forgot-password"
                  style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  ¿Olvidó su contraseña?
                </RouterLink>
              </Box>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff sx={{ color: '#94A3B8' }} /> : <Visibility sx={{ color: '#94A3B8' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{
                py: 1.3,
                fontSize: '0.95rem',
                backgroundColor: '#1E3A8A',
                '&:hover': { backgroundColor: '#1E40AF' },
              }}
            >
              {loading ? 'Verificando...' : 'Acceder al Sistema'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              ¿No tiene una cuenta corporativa?{' '}
              <RouterLink
                to="/register"
                style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}
              >
                Registrar Empresa / Usuario
              </RouterLink>
            </Typography>
          </Box>

          {/* Quick Login Helper Box */}
          <Divider sx={{ my: 3 }} />
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: '#F8FAFC',
              borderColor: '#E2E8F0',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
              ACCESOS RÁPIDOS DE DEMOSTRACIÓN:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={() => handleQuickLogin('ivan.jimenez@salud.gob.do')}
                sx={{
                  justifyContent: 'space-between',
                  py: 0.5,
                  px: 1.5,
                  fontSize: '0.78rem',
                  borderColor: '#CBD5E1',
                }}
              >
                <span>👤 Iván Jiménez (Administrador Central)</span>
                <Chip label="Admin" size="small" sx={{ height: 20, bgcolor: '#1E3A8A', color: '#fff', fontSize: '0.68rem' }} />
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={() => handleQuickLogin('cmendoza@lacteoscibao.com.do')}
                sx={{
                  justifyContent: 'space-between',
                  py: 0.5,
                  px: 1.5,
                  fontSize: '0.78rem',
                  borderColor: '#CBD5E1',
                }}
              >
                <span>🏢 Carlos Mendoza (Lácteos del Cibao)</span>
                <Chip label="Empresa" size="small" sx={{ height: 20, bgcolor: '#059669', color: '#fff', fontSize: '0.68rem' }} />
              </Button>
            </Box>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};
