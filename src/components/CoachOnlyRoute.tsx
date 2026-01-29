import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CoachOnlyRouteProps {
  children: React.ReactNode;
}

export function CoachOnlyRoute({ children }: CoachOnlyRouteProps) {
  const { isCoach } = useAuth();

  if (!isCoach) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
