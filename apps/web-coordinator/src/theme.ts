import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#78350f' },
    secondary: { main: '#b45309' },
    background: { default: '#fffbeb', paper: '#ffffff' },
    text: { primary: '#451a03', secondary: '#92400e' },
    divider: '#fde68a',
    success: { main: '#15803d' },
    warning: { main: '#b45309' },
    error: { main: '#b91c1c' },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 9 } } },
    MuiPaper: { styleOverrides: { root: { border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(120, 53, 15, .06)' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9 } } },
  },
})
