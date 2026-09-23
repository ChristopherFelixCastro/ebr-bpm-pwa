import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { CoreApiError, type CoreUser } from '@ebr-bpm/core-client';
import { core } from '../api/core';

type PendingAction = { action: () => Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void };
type AuthValue = {
  user: CoreUser | null; loading: boolean; canOperate: boolean;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
  runAuthorized: <T>(action: () => Promise<T>) => Promise<T>;
};
const AuthContext = createContext<AuthValue | null>(null);
const allowed = new Set(['ADMIN', 'COORDINATOR', 'UNIVERSAL']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [password, setPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthenticating, setReauthenticating] = useState(false);

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener('core-session-expired', expire);
    core.restoreSession().then((restored) => setUser(restored && allowed.has(restored.roleCode) ? restored : null)).finally(() => setLoading(false));
    return () => window.removeEventListener('core-session-expired', expire);
  }, []);

  const login = useCallback(async (email: string, nextPassword: string) => {
    const authenticated = await core.login(email, nextPassword);
    if (!allowed.has(authenticated.roleCode)) {
      await core.logout();
      throw new CoreApiError(403, 'FORBIDDEN', 'Su rol no tiene acceso al portal analítico.');
    }
    setUser(authenticated);
  }, []);
  const logout = useCallback(async () => { await core.logout(); setUser(null); }, []);
  const runAuthorized = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    try { return await action(); }
    catch (error) {
      if (!(error instanceof CoreApiError) || error.code !== 'REAUTHENTICATION_REQUIRED') throw error;
      return new Promise<T>((resolve, reject) => setPending({ action, resolve: resolve as (value: unknown) => void, reject }));
    }
  }, []);
  const submitReauthentication = async () => {
    if (!pending) return;
    setReauthenticating(true); setReauthError('');
    try {
      const refreshed = await core.reauthenticate(password);
      setUser(refreshed);
      const result = await pending.action();
      pending.resolve(result);
      setPending(null); setPassword('');
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : 'No se pudo reautenticar.');
    } finally { setReauthenticating(false); }
  };
  const cancelReauthentication = () => { pending?.reject(new CoreApiError(401, 'REAUTHENTICATION_CANCELLED', 'Reautenticación cancelada.')); setPending(null); setPassword(''); setReauthError(''); };
  const value = useMemo<AuthValue>(() => ({ user, loading, canOperate: user?.roleCode === 'COORDINATOR' || user?.roleCode === 'UNIVERSAL', login, logout, runAuthorized }), [user, loading, login, logout, runAuthorized]);

  return <AuthContext.Provider value={value}>
    {children}
    <Dialog open={Boolean(pending)} onClose={cancelReauthentication} fullWidth maxWidth="xs">
      <DialogTitle>Confirme su identidad</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <Alert severity="info">El Core exige una autenticación reciente para esta operación excepcional.</Alert>
        {reauthError && <Alert severity="error">{reauthError}</Alert>}
        <TextField autoFocus label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </DialogContent>
      <DialogActions><Button onClick={cancelReauthentication}>Cancelar</Button><Button variant="contained" disabled={!password || reauthenticating} onClick={() => void submitReauthentication()}>Continuar</Button></DialogActions>
    </Dialog>
  </AuthContext.Provider>;
}

export const useAutenticacion = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está disponible.');
  return value;
};
