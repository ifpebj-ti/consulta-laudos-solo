import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types/auth';

export function ProtectedRoute({ role, redirectTo }: { role: Role | Role[]; redirectTo: string }) {
  const { session } = useAuth();
  const permitidos = Array.isArray(role) ? role : [role];

  if (!session || !permitidos.includes(session.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
