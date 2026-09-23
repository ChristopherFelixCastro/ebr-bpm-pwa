import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function LoginPage() {
  const { login, user, booting, onlineSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = "/assigned";

  useEffect(() => {
    if (!booting && user && onlineSession) navigate(from, { replace: true });
  }, [booting, user, onlineSession, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No fue posible iniciar sesión.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 320 }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        {error && <p role="alert">{error}</p>}
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
    </div>
  );
}
