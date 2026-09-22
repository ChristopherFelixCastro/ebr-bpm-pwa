import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';

const ancho = 264;

const opciones = [
  { ruta: '/', etiqueta: 'Panel analítico', icono: <SpaceDashboardRoundedIcon /> },
  { ruta: '/demo', etiqueta: 'Recorrido MVP', icono: <RouteRoundedIcon /> },
  { ruta: '/evaluaciones', etiqueta: 'Evaluaciones', icono: <FactCheckRoundedIcon /> },
  { ruta: '/informes', etiqueta: 'Informes', icono: <DescriptionRoundedIcon /> },
  { ruta: '/historial', etiqueta: 'Consulta histórica', icono: <HistoryRoundedIcon /> },
];

function Navegacion({ cerrar }: { cerrar?: () => void }) {
  const ubicacion = useLocation();
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#103c49', color: '#f8fafc' }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
          <ShieldRoundedIcon sx={{ color: '#67e8f9' }} />
          <Typography fontWeight={800}>EBR/BPM</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#b9d4dc' }}>Portal analítico</Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.12)' }} />
      <List sx={{ px: 1.25, py: 2 }}>
        {opciones.map((opcion) => {
          const activa = opcion.ruta === '/' ? ubicacion.pathname === '/' : ubicacion.pathname.startsWith(opcion.ruta);
          return (
            <ListItemButton
              key={opcion.ruta}
              component={NavLink}
              to={opcion.ruta}
              onClick={cerrar}
              selected={activa}
              sx={{ mb: 0.5, borderRadius: 2, color: '#dcecf0', '&.Mui-selected': { bgcolor: 'rgba(103,232,249,.14)', color: '#ffffff' }, '&.Mui-selected:hover': { bgcolor: 'rgba(103,232,249,.2)' } }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{opcion.icono}</ListItemIcon>
              <ListItemText primary={opcion.etiqueta} primaryTypographyProps={{ fontWeight: activa ? 700 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,.07)', borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: '#b9d4dc' }}>Sesión de demostración</Typography>
          <Typography variant="body2" fontWeight={700}>Coordinador</Typography>
          <Typography variant="caption" sx={{ color: '#b9d4dc' }}>Permisos de revisión y cierre</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function DisenoPrincipal() {
  const [abierto, setAbierto] = useState(false);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ width: { md: `calc(100% - ${ancho}px)` }, ml: { md: `${ancho}px` }, borderBottom: '1px solid #d9e3e6', bgcolor: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)' }}>
        <Toolbar>
          <IconButton onClick={() => setAbierto(true)} sx={{ display: { md: 'none' }, mr: 1 }} aria-label="Abrir navegación"><MenuRoundedIcon /></IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={750}>Evaluación basada en riesgo</Typography>
            <Typography variant="caption" color="text.secondary">Resultados, revisión, informes y cierre</Typography>
          </Box>
          <Tooltip title="Los datos actuales son demostrativos hasta integrar la API Core">
            <Chip label="Demostración" size="small" color="warning" variant="outlined" />
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: ancho }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={abierto} onClose={() => setAbierto(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: ancho } }}>
          <Navegacion cerrar={() => setAbierto(false)} />
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: ancho, border: 0 } }}>
          <Navegacion />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${ancho}px)` }, pt: 8 }}>
        <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
