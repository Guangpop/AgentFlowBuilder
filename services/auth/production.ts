import { supabase, withTimeout, Session } from '../../lib/supabase';
import { UserProfile } from '../../lib/database.types';
import { AuthService } from './types';

// Production mode: Supabase auth service
export const productionAuthService: AuthService = {
  enabled: true,

  async getSession() {
    if (!supabase) {
      console.warn('[Auth] Supabase not configured');
      return { session: null, user: null };
    }

    // Add timeout to prevent infinite hang (workaround for Chrome-specific issue)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('getSession timeout')), 5000);
    });

    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise,
      ]);
      const { data: { session } } = result as { data: { session: Session | null } };
      return { session, user: session?.user ?? null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[Auth] getSession failed:', errorMessage);

      // On timeout, try to read from localStorage directly as fallback
      if (errorMessage.includes('timeout')) {
        const storageKey = Object.keys(localStorage).find(
          (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (storageKey) {
          try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            if (stored.user) {
              console.log('[Auth] Using localStorage fallback');
              return { session: stored, user: stored.user };
            }
          } catch (e) {
            console.error('[Auth] localStorage fallback failed:', e);
          }
        }
      }
      return { session: null, user: null };
    }
  },

  async signInWithGoogle() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  async signOut() {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  async fetchProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('users_profile')
          .select('*')
          .eq('id', userId)
          .single(),
        5000,
        { data: null, error: null }
      );

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.warn('[Auth] fetchProfile timed out');
      return null;
    }
  },

  onAuthStateChange(callback) {
    if (!supabase) {
      return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        callback(session, session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  },
};
