import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { tokenExpirado } from '@/lib/token';
import type { Role } from '@/types/auth';
import type { EstadoRedirecionamento } from './rotas';

export function ProtectedRoute({ perfil, redirectTo }: { perfil: Role; redirectTo: string }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session || session.role !== perfil || tokenExpirado(session.token)) {
    const estado: EstadoRedirecionamento = { de: `${location.pathname}${location.search}` };
    return <Navigate to={redirectTo} replace state={estado} />;
  }

  return <Outlet />;
}
