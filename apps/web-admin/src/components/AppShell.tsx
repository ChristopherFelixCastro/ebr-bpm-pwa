import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar, Avatar, Box, Chip, Divider, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BusinessIcon from '@mui/icons-material/Business'
import AssignmentIcon from '@mui/icons-material/Assignment'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import ShieldIcon from '@mui/icons-material/Shield'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

const DRAWER_WIDTH = 260

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const { showError, showSuccess } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const operational = ['ADMIN', 'UNIVERSAL', 'COMPANY_ADMIN'].includes(currentUser?.roleCode ?? '')

  const handleLogout = async () => {
    try {
      await logout()
      showSuccess('Sesión cerrada correctamente')
    } catch {
      showError('La sesión local se cerró, aunque el servidor no respondió.')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1E3A8A', color: '#FFFFFF' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.25)' }}>
          <ShieldIcon sx={{ color: '#FFFFFF' }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF' }}>SISTEMA EBR / BPM</Typography>
          <Typography variant="caption" sx={{ color: '#93C5FD' }}>Portal Web Administrativo</Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.15)' }} />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/dashboard'}
            onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
            sx={{ borderRadius: 2, color: '#FFFFFF', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,.18)' } }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}><DashboardIcon sx={{ color: '#FFFFFF' }} /></ListItemIcon>
            <ListItemText primary="Inicio" />
          </ListItemButton>
        </ListItem>
        {operational && <>
          <ListItem disablePadding sx={{ mt: 0.5 }}>
            <ListItemButton selected={location.pathname.startsWith('/companies') || location.pathname.startsWith('/establishments')} onClick={() => { navigate('/companies'); setMobileOpen(false) }} sx={{ borderRadius: 2, color: '#FFFFFF', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,.18)' } }}>
              <ListItemIcon sx={{ minWidth: 38 }}><BusinessIcon sx={{ color: '#FFFFFF' }} /></ListItemIcon><ListItemText primary="Empresas" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding sx={{ mt: 0.5 }}>
            <ListItemButton selected={location.pathname.startsWith('/requests')} onClick={() => { navigate('/requests'); setMobileOpen(false) }} sx={{ borderRadius: 2, color: '#FFFFFF', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,.18)' } }}>
              <ListItemIcon sx={{ minWidth: 38 }}><AssignmentIcon sx={{ color: '#FFFFFF' }} /></ListItemIcon><ListItemText primary="Solicitudes" />
            </ListItemButton>
          </ListItem>
        </>}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.15)' }} />
      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: '#3B82F6', fontWeight: 700 }}>
            {currentUser?.fullName.slice(0, 2).toUpperCase() ?? 'US'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: '#FFFFFF', fontWeight: 600 }}>{currentUser?.fullName}</Typography>
            <Chip label={currentUser?.roleCode} size="small" sx={{ mt: .5, height: 20, bgcolor: '#DBEAFE', color: '#1E3A8A', fontWeight: 700, fontSize: '.65rem' }} />
          </Box>
        </Box>
        <ListItemButton onClick={() => void handleLogout()} sx={{ borderRadius: 1.5, bgcolor: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)' }}>
          <LogoutIcon sx={{ fontSize: 18, color: '#FCA5A5', mr: 1 }} />
          <Typography variant="caption" sx={{ color: '#FFFFFF', fontWeight: 600 }}>Cerrar sesión</Typography>
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` }, bgcolor: '#1E3A8A' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}><MenuIcon /></IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Portal de Identidad, Empresas y Solicitudes</Typography>
            <Typography variant="caption" sx={{ color: '#BFDBFE' }}>Sesión conectada al Core EBR/BPM</Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>{drawer}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>{drawer}</Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: '64px' }}>
        {children}
      </Box>
    </Box>
  )
}
