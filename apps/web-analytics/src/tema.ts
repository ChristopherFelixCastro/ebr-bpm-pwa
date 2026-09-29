import { createTheme } from '@mui/material/styles';

export const tema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#78350f', dark: '#451a03', light: '#f59e0b' },
    secondary: { main: '#b45309' },
    background: { default: '#fffbeb', paper: '#ffffff' },
    text: { primary: '#451a03', secondary: '#92400e' },
    divider: '#fde68a',
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
        root: { border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(120, 53, 15, .06)' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, borderRadius: 9 } } },
  },
});
