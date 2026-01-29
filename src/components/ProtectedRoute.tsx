import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTeam?: boolean;
}

export function ProtectedRoute({ children, requireTeam = false }: ProtectedRouteProps) {
  const { user, profile, teamMemberships, isLoading, signOut } = useAuth();
  const location = useLocation();

  // If user exists but has no profile, sign them out
  useEffect(() => {
    if (!isLoading && user && !profile) {
      console.log('User has no profile, signing out...');
      signOut();
    }
  }, [isLoading, user, profile, signOut]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User exists but no profile - will be signed out by useEffect above
  if (!profile) {
    return <Navigate to="/signup" replace />;
  }

  // If user needs to be on a team but isn't
  if (requireTeam && teamMemberships.length === 0) {
    if (profile.role === 'coach') {
      return <Navigate to="/create-team" replace />;
    } else {
      return <Navigate to="/join-team" replace />;
    }
  }

  return <>{children}</>;
}
