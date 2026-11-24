import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { applyCompact, loadBrand, loadCompact } from './lib/clubBrand';
import { applyClubColor } from './lib/clubColors';
import { applySunMode, loadSunMode } from './lib/sunMode';

// This phone's look before the club's data loads: the sun mode, the club's colour and the compact mode
applySunMode(loadSunMode(), false);
applyClubColor(loadBrand().color);
applyCompact(loadCompact(), false);

// Register Service Worker for 100% Offline PWA operation (only in production)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        // P1-01: the build id makes each Publish install the new list of files kept for offline use
        .register(`/sw.js?v=${encodeURIComponent(__BCV_BUILD__)}`)
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
      <Root />
    </ErrorBoundary>
  </StrictMode>
);
