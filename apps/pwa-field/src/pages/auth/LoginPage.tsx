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
    <div style={{ padding: 32, maxWidth: 400, margin: 'min(10vh, 80px) auto', background: '#fff', border: '1px solid #fde68a', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(120,53,15,.06)' }}>
      <img src="/sira-imagotipo.jpeg" alt="SIRA Tech" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
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
