import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BadgeIcon from '@mui/icons-material/Badge';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiService } from '../services/api';
import type { Role } from '../types';

const DRAWER_WIDTH = 260;

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const { currentUser, currentRole, switchRole, logout } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleRoleChange = (newRole: Role) => {
    switchRole(newRole);
    showSuccess(`Rol cambiado a: ${newRole}`);
  };

  const handleResetData = () => {
    apiService.resetAllData();
    showSuccess('Datos de prueba restablecidos exitosamente');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon sx={{ color: '#FFFFFF' }} />,
      path: '/dashboard',
      roles: ['ADMINISTRADOR', 'ADMIN_EMPRESA', 'DELEGADO', 'UNIVERSAL'],
    },
    {
      text: 'Empresas y Sedes',
      icon: <BusinessIcon sx={{ color: '#FFFFFF' }} />,
      path: '/companies',
      roles: ['ADMINISTRADOR', 'ADMIN_EMPRESA', 'UNIVERSAL'],
    },
    {
      text: 'Solicitudes BPM',
      icon: <AssignmentIcon sx={{ color: '#FFFFFF' }} />,
      path: '/requests',
      roles: ['ADMINISTRADOR', 'ADMIN_EMPRESA', 'DELEGADO', 'UNIVERSAL'],
    },
    {
      text: 'Nueva Solicitud BPM',
      icon: <AddCircleIcon sx={{ color: '#FFFFFF' }} />,
      path: '/requests/new',
      roles: ['ADMINISTRADOR', 'ADMIN_EMPRESA', 'DELEGADO', 'UNIVERSAL'],
    },
    {
      text: 'Gestión de Usuarios',
      icon: <PeopleAltIcon sx={{ color: '#FFFFFF' }} />,
      path: '/users',
      roles: ['ADMINISTRADOR', 'UNIVERSAL'],
      badge: 'Admin',
    },
  ];

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1E3A8A', // Fondo #1E3A8A institucional
        color: '#FFFFFF',
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <ShieldIcon sx={{ color: '#FFFFFF', fontSize: 26 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '0.02em' }}>
            SISTEMA EBR / BPM
          </Typography>
          <Typography variant="caption" sx={{ color: '#93C5FD', fontWeight: 500, fontSize: '0.72rem' }}>
            Portal Web Administrativo
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)' }} />

      {/* Navigation Links */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 1.8,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 700 : 500,
                        color: '#FFFFFF',
                      },
                    },
                  }}
                />
                {item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: '#F59E0B',
                      color: '#FFFFFF',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)' }} />

      {/* User info at bottom of sidebar */}
      <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: '#3B82F6',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            {currentUser?.fullName?.substring(0, 2).toUpperCase() || 'US'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.fullName || 'Usuario'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#93C5FD', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {currentUser?.companyName || 'Módulo Iván - Admin'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Restablecer datos de prueba a estado inicial">
            <IconButton
              size="small"
              onClick={handleResetData}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                borderRadius: 1.5,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
              }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <ListItemButton
            onClick={() => {
              logout();
              navigate('/login');
            }}
            sx={{
              borderRadius: 1.5,
              py: 0.5,
              px: 1,
              bgcolor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.3)' },
            }}
          >
            <LogoutIcon sx={{ fontSize: 16, color: '#FCA5A5', mr: 0.8 }} />
            <Typography variant="caption" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
              Salir
            </Typography>
          </ListItemButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Top App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: '#1E3A8A', // Barra de navegación superior Fondo #1E3A8A
          color: '#FFFFFF',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, fontWeight: 700, color: '#FFFFFF' }}>
                Portal de Identidad, Empresas y Solicitudes
              </Typography>
              <Typography variant="caption" sx={{ color: '#BFDBFE', display: { xs: 'none', sm: 'block' } }}>
                Responsable del Módulo: Iván (SDP Semanas 1–3)
              </Typography>
            </Box>
          </Box>

          {/* Role Switcher Toolbar Feature (allows testing any role visually) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <BadgeIcon sx={{ fontSize: 18, color: '#93C5FD', mr: 1 }} />
              <Typography variant="caption" sx={{ color: '#FFFFFF', mr: 1, fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
                Simular Rol:
              </Typography>
              <Select
                value={currentRole}
                size="small"
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                sx={{
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  height: 30,
                  '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '.MuiSvgIcon-root': { color: '#FFFFFF' },
                }}
              >
                <MenuItem value="ADMINISTRADOR">Administrador (Central)</MenuItem>
                <MenuItem value="ADMIN_EMPRESA">Administrador de Empresa</MenuItem>
                <MenuItem value="DELEGADO">Usuario Delegado</MenuItem>
              </Select>
            </Box>

            <Chip
              icon={<VerifiedUserIcon style={{ color: '#FFFFFF', fontSize: 16 }} />}
              label={currentRole === 'ADMINISTRADOR' ? 'Vista Central' : 'Vista Empresa'}
              size="small"
              sx={{
                bgcolor: currentRole === 'ADMINISTRADOR' ? '#2563EB' : '#059669',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.72rem',
                display: { xs: 'none', md: 'flex' },
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop permanent drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Canvas / Contenido */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          backgroundColor: '#F8FAFC', // Fondo general de la pantalla Canvas: #F8FAFC
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
