import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTeam?: boolean;
}

export function ProtectedRoute({ children, requireTeam = false }: ProtectedRouteProps) {
  const { user, profile, teamMemberships, isLoading, refreshProfile } = useAuth();
  const location = useLocation();
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  // When user exists but no profile, try refreshing once
  useEffect(() => {
    if (!isLoading && user && !profile && !hasCheckedProfile) {
      console.log('User has no profile, refreshing...');
      refreshProfile().then(() => {
        setHasCheckedProfile(true);
      });
    }
  }, [isLoading, user, profile, hasCheckedProfile, refreshProfile]);

  // Still loading initial auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User exists but waiting for profile check
  if (!profile && !hasCheckedProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User exists but confirmed no profile after refresh - redirect to signup
  if (!profile && hasCheckedProfile) {
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
