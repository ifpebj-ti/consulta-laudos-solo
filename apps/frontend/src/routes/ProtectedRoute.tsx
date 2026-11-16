import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { tokenExpirado } from '@/lib/token';
import type { Role } from '@/types/auth';
import type { EstadoRedirecionamento } from './rotas';

interface ProtectedRouteProps {
  perfil?: Role | Role[];
  role?: Role | Role[];
  redirectTo: string;
}

export function ProtectedRoute({ perfil, role, redirectTo }: ProtectedRouteProps) {
  const { session } = useAuth();
  const location = useLocation();
  const alvo = perfil ?? role;
  const permitidos = Array.isArray(alvo) ? alvo : alvo ? [alvo] : [];

  if (!session || !permitidos.includes(session.role) || tokenExpirado(session.token)) {
    const estado: EstadoRedirecionamento = { de: `${location.pathname}${location.search}` };
    return <Navigate to={redirectTo} replace state={estado} />;
  }

  return <Outlet />;
}
