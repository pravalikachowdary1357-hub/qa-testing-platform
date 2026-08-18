import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../api/auth';
import type { ApiCurrentUser } from '../types/auth';

const STORAGE_KEY = 'testsphere.auth.token';

interface AuthContextValue {
  user: ApiCurrentUser | null;
  authLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// "Remember me" is real, not decorative: checked -> localStorage (survives
// closing the browser), unchecked -> sessionStorage (cleared when the tab/
// browser closes). Both are checked on load since either could hold the
// live session.
function readStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
}

function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiCurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const clearSession = () => {
    clearStoredToken();
    setAuthToken(null);
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    const storedToken = readStoredToken();
    if (!storedToken) {
      setAuthLoading(false);
      return;
    }
    setAuthToken(storedToken);
    fetchCurrentUser()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setAuthLoading(false));

    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authLoading,
      login: async (email, password, remember = true) => {
        const response = await loginRequest(email, password);
        clearStoredToken();
        (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, response.token);
        setAuthToken(response.token);
        setUser(response.user);
      },
      logout: async () => {
        await logoutRequest().catch(() => {});
        clearSession();
      },
      hasPermission: (permission) => Boolean(user?.permissions.includes(permission)),
      refresh: async () => {
        const current = await fetchCurrentUser();
        setUser(current);
      },
    }),
    [user, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
