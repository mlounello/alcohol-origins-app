'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // Use fetch directly to avoid Supabase client query issues
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`;

      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Profile fetch failed:', response.statusText);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return data[0] as Profile;
      }

      return null;
    } catch (err) {
      console.error('fetchProfile exception:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const newProfile = await fetchProfile(user.id);
      setProfile(newProfile);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error.message);
          setIsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Small delay to ensure the profile trigger has run for new users
          await new Promise(resolve => setTimeout(resolve, 200));

          if (!mounted) return;

          const profileData = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profileData);
            setIsLoading(false);
          }
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    const supabase = createClient();
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
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

// Helper hook to check permissions
export function usePermissions() {
  const { profile } = useAuth();

  const role: UserRole = profile?.role ?? 'viewer';

  return {
    role,
    canView: true,
    canCreate: ['contributor', 'editor', 'admin'].includes(role),
    canEdit: ['contributor', 'editor', 'admin'].includes(role),
    canRevert: ['editor', 'admin'].includes(role),
    canDelete: role === 'admin',
    canManageUsers: role === 'admin',
    canImport: role === 'admin',
  };
}
