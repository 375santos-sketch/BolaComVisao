import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { applyCompact, loadBrand, loadCompact } from './lib/clubBrand';
import { applyClubColor } from './lib/clubColors';

// This phone's look before the club's data loads: the club's colour and the compact mode
applyClubColor(loadBrand().color);
applyCompact(loadCompact(), false);

// Register Service Worker for 100% Offline PWA operation (only in production)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('⚡ BolaComVisão Service Worker registrado com sucesso (Modo Offline ativo):', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration skipped or restricted in container:', err);
        });
    });
  } else {
    // In development mode, ensure any existing service workers are cleaned up
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      })
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
