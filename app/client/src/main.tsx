import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { configureApi } from '@apexops/shared/api';
import { initSession } from '@apexops/shared/auth';
import { createLocalStorageAdapter } from '@/lib/localStorageAdapter';

// The shared API client has no default base URL; the web app's is a build-time value.
configureApi({ baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000' });

// The session is read into memory before the first render, so AuthProvider's
// initial state is already right and a reload never flashes /login.
// initSession cannot reject — a failing store reads as "signed out".
void initSession(createLocalStorageAdapter()).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  )
})
