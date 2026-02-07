import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type UserRole = 'coach' | 'athlete' | 'parent';

type Profile = Tables<'profiles'>;
type TeamMembership = Tables<'team_memberships'> & {
  teams: { id: string; name: string } | null;
};

// Data stored during signup before OTP verification
export interface PendingSignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  currentTeam: { id: string; name: string } | null;
  teamMemberships: TeamMembership[];
  isLoading: boolean;
  isCoach: boolean;
  isAthlete: boolean;
  isParent: boolean;
  pendingSignupData: PendingSignupData | null;
  setPendingSignupData: (data: PendingSignupData | null) => void;
  sendOtp: (identifier: string, method?: 'email' | 'sms') => Promise<{ error: Error | null }>;
  verifyOtp: (identifier: string, token: string, method?: 'email' | 'sms') => Promise<{ error: Error | null; isNewUser: boolean; needsSignup?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCurrentTeam: (team: { id: string; name: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [currentTeam, setCurrentTeam] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSignupData, setPendingSignupData] = useState<PendingSignupData | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const fetchTeamMemberships = async (userId: string) => {
    const { data, error } = await supabase
      .from('team_memberships')
      .select('*, teams(id, name)')
      .eq('profile_id', userId);
    
    if (error) {
      console.error('Error fetching team memberships:', error);
      return [];
    }
    return data as TeamMembership[];
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const [profileData, memberships] = await Promise.all([
      fetchProfile(user.id),
      fetchTeamMemberships(user.id)
    ]);
    
    setProfile(profileData);
    setTeamMemberships(memberships);
    
    // Set first team as current if none selected
    if (!currentTeam && memberships.length > 0 && memberships[0].teams) {
      setCurrentTeam(memberships[0].teams);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const [profileData, memberships] = await Promise.all([
              fetchProfile(session.user.id),
              fetchTeamMemberships(session.user.id)
            ]);
            
            setProfile(profileData);
            setTeamMemberships(memberships);
            
            if (memberships.length > 0 && memberships[0].teams) {
              setCurrentTeam(memberships[0].teams);
            }
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setTeamMemberships([]);
          setCurrentTeam(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setIsLoading(false);
      }
      // Auth state change listener will handle the rest
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (identifier: string, method: 'email' | 'sms' = 'email') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ identifier, method }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOtp = async (identifier: string, token: string, method: 'email' | 'sms' = 'email') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            identifier,
            method,
            code: token,
            signupData: pendingSignupData ? {
              firstName: pendingSignupData.firstName,
              lastName: pendingSignupData.lastName,
              phone: pendingSignupData.phone,
              role: pendingSignupData.role,
            } : undefined,
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Check if user needs to sign up
        if (data.needsSignup) {
          return { error: new Error(data.error || 'No account found'), isNewUser: false, needsSignup: true };
        }
        throw new Error(data.error || 'Invalid verification code');
      }

      // Clear pending signup data after successful verification
      const isNewUser = data.isNewUser;
      if (isNewUser) {
        setPendingSignupData(null);
      }

      // Use the action link to authenticate the user
      if (data.actionLink) {
        // Extract token from action link and verify
        const url = new URL(data.actionLink);
        const linkToken = url.searchParams.get('token');
        const type = url.searchParams.get('type') as 'magiclink' | 'recovery' | 'invite' | 'email';
        
        if (linkToken) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: linkToken,
            type: type || 'magiclink',
          });
          
          if (verifyError) {
            console.error('Session verification error:', verifyError);
            throw verifyError;
          }
        }
      }
      
      return { error: null, isNewUser, needsSignup: false };
    } catch (error) {
      return { error: error as Error, isNewUser: false, needsSignup: false };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setTeamMemberships([]);
    setCurrentTeam(null);
    setPendingSignupData(null);
  };

  const isCoach = profile?.role === 'coach';
  const isAthlete = profile?.role === 'athlete';
  const isParent = profile?.role === 'parent';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      currentTeam,
      teamMemberships,
      isLoading,
      isCoach,
      isAthlete,
      isParent,
      pendingSignupData,
      setPendingSignupData,
      sendOtp,
      verifyOtp,
      signOut,
      refreshProfile,
      setCurrentTeam
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
