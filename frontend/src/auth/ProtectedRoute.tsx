import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { ReactNode } from 'react';
import { Loading } from '../components/Loading';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading />;
  if (status === 'unauthenticated') {
    const isStudentRoute = location.pathname.startsWith('/student-portal');
    return <Navigate to={isStudentRoute ? '/login?role=student' : '/login?role=teacher'} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
