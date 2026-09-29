import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppHeader() {
  const { user, logout, onlineSession } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    if (!window.confirm('¿Está seguro de cerrar sesión?')) return;
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        background: "#78350f",
        color: "#ffffff",
        gap: 16,
      }}
    >
      <img src="/sira-isotipo.jpeg" alt="SIRA Tech" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, background: '#fffbeb' }} />
      <span style={{ fontSize: 13 }}>
        👤 {user.fullName} ({user.roleCode})
      </span>
      {!onlineSession && <button onClick={() => navigate('/login')}>Reanudar sesión</button>}
      <button onClick={handleLogout} style={{ fontSize: 12 }}>
        Cerrar sesión
      </button>
    </div>
  );
}
