import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { hasAnyRole, type Role } from './roles';

interface RequireAuthProps {
  /** Papéis que podem ver a rota. Sem valor, basta estar logado. */
  roles?: readonly Role[];
  children?: ReactNode;
}

/**
 * Protege rotas: sem sessão manda para /login (lembrando de onde o usuário veio);
 * com sessão mas sem o papel certo, mostra /acesso-negado.
 */
export function RequireAuth({ roles, children }: RequireAuthProps) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!hasAnyRole(session.role, roles)) {
    return <Navigate to="/acesso-negado" replace />;
  }
  return children ?? <Outlet />;
}
