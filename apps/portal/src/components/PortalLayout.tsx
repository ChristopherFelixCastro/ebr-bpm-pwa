import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Box, Button, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { visibleSections } from '../access/capabilities'
import { useSession } from '../session/SessionContext'

const drawerWidth = 258
const sectionForPath = (pathname: string, sections: ReturnType<typeof visibleSections>) =>
  sections.find((section) => section.name !== 'Inicio' && section.pages.some((page) => pathname === page.path || pathname.startsWith(`${page.path}/`)))?.name ?? null

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = visibleSections(user)
  const [openSection, setOpenSection] = useState<string | null>(() => sectionForPath(location.pathname, sections))
  useEffect(() => { setOpenSection(sectionForPath(location.pathname, visibleSections(user))) }, [location.pathname, user])
  const leave = async () => { await logout(); navigate('/login', { replace: true }) }

  const drawer = <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ p: 2.5, bgcolor: '#1E3A8A' }}>
      <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>EBR / BPM</Typography>
      <Typography variant="caption" sx={{ color: '#BFDBFE' }}>Portal sanitario</Typography>
    </Box>
    <List component="nav" aria-label="Navegación principal" sx={{ px: 1.5, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {sections.map((section) => section.name === 'Inicio' ? <Box key={section.name} sx={{ mt: 2 }}>
        <ListItemButton component={Link} to="/inicio" selected={location.pathname === '/inicio'} onClick={() => setMobileOpen(false)} sx={{ borderRadius: 1.5 }}>
          <HomeOutlinedIcon sx={{ mr: 1.5, fontSize: 20 }} /><ListItemText primary="Inicio" />
        </ListItemButton>
      </Box> : <Box key={section.name} sx={{ mt: 1 }}>
        <ListItemButton component="button" type="button" aria-expanded={openSection === section.name} aria-controls={`nav-${section.name.replaceAll(' ', '-')}`}
          onClick={() => setOpenSection((current) => current === section.name ? null : section.name)}
          sx={{ width: '100%', borderRadius: 1.5, color: openSection === section.name ? '#1E3A8A' : '#475569', fontWeight: 700 }}>
          <ListItemText primary={section.name} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 750 } } }} />
          <ExpandMoreIcon sx={{ fontSize: 20, transform: openSection === section.name ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
        </ListItemButton>
        <Collapse in={openSection === section.name} timeout="auto" unmountOnExit>
          <List id={`nav-${section.name.replaceAll(' ', '-')}`} component="div" disablePadding>
            {section.pages.map((page) => <ListItemButton key={page.id} component={Link} to={page.path}
              selected={location.pathname === page.path || location.pathname.startsWith(`${page.path}/`)} onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 1.5, pl: 3, minHeight: 40, '&.Mui-selected': { bgcolor: '#e8eefb', color: '#1E3A8A', fontWeight: 700 } }}>
              <ListItemText primary={page.label} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
            </ListItemButton>)}
          </List>
        </Collapse>
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
