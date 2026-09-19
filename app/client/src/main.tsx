import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { initSession } from '@/lib/authSession';
import { createLocalStorageAdapter } from '@/lib/localStorageAdapter';

// The session is read into memory before the first render, so AuthProvider's
// initial state is already right and a reload never flashes /login. `.then`
// rather than top-level await: the build targets es2020, which has none.
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
