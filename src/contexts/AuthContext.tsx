import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type UserRole = 'coach' | 'athlete' | 'parent';

type Profile = Tables<'profiles'>;
type TeamMembership = Tables<'team_memberships'> & {
  teams: { id: string; name: string; join_code: string } | null;
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
  currentTeam: { id: string; name: string; join_code: string } | null;
  teamMemberships: TeamMembership[];
  isLoading: boolean;
  isCoach: boolean;
  isAthlete: boolean;
  isParent: boolean;
  pendingSignupData: PendingSignupData | null;
  setPendingSignupData: (data: PendingSignupData | null) => void;
  sendOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null; isNewUser: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCurrentTeam: (team: { id: string; name: string; join_code: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [currentTeam, setCurrentTeam] = useState<{ id: string; name: string; join_code: string } | null>(null);
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
      .select('*, teams(id, name, join_code)')
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

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });
      
      if (error) throw error;
      
      // Check if this is a new user (no profile yet)
      let isNewUser = false;
      if (data.user) {
        const existingProfile = await fetchProfile(data.user.id);
        isNewUser = !existingProfile;
        
        // If new user and we have pending signup data, create the profile
        if (isNewUser && pendingSignupData) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              first_name: pendingSignupData.firstName,
              last_name: pendingSignupData.lastName,
              email: pendingSignupData.email,
              phone: pendingSignupData.phone || null,
              role: pendingSignupData.role
            });
          
          if (profileError) throw profileError;
          
          // Clear pending data after successful profile creation
          setPendingSignupData(null);
        }
      }
      
      return { error: null, isNewUser };
    } catch (error) {
      return { error: error as Error, isNewUser: false };
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
