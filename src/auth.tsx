import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { currentUser, login as hydroLogin, logout as hydroLogout } from './lib/api';
import { ApiError, sessionExpiredEvent } from './lib/errors';
import type { HydroUser } from './types';

interface AuthContextValue {
  user: HydroUser | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (uname: string, password: string, remember: boolean, tfa?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let initialUserRequest: Promise<HydroUser | null> | null = null;

function currentUserOnce(): Promise<HydroUser | null> {
  if (!initialUserRequest) {
    initialUserRequest = currentUser().finally(() => {
      initialUserRequest = null;
    });
  }
  return initialUserRequest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HydroUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const nextUser = await currentUser();
      setUser(nextUser && nextUser._id ? nextUser : null);
      setError('');
    } catch (cause) {
      setUser(null);
      setError(cause instanceof Error ? cause.message : '无法连接 Hydro 服务。');
      throw cause;
    }
  }, []);

  useEffect(() => {
    let active = true;
    currentUserOnce()
      .then((nextUser) => {
        if (!active) return;
        setUser(nextUser && nextUser._id ? nextUser : null);
        setError('');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setUser(null);
        setError(cause instanceof Error ? cause.message : '无法连接 Hydro 服务。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => {
      setUser(null);
      setError('');
    };
    window.addEventListener(sessionExpiredEvent, clearExpiredSession);
    return () => window.removeEventListener(sessionExpiredEvent, clearExpiredSession);
  }, []);

  const login = useCallback(async (uname: string, password: string, remember: boolean, tfa = '') => {
    await hydroLogin(uname, password, remember, tfa);
    const session = await currentUser();
    if (!session || !session._id) {
      setUser(null);
      throw new ApiError('用户名或密码不正确，或账户需要二次验证。');
    }
    setUser(session);
    setError('');
  }, []);

  const logout = useCallback(async () => {
    await hydroLogout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    refresh,
    login,
    logout,
  }), [user, loading, error, refresh, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
