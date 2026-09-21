import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = "/assigned";
  const { token } = useAuth();

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
    navigate(from, { replace: true });
  }

  return (
    <div style={{ padding: 24, maxWidth: 320 }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#999" }}>
        (Mock: cualquier correo/contraseña funciona por ahora)
      </p>
    </div>
  );
}
