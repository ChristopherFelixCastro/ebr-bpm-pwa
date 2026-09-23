import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { DisenoPrincipal } from './componentes/DisenoPrincipal';
import { Cargando } from './componentes/EstadoVista';
import { useAutenticacion } from './contexto/Autenticacion';
import { InicioSesion } from './paginas/InicioSesion';

const PanelAnalitico = lazy(() => import('./paginas/PanelAnalitico').then((module) => ({ default: module.PanelAnalitico })));
const Evaluaciones = lazy(() => import('./paginas/Evaluaciones').then((module) => ({ default: module.Evaluaciones })));
const DetalleEvaluacion = lazy(() => import('./paginas/DetalleEvaluacion').then((module) => ({ default: module.DetalleEvaluacion })));
const Revision = lazy(() => import('./paginas/Revision').then((module) => ({ default: module.Revision })));
const Informes = lazy(() => import('./paginas/Informes').then((module) => ({ default: module.Informes })));
const Historial = lazy(() => import('./paginas/Historial').then((module) => ({ default: module.Historial })));
const NoEncontrada = lazy(() => import('./paginas/NoEncontrada').then((module) => ({ default: module.NoEncontrada })));
function Protected() { const { user, loading } = useAutenticacion(); const location = useLocation(); if (loading) return <Cargando mensaje="Restaurando sesión…" />; return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />; }
export default function App() { return <Suspense fallback={<Cargando mensaje="Cargando módulo…" />}><Routes><Route path="login" element={<InicioSesion />} /><Route element={<Protected />}><Route element={<DisenoPrincipal />}><Route index element={<PanelAnalitico />} /><Route path="evaluaciones" element={<Evaluaciones />} /><Route path="evaluaciones/:id" element={<DetalleEvaluacion />} /><Route path="evaluaciones/:id/revision" element={<Revision />} /><Route path="informes" element={<Informes />} /><Route path="historial" element={<Historial />} /><Route path="*" element={<NoEncontrada />} /></Route></Route></Routes></Suspense>; }
