import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { DisenoPrincipal } from './componentes/DisenoPrincipal';
import { Cargando } from './componentes/EstadoVista';

const PanelAnalitico = lazy(() => import('./paginas/PanelAnalitico').then((modulo) => ({ default: modulo.PanelAnalitico })));
const Evaluaciones = lazy(() => import('./paginas/Evaluaciones').then((modulo) => ({ default: modulo.Evaluaciones })));
const DetalleEvaluacion = lazy(() => import('./paginas/DetalleEvaluacion').then((modulo) => ({ default: modulo.DetalleEvaluacion })));
const Revision = lazy(() => import('./paginas/Revision').then((modulo) => ({ default: modulo.Revision })));
const Informes = lazy(() => import('./paginas/Informes').then((modulo) => ({ default: modulo.Informes })));
const Historial = lazy(() => import('./paginas/Historial').then((modulo) => ({ default: modulo.Historial })));
const GuiaDemostracion = lazy(() => import('./paginas/GuiaDemostracion').then((modulo) => ({ default: modulo.GuiaDemostracion })));
const CoreEnVivo = lazy(() => import('./paginas/CoreEnVivo').then((modulo) => ({ default: modulo.CoreEnVivo })));
const NoEncontrada = lazy(() => import('./paginas/NoEncontrada').then((modulo) => ({ default: modulo.NoEncontrada })));

export default function App() {
  return (
    <Suspense fallback={<Cargando mensaje="Cargando módulo…" />}>
      <Routes>
        <Route element={<DisenoPrincipal />}>
          <Route index element={<PanelAnalitico />} />
          <Route path="demo" element={<GuiaDemostracion />} />
          <Route path="core" element={<CoreEnVivo />} />
          <Route path="evaluaciones" element={<Evaluaciones />} />
          <Route path="evaluaciones/:id" element={<DetalleEvaluacion />} />
          <Route path="evaluaciones/:id/revision" element={<Revision />} />
          <Route path="informes" element={<Informes />} />
          <Route path="historial" element={<Historial />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
