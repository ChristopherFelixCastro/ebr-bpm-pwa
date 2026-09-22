import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    navigate("/assigned", { replace: true });
    logout();
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        background: "#1c1c1c",
      }}
    >
      <span style={{ fontSize: 13 }}>
        👤 {user.fullName} ({user.role})
      </span>
      <button onClick={handleLogout} style={{ fontSize: 12 }}>
        Cerrar sesión
      </button>
    </div>
  );
}
