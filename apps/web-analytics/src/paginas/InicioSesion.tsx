import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { useAutenticacion } from '../contexto/Autenticacion';

export function InicioSesion() {
  const { user, login } = useAutenticacion();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [sending, setSending] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (event: FormEvent) => { event.preventDefault(); setSending(true); setError(''); try { await login(email, password); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.'); } finally { setSending(false); } };
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
    <Card sx={{ width: '100%', maxWidth: 440 }}><CardContent component="form" onSubmit={(event) => void submit(event)} sx={{ display: 'grid', gap: 2.5, p: 4 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}><ShieldRoundedIcon color="primary" /><Box><Typography variant="h2">Portal analítico</Typography><Typography color="text.secondary">Acceso institucional del Core</Typography></Box></Box>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Correo electrónico" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Contraseña" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="submit" variant="contained" size="large" disabled={sending}>{sending ? 'Ingresando…' : 'Ingresar'}</Button>
    </CardContent></Card>
  </Box>;
}
