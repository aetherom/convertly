import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function maybeSelfReset(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('reset')) return false;

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    localStorage.removeItem('fileverse-consent');
  } catch {
    /* best effort */
  }

  // Strip ?reset from the URL and hard-reload fresh
  params.delete('reset');
  const qs = params.toString();
  window.location.replace(`${window.location.pathname}${qs ? '?' + qs : ''}`);
  return true;
}

maybeSelfReset().then((didReset) => {
  if (didReset) return; // page is reloading itself
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
