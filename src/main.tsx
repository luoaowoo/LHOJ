import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoredPreferencesProvider } from './prefs';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoredPreferencesProvider>
      <App />
    </StoredPreferencesProvider>
  </StrictMode>,
);

