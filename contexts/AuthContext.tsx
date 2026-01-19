import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '../lib/supabase';
import { UserProfile } from '../lib/database.types';
import { authService } from '../services';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(authService.enabled);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await authService.fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user]);

  useEffect(() => {
    // Skip if auth is disabled (local mode)
    if (!authService.enabled) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    authService.getSession().then(({ session, user }) => {
      setSession(session);
      setUser(user);
      if (user) {
        authService.fetchProfile(user.id).then(setProfile);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange(async (session, user) => {
      setSession(session);
      setUser(user);

      if (user) {
        const profileData = await authService.fetchProfile(user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
