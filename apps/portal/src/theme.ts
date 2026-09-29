import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#78350f',
      light: '#92400e',
      dark: '#451a03',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#b45309',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#fffbeb',
      paper: '#FFFFFF',   // Contenedores CRUD / Tarjetas
    },
    text: {
      primary: '#451a03',
      secondary: '#92400e',
    },
    divider: '#fde68a',
    info: {
      main: '#b45309',
      light: '#fef3c7',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
      contrastText: '#451a03',
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
      color: 'inherit',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      color: 'inherit',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      color: 'inherit',
    },
    subtitle1: {
      color: 'inherit',
      fontSize: '0.95rem',
    },
    subtitle2: {
      color: 'inherit',
      fontSize: '0.85rem',
      fontWeight: 600,
    },
    body1: {
      color: 'inherit',
      fontSize: '0.9rem',
    },
    body2: {
      color: 'inherit',
      fontSize: '0.85rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fffbeb',
          color: '#451a03',
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
          border: '1px solid #fde68a',
          borderRadius: 12,
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
          border: '1px solid #fde68a',
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(120, 53, 15, .06), 0 2px 4px -1px rgba(120, 53, 15, .04)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 9,
          minHeight: 44,
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
          color: '#92400e',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#78350f',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 9,
          fontSize: '0.9rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#fde68a',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d97706',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#b45309', // Focus / Enfocado: Borde #b45309 (Azul brillante)
            borderWidth: '2px',
          },
          '& input::placeholder': {
            color: '#92400e',
            opacity: 1,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#fffbeb',
          color: '#92400e',
          fontWeight: 600,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '1px solid #fde68a',
          padding: '12px 16px',
        },
        body: {
          color: '#451a03',
          fontSize: '0.875rem',
          borderBottom: '1px solid #fde68a',
          padding: '14px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#fffbeb',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 9999,
          height: 28,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#b45309', // Iconos de acción / editar
          '&:hover': {
            backgroundColor: '#fffbeb',
          },
        },
      },
    },
  },
});
