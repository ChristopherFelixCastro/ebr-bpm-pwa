import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AssignedListPage from "./pages/AssignedListPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import ConnectivityIndicator from "./components/ConnectivityIndicator";
import SyncPanel from "./components/SyncPanel";

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
    <BrowserRouter>
      <ConnectivityIndicator />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assigned" element={<AssignedListPage />} />
        <Route path="/inspection/:id" element={<InspectionDetailPage />} />
      </Routes>
      <SyncPanel />
    </BrowserRouter>
  );
}

export default App;
