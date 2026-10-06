import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest } from '@/api/auth';
import { sessionStore, type Session } from './session';

interface AuthContextValue {
  session: Session | null;
  login: (username: string, password: string) => Promise<Session>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => sessionStore.get());

  useEffect(() => sessionStore.subscribe(setSession), []);

  // O backend não tem refresh token: quando o JWT expira (1h), a sessão é encerrada.
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    const timer = window.setTimeout(() => sessionStore.clear(), Math.max(remaining, 0));
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await loginRequest({ username, password });
    return sessionStore.start(token, username);
  }, []);

  const logout = useCallback(() => sessionStore.clear(), []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

/** Atalho para telas que só existem com usuário logado. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('Nenhuma sessão ativa.');
  return session;
}
