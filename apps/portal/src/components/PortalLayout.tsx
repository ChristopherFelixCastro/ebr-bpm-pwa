import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { visibleSections } from '../access/capabilities'
import { useSession } from '../session/SessionContext'

const drawerWidth = 258

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = visibleSections(user)
  const leave = async () => { await logout(); navigate('/login', { replace: true }) }

  const drawer = <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ p: 2.5, bgcolor: '#1E3A8A' }}>
      <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>EBR / BPM</Typography>
      <Typography variant="caption" sx={{ color: '#BFDBFE' }}>Portal sanitario</Typography>
    </Box>
    <List component="nav" aria-label="Navegación principal" sx={{ px: 1.5, flex: 1 }}>
      {sections.map((section) => <Box key={section.name} sx={{ mt: 2 }}>
        <Typography variant="overline" sx={{ px: 1.5, color: '#64748B' }}>{section.name}</Typography>
        {section.pages.map((page) => <ListItemButton key={page.id} component={Link} to={page.path}
          selected={location.pathname === page.path} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 1.5 }}>
          <ListItemText primary={page.label} />
        </ListItemButton>)}
      </Box>)}
    </List>
    <Divider />
    <List sx={{ px: 1.5 }}>
      <ListItemButton component={Link} to="/cuenta" selected={location.pathname === '/cuenta'} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 1.5 }}>
        <AccountCircleIcon sx={{ mr: 1.5 }} /><ListItemText primary="Mi cuenta" />
      </ListItemButton>
    </List>
    <Box sx={{ p: 2 }}><Button startIcon={<LogoutIcon />} fullWidth onClick={() => void leave()}>Cerrar sesión</Button></Box>
  </Box>

  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <AppBar position="fixed" sx={{ ml: { md: `${drawerWidth}px` }, width: { md: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'white', color: '#0F172A', boxShadow: 'none', borderBottom: '1px solid #E2E8F0' }}>
      <Toolbar>
        <IconButton aria-label="Abrir menú" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, mr: 1 }}><MenuIcon /></IconButton>
        <Typography sx={{ flex: 1, fontWeight: 700 }}>Portal EBR / BPM</Typography>
        <Typography variant="body2">{user?.fullName}</Typography>
      </Toolbar>
    </AppBar>
    <Box component="nav" aria-label="Secciones del portal" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}>{drawer}</Drawer>
      <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>{drawer}</Drawer>
    </Box>
    <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 4 }, mt: 8 }}>{children}</Box>
  </Box>
}
