import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrar Service Worker con excepción para cloudfunctions
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(error => {
    console.error('Service Worker registration failed:', error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
