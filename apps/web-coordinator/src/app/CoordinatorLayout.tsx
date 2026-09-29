import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import BusinessIcon from '@mui/icons-material/Business'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const drawerWidth = 260

const menuItems = [
  {
    text: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    text: 'Casos',
    path: '/cases',
    icon: <FolderOpenIcon />,
  },
  {
    text: 'Alertas LAPCH',
    path: '/alerts',
    icon: <WarningAmberIcon />,
  },
  {
    text: 'Denuncias',
    path: '/complaints',
    icon: <ReportProblemIcon />,
  },
  {
    text: 'Prog. Institucional',
    path: '/institutional',
    icon: <BusinessIcon />,
  },
  {
    text: 'Programación',
    path: '/scheduling',
    icon: <EventNoteIcon />,
  },
  {
    text: 'Asignaciones',
    path: '/assignments',
    icon: <AssignmentIndIcon />,
  },
  {
    text: 'Calendario',
    path: '/calendar',
    icon: <CalendarMonthIcon />,
  },
]

function CoordinatorLayout() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await logout(); navigate('/login', { replace: true }) }
    finally { setLoggingOut(false); setConfirmLogout(false) }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#fffbeb',
      }}
    >
      <Box
        component="aside"
        sx={{
          width: drawerWidth,
          minHeight: '100vh',
          bgcolor: '#78350f',
          color: 'white',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 3, py: 3 }}>
          <Box component="img" src="/sira-imagotipo.jpeg" alt="SIRA Tech" sx={{ width: '100%', height: 82, objectFit: 'cover', borderRadius: 2, bgcolor: '#fffbeb', mb: 1 }} />
          <Box
            component="h1"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              m: 0,
            }}
          >
            SIRA Tech
          </Box>

          <Box
            component="p"
            sx={{
              fontSize: '0.85rem',
              opacity: 0.75,
              mt: 0.5,
              mb: 0,
            }}
          >
            Portal de Coordinación
          </Box>
        </Box>

        <Divider
          sx={{
            borderColor:
              'rgba(255,255,255,0.15)',
          }}
        />

        <List
          sx={{
            px: 1.5,
            pt: 2,
            flexGrow: 1,
          }}
        >
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: 'white',

                '& .MuiListItemIcon-root':
                  {
                    color: 'inherit',
                  },

                '&.active': {
                  bgcolor:
                    'rgba(255,255,255,0.14)',
                },

                '&.active:hover': {
                  bgcolor:
                    'rgba(255,255,255,0.18)',
                },

                '&:hover': {
                  bgcolor:
                    'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 42,
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.text}
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PersonIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography noWrap variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                {currentUser?.fullName || 'Coordinador General'}
              </Typography>
              <Chip
                label={currentUser?.roleCode || 'COORDINATOR'}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(255,255,255,0.15)',
              color: '#fde68a',
                  mt: 0.5,
                }}
              />
            </Box>
          </Box>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => setConfirmLogout(true)}
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: 'rgba(255,255,255,0.85)',
              borderColor: 'rgba(255,255,255,0.25)',
              textTransform: 'none',
              fontSize: '0.8rem',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            Cerrar Sesión
          </Button>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
      <Dialog open={confirmLogout} onClose={() => { if (!loggingOut) setConfirmLogout(false) }} aria-labelledby="confirmar-cierre-coordinador">
        <DialogTitle id="confirmar-cierre-coordinador">¿Está seguro de cerrar sesión?</DialogTitle>
        <DialogContent><DialogContentText>Para volver a acceder tendrá que iniciar sesión de nuevo.</DialogContentText></DialogContent>
        <DialogActions><Button disabled={loggingOut} onClick={() => setConfirmLogout(false)}>Cancelar</Button><Button variant="contained" disabled={loggingOut} onClick={() => void handleLogout()}>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</Button></DialogActions>
      </Dialog>
    </Box>
  )
}

export default CoordinatorLayout
