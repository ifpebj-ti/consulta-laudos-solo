import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types/auth';

export function ProtectedRoute({ role, redirectTo }: { role: Role; redirectTo: string }) {
  const { session } = useAuth();

  if (!session || session.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
