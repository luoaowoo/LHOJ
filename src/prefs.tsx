import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { forceEndpoint } from './lib/endpoint';
import type { EndpointMode } from './lib/endpoint';
import type { ThemeMode } from './types';

export type CodeTheme = 'auto' | 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
export type UsernameColoring = 'off' | 'rp';

export interface Preferences {
  mode: ThemeMode;
  accent: string;
  endpoint: EndpointMode;
  codeTheme: CodeTheme;
  usernameColoring: UsernameColoring;
  trainingNodesCollapsed: boolean;
  customBgColor: string;
}

interface PreferencesContextValue extends Preferences {
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  setEndpoint: (endpoint: EndpointMode) => void;
  setCodeTheme: (value: CodeTheme) => void;
  setUsernameColoring: (value: UsernameColoring) => void;
  setTrainingNodesCollapsed: (value: boolean) => void;
  setCustomBgColor: (value: string) => void;
}

const defaultPreferences: Preferences = {
  mode: 'dark',
  accent: '#62d9f3',
  endpoint: 'auto',
  codeTheme: 'auto',
  usernameColoring: 'rp',
  trainingNodesCollapsed: false,
  customBgColor: '',
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

function isCodeTheme(value: unknown): value is CodeTheme {
  return value === 'auto' || value === 'vs' || value === 'vs-dark' || value === 'hc-black' || value === 'hc-light';
}

function readStored(): Preferences {
  try {
    const stored = localStorage.getItem('luoa-oj.prefs');
    if (!stored) return defaultPreferences;
    const parsed = JSON.parse(stored) as Partial<Preferences>;
    return {
      mode: isThemeMode(parsed.mode) ? parsed.mode : defaultPreferences.mode,
      accent: typeof parsed.accent === 'string' && parsed.accent ? parsed.accent : defaultPreferences.accent,
      endpoint: parsed.endpoint === 'primary' || parsed.endpoint === 'fallback' || parsed.endpoint === 'auto'
        ? parsed.endpoint
        : defaultPreferences.endpoint,
      codeTheme: isCodeTheme(parsed.codeTheme) ? parsed.codeTheme : defaultPreferences.codeTheme,
      usernameColoring: parsed.usernameColoring === 'off' || parsed.usernameColoring === 'rp'
        ? parsed.usernameColoring
        : defaultPreferences.usernameColoring,
      trainingNodesCollapsed: typeof parsed.trainingNodesCollapsed === 'boolean'
        ? parsed.trainingNodesCollapsed
        : defaultPreferences.trainingNodesCollapsed,
      customBgColor: typeof parsed.customBgColor === 'string' ? parsed.customBgColor : defaultPreferences.customBgColor,
    };
  } catch {
    return defaultPreferences;
  }
}

function resolveSystemMode(): 'light' | 'dark' {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function StoredPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readStored);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(resolveSystemMode);

  useEffect(() => {
    localStorage.setItem('luoa-oj.prefs', JSON.stringify(preferences));
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = preferences.accent;
  }, [preferences]);

  useEffect(() => {
    let media: MediaQueryList;
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = () => setSystemMode(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedMode = preferences.mode === 'system' ? systemMode : preferences.mode;

  const value = useMemo<PreferencesContextValue>(() => ({
    ...preferences,
    resolvedMode,
    setMode: (mode) => setPreferences((current) => ({ ...current, mode })),
    setAccent: (accent) => setPreferences((current) => ({ ...current, accent })),
    setEndpoint: (endpoint) => {
      forceEndpoint(endpoint);
      setPreferences((current) => ({ ...current, endpoint }));
    },
    setCodeTheme: (codeTheme) => setPreferences((current) => ({ ...current, codeTheme })),
    setUsernameColoring: (usernameColoring) => setPreferences((current) => ({ ...current, usernameColoring })),
    setTrainingNodesCollapsed: (trainingNodesCollapsed) => setPreferences((current) => ({ ...current, trainingNodesCollapsed })),
    setCustomBgColor: (customBgColor) => setPreferences((current) => ({ ...current, customBgColor })),
  }), [preferences, resolvedMode]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside StoredPreferencesProvider');
  return context;
}
