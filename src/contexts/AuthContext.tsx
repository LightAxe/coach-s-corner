import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'coach' | 'athlete' | 'parent';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isCoach: boolean;
  isAthlete: boolean;
  isParent: boolean;
  // For demo purposes - will be replaced with real auth
  setMockRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demo - will be replaced with real auth
const createMockUser = (role: UserRole): User => ({
  id: '1',
  name: role === 'coach' ? 'Coach Smith' : role === 'athlete' ? 'Alex Runner' : 'Parent Johnson',
  email: `${role}@example.com`,
  role,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockRole, setMockRole] = useState<UserRole>('coach');
  const user = createMockUser(mockRole);

  const value: AuthContextType = {
    user,
    isCoach: user.role === 'coach',
    isAthlete: user.role === 'athlete',
    isParent: user.role === 'parent',
    setMockRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
