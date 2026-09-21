import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Solo para pruebas: simula que el token venció, sin backend real
  simulateExpiredToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("auth_token"),
  );

  async function login(email: string, _password: string) {
    await new Promise((res) => setTimeout(res, 400));
    const mockUser: AuthUser = {
      id: "tech-mock-1",
      fullName: email.split("@")[0] || "Técnico",
      role: "TECNICO_EVALUADOR",
    };
    const mockToken = `mock-token-${Date.now()}`;
    sessionStorage.setItem("auth_user", JSON.stringify(mockUser));
    sessionStorage.setItem("auth_token", mockToken);
    setUser(mockUser);
    setToken(mockToken);
  }

  function logout() {
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_token");
    setUser(null);
    setToken(null);
  }

  function simulateExpiredToken() {
    sessionStorage.removeItem("auth_token");
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, simulateExpiredToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
