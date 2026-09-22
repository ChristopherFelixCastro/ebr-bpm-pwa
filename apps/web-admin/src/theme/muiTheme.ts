import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1E3A8A', // Azul institucional
      light: '#3B82F6', // Azul brillante (focus/iconos)
      dark: '#172554',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#3B82F6', // Azul brillante para editar/acciones secundarias activas
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC', // Canvas general
      paper: '#FFFFFF',   // Contenedores CRUD / Tarjetas
    },
    text: {
      primary: '#0F172A', // Texto principal
      secondary: '#475569', // Texto secundario / Datos secundarios
    },
    divider: '#E2E8F0', // Divisores de filas y bordes
    info: {
      main: '#3B82F6',
      light: '#E0F2FE',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
    },
    success: {
      main: '#166534',
      light: '#DCFCE7',
    },
    error: {
      main: '#991B1B',
      light: '#FEE2E2',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      color: '#0F172A',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      color: '#0F172A',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      color: '#0F172A',
    },
    subtitle1: {
      color: '#475569',
      fontSize: '0.95rem',
    },
    subtitle2: {
      color: '#475569',
      fontSize: '0.85rem',
      fontWeight: 600,
    },
    body1: {
      color: '#0F172A',
      fontSize: '0.9rem',
    },
    body2: {
      color: '#475569',
      fontSize: '0.85rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
          color: '#0F172A',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 18px',
          fontWeight: 600,
          fontSize: '0.875rem',
          transition: 'all 0.15s ease-in-out',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#475569',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#1E3A8A',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 6,
          fontSize: '0.9rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2E8F0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CBD5E1',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3B82F6', // Focus / Enfocado: Borde #3B82F6 (Azul brillante)
            borderWidth: '2px',
          },
          '& input::placeholder': {
            color: '#94A3B8',
            opacity: 1,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#F8FAFC',
          color: '#475569',
          fontWeight: 600,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 16px',
        },
        body: {
          color: '#0F172A',
          fontSize: '0.875rem',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F8FAFC',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 6,
          height: 26,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#3B82F6', // Iconos de acción / editar
          '&:hover': {
            backgroundColor: '#EFF6FF',
          },
        },
      },
    },
  },
});
