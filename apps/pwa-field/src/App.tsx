import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AssignedListPage from "./pages/AssignedListPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import LoginPage from "./pages/auth/LoginPage";
import ConnectivityIndicator from "./components/ConnectivityIndicator";
import SyncPanel from "./components/SyncPanel";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import AppHeader from "./components/AppHeader";

function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>EBR/BPM - Campo</h1>
      <Link to="/assigned">Mis evaluaciones</Link>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ConnectivityIndicator />
        <AppHeader />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/assigned"
            element={
              <RequireAuth>
                <AssignedListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/inspection/:id"
            element={
              <RequireAuth>
                <InspectionDetailPage />
              </RequireAuth>
            }
          />
        </Routes>
        <SyncPanel />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
