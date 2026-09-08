import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { forceEndpoint } from './lib/endpoint';
import type { EndpointMode } from './lib/endpoint';
import type { ThemeMode } from './types';

export interface Preferences {
  mode: ThemeMode;
  accent: string;
  endpoint: EndpointMode;
}

interface PreferencesContextValue extends Preferences {
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  setEndpoint: (endpoint: EndpointMode) => void;
}

const defaultPreferences: Preferences = {
  mode: 'dark',
  accent: '#62d9f3',
  endpoint: 'auto',
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStored(): Preferences {
  try {
    const stored = localStorage.getItem('luoa-oj.prefs');
    if (!stored) return defaultPreferences;
    const parsed = JSON.parse(stored) as Partial<Preferences>;
    return {
      mode: parsed.mode === 'dark' || parsed.mode === 'light' ? parsed.mode : defaultPreferences.mode,
      accent: typeof parsed.accent === 'string' && parsed.accent ? parsed.accent : defaultPreferences.accent,
      endpoint: parsed.endpoint === 'primary' || parsed.endpoint === 'fallback' || parsed.endpoint === 'auto'
        ? parsed.endpoint
        : defaultPreferences.endpoint,
    };
  } catch {
    return defaultPreferences;
  }
}

export function StoredPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readStored);

  useEffect(() => {
    localStorage.setItem('luoa-oj.prefs', JSON.stringify(preferences));
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = preferences.accent;
  }, [preferences]);

  const value = useMemo<PreferencesContextValue>(() => ({
    ...preferences,
    setMode: (mode) => setPreferences((current) => ({ ...current, mode })),
    setAccent: (accent) => setPreferences((current) => ({ ...current, accent })),
    setEndpoint: (endpoint) => {
      forceEndpoint(endpoint);
      setPreferences((current) => ({ ...current, endpoint }));
    },
  }), [preferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside StoredPreferencesProvider');
  return context;
}
