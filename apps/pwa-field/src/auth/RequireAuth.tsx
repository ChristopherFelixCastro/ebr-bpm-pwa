import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <p style={{ padding: 24 }}>Restaurando sesión...</p>;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
