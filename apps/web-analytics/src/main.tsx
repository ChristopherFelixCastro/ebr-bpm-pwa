import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App';
import { AuthProvider } from './contexto/Autenticacion';
import { tema } from './tema';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider theme={tema}><CssBaseline /><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></ThemeProvider></StrictMode>);
