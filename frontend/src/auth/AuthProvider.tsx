import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (identifier: string, password?: string) => Promise<User>;
  loginWithMicrosoft: (email?: string) => void;
  loginWithGoogle: (email?: string) => void;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'auth_user';

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

async function fetchMe(token: string): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.user as User | null) ?? null;
  } catch {
    return null;
  }
}

function checkInitialAuth(): { token: string | null; status: 'loading' | 'authenticated' | 'unauthenticated' } {
  try {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      return { token: accessToken, status: 'loading' };
    }
  } catch {}

  const token = getAccessToken();
  if (token) {
    return { token, status: getStoredUser() ? 'authenticated' : 'loading' };
  }
  return { token: null, status: 'unauthenticated' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(() => {
    return checkInitialAuth().status;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = getAccessToken();
    if (!token) {
      clearTokens();
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    fetchMe(token).then((u) => {
      if (u) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
        setUser(u);
        setStatus('authenticated');
      } else {
        clearTokens();
        setUser(null);
        setStatus('unauthenticated');
      }
    }).catch(() => {
      clearTokens();
      setUser(null);
      setStatus('unauthenticated');
    });
  }, []);

  const login = useCallback(async (identifier: string, password?: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, email: identifier, password: password || '' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Credenciales incorrectas');
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    if (data.user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    }
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Register failed');
      }
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setStatus('authenticated');
    },
    []
  );

  const loginWithMicrosoft = useCallback((email?: string) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    window.location.href = `/api/integrations/microsoft/login?${params.toString()}`;
  }, []);

  const loginWithGoogle = useCallback((email?: string) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    window.location.href = `/api/integrations/google/login?${params.toString()}`;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      }
    } catch {
      // ignorar
    }
    clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      register,
      loginWithMicrosoft,
      loginWithGoogle,
      updateUser,
      logout,
    }),
    [user, status, login, register, loginWithMicrosoft, loginWithGoogle, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
