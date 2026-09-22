import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import BusinessIcon from '@mui/icons-material/Business'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import HubIcon from '@mui/icons-material/Hub'

import { NavLink, Outlet } from 'react-router-dom'

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
  {
    text: 'Core en vivo',
    path: '/core',
    icon: <HubIcon />,
  },
]

function CoordinatorLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#f4f6f8',
      }}
    >
      <Box
        component="aside"
        sx={{
          width: drawerWidth,
          minHeight: '100vh',
          bgcolor: '#0b2545',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <Box sx={{ px: 3, py: 3 }}>
          <Box
            component="h1"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              m: 0,
            }}
          >
            EBR/BPM
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
    </Box>
  )
}

export default CoordinatorLayout
