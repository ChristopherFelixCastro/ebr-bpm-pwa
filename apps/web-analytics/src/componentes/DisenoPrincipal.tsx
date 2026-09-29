import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppBar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, Toolbar, Typography } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAutenticacion } from '../contexto/Autenticacion';

const drawerWidth = 264;
const options = [
  { path: '/', label: 'Panel analítico', icon: <SpaceDashboardRoundedIcon /> },
  { path: '/evaluaciones', label: 'Evaluaciones', icon: <FactCheckRoundedIcon /> },
  { path: '/informes', label: 'Informes', icon: <DescriptionRoundedIcon /> },
  { path: '/historial', label: 'Consulta histórica', icon: <HistoryRoundedIcon /> },
];
function Navigation({ close }: { close?: () => void }) {
  const location = useLocation(); const { user } = useAutenticacion();
  return <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#78350f', color: '#fffbeb' }}>
    <Box sx={{ p: 3 }}><Box component="img" src="/sira-imagotipo.jpeg" alt="SIRA Tech" sx={{ width: '100%', height: 82, objectFit: 'cover', borderRadius: 2, bgcolor: '#fffbeb', mb: 1 }} /><Typography variant="caption" sx={{ color: '#fde68a' }}>Portal analítico</Typography></Box>
    <Divider sx={{ borderColor: 'rgba(255,255,255,.12)' }} />
    <List sx={{ px: 1.25, py: 2 }}>{options.map((option) => { const active = option.path === '/' ? location.pathname === '/' : location.pathname.startsWith(option.path); return <ListItemButton key={option.path} component={NavLink} to={option.path} onClick={close} selected={active} sx={{ mb: .5, borderRadius: 2, color: '#dcecf0', '&.Mui-selected': { bgcolor: 'rgba(103,232,249,.14)', color: '#fff' } }}><ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{option.icon}</ListItemIcon><Typography sx={{ fontWeight: active ? 700 : 500 }}>{option.label}</Typography></ListItemButton>; })}</List>
    <Box sx={{ mt: 'auto', p: 2 }}><Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,.07)', borderRadius: 2 }}><Typography variant="caption" sx={{ color: '#fde68a' }}>{user?.roleCode === 'ADMIN' ? 'Modo de consulta' : 'Operación autorizada'}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{user?.fullName}</Typography><Typography variant="caption" sx={{ color: '#fde68a' }}>{user?.roleCode}</Typography></Box></Box>
  </Box>;
}
export function DisenoPrincipal() {
  const [open, setOpen] = useState(false); const { user, logout } = useAutenticacion();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); }
    finally { setLoggingOut(false); setConfirmLogout(false); }
  };
  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` }, borderBottom: '1px solid #fde68a', bgcolor: 'rgba(255,255,255,.94)' }}><Toolbar><IconButton onClick={() => setOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }} aria-label="Abrir navegación"><MenuRoundedIcon /></IconButton><Box sx={{ flexGrow: 1 }}><Typography sx={{ fontWeight: 750 }}>Evaluación basada en riesgo</Typography><Typography variant="caption" color="text.secondary">Información institucional</Typography></Box>{user?.roleCode === 'ADMIN' && <Chip label="Solo consulta" color="warning" variant="outlined" size="small" sx={{ mr: 1 }} />}<Button startIcon={<LogoutRoundedIcon />} onClick={() => setConfirmLogout(true)}>Salir</Button></Toolbar></AppBar>
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}><Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}><Navigation close={() => setOpen(false)} /></Drawer><Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, border: 0 } }}><Navigation /></Drawer></Box>
    <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, pt: 8 }}><Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}><Outlet /></Box></Box>
    <Dialog open={confirmLogout} onClose={() => { if (!loggingOut) setConfirmLogout(false); }} aria-labelledby="confirmar-cierre-analitica">
      <DialogTitle id="confirmar-cierre-analitica">¿Está seguro de cerrar sesión?</DialogTitle>
      <DialogContent><DialogContentText>Para volver a acceder tendrá que iniciar sesión de nuevo.</DialogContentText></DialogContent>
      <DialogActions><Button disabled={loggingOut} onClick={() => setConfirmLogout(false)}>Cancelar</Button><Button variant="contained" disabled={loggingOut} onClick={() => void handleLogout()}>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</Button></DialogActions>
    </Dialog>
  </Box>;
}
