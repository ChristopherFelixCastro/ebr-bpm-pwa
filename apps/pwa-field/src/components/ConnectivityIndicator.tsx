import { useEffect, useState } from "react";

export default function ConnectivityIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div
      style={{
        padding: "4px 12px",
        textAlign: "center",
        fontSize: 13,
        background: online ? "#14532d" : "#7f1d1d",
        color: "#fff",
      }}
    >
      {online ? "🟢 Conectado" : "🔴 Sin conexión — trabajando localmente"}
    </div>
  );
}
