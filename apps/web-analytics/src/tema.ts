import { createTheme } from '@mui/material/styles';

export const tema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#155e75', dark: '#164e63', light: '#67e8f9' },
    secondary: { main: '#b45309' },
    background: { default: '#f4f7f8', paper: '#ffffff' },
    success: { main: '#15803d' },
    warning: { main: '#b45309' },
    error: { main: '#b91c1c' },
  },
  typography: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 750, letterSpacing: '-0.03em' },
    h2: { fontSize: '1.45rem', fontWeight: 720, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.1rem', fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #d9e3e6', boxShadow: '0 8px 30px rgba(15, 45, 56, 0.06)' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
