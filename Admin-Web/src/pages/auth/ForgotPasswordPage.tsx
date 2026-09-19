import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNotification } from '../../context/NotificationContext';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess } = useNotification();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor ingrese su correo electrónico registrado');
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(2);
      showSuccess('Se ha enviado un código de recuperación a su correo');
    }, 400);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !newPassword.trim()) {
      setError('Complete todos los campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      showSuccess('Contraseña restablecida exitosamente');
      navigate('/login');
    }, 500);
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
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          <LockResetIcon sx={{ fontSize: 40, mb: 0.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Recuperación de Contraseña
          </Typography>
          <Typography variant="caption" sx={{ color: '#BFDBFE' }}>
            Portal EBR/BPM - Módulo de Identidad
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {step === 1 ? (
            <Box component="form" onSubmit={handleRequestToken}>
              <Typography variant="body2" sx={{ color: '#475569', mb: 3 }}>
                Ingrese su correo institucional o corporativo registrado para recibir el enlace y código de restablecimiento.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Electrónico
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="ejemplo@empresa.com.do"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ py: 1.2, bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#1E40AF' } }}
              >
                {loading ? 'Enviando...' : 'Enviar Código de Recuperación'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleResetPassword}>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#EFF6FF', borderColor: '#BFDBFE' }}>
                <Typography variant="caption" sx={{ color: '#1E3A8A', fontWeight: 600 }}>
                  Código de demostración generado: <strong>EBR-7892</strong>
                </Typography>
              </Paper>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Código de Verificación
                </Typography>
                <TextField
                  fullWidth
                  placeholder="EBR-XXXX"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Nueva Contraseña
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Confirmar Contraseña
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  placeholder="Repita la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ py: 1.2, bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#1E40AF' } }}
              >
                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/login')}
              sx={{ color: '#475569', fontSize: '0.85rem' }}
            >
              Volver a Iniciar Sesión
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
