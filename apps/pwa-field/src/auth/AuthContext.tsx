import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, core, setExpiredHandler } from '../api/client';
import type { AuthUser } from '../types';

const CACHE_KEY = 'ebr-bpm-field-last-user';
const LOGOUT_PENDING_KEY = 'ebr-bpm-field-logout-pending';
function cachedUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    const parsed = saved ? JSON.parse(saved) as AuthUser : null;
    return parsed?.id && ['EVALUATOR', 'UNIVERSAL'].includes(parsed.roleCode) ? parsed : null;
  } catch { return null; }
}
interface AuthContextValue {
  user: AuthUser | null;
  booting: boolean;
  onlineSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requireLogin: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [booting, setBooting] = useState(true);
  const [onlineSession, setOnlineSession] = useState(false);
  useEffect(() => {
    setExpiredHandler(() => setOnlineSession(false));
    let active = true;
    if (!navigator.onLine) { setBooting(false); return () => setExpiredHandler(); }
    const restore = async () => {
      if (localStorage.getItem(LOGOUT_PENDING_KEY)) {
        await api.logout();
        localStorage.removeItem(LOGOUT_PENDING_KEY);
        return null;
      }
      return api.restoreSession();
    };
    restore().then((restored) => {
      if (!active) return;
      if (restored && ['EVALUATOR', 'UNIVERSAL'].includes(restored.roleCode)) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(restored));
        setUser(restored);
        setOnlineSession(true);
      }
    }).catch(() => undefined).finally(() => { if (active) setBooting(false); });
    return () => { active = false; setExpiredHandler(); };
  }, []);
  async function login(email: string, password: string) {
    const authenticated = await api.login(email, password);
    if (!['EVALUATOR', 'UNIVERSAL'].includes(authenticated.roleCode)) {
      core.disconnect();
      throw new Error('Esta aplicación está reservada al evaluador y al rol universal.');
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(authenticated));
    localStorage.removeItem(LOGOUT_PENDING_KEY);
    setUser(authenticated);
    setOnlineSession(true);
  }
  async function logout() {
    localStorage.setItem(LOGOUT_PENDING_KEY, 'true');
    if (navigator.onLine) await api.logout().then(() => localStorage.removeItem(LOGOUT_PENDING_KEY)).catch(() => undefined);
    core.disconnect();
    localStorage.removeItem(CACHE_KEY);
    setUser(null);
    setOnlineSession(false);
  }
  return <AuthContext.Provider value={{
    user, booting, onlineSession, login, logout,
    requireLogin: () => setOnlineSession(false),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider no disponible.');
  return context;
}
