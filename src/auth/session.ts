import { decodeToken, type TokenClaims } from './token';

export interface Session extends TokenClaims {
  token: string;
  username: string;
}

const STORAGE_KEY = 'workshop.session';

type Listener = (session: Session | null) => void;

let current: Session | null = null;
const listeners = new Set<Listener>();

function isValid(session: Session | null): session is Session {
  return session !== null && session.expiresAt > Date.now();
}

function read(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { token?: string; username?: string };
    if (!stored.token || !stored.username) return null;
    const claims = decodeToken(stored.token);
    return claims ? { ...claims, token: stored.token, username: stored.username } : null;
  } catch {
    return null;
  }
}

/**
 * Guarda a sessão fora do React para que o cliente HTTP consiga ler o token.
 * Só o token e o nome de usuário vão para o localStorage; o resto vem das claims.
 */
export const sessionStore = {
  get(): Session | null {
    if (current === null) current = read();
    if (current !== null && !isValid(current)) sessionStore.clear();
    return current;
  },

  start(token: string, username: string): Session {
    const claims = decodeToken(token);
    if (!claims) throw new Error('Token inválido recebido do servidor.');
    const session: Session = { ...claims, token, username };
    current = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, username }));
    } catch {
      // Sem localStorage (modo privado) a sessão vale só até recarregar a página.
    }
    listeners.forEach((listener) => listener(session));
    return session;
  },

  clear(): void {
    const hadSession = current !== null;
    current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignorado
    }
    if (hadSession) listeners.forEach((listener) => listener(null));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
