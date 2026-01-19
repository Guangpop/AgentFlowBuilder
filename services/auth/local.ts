import { AuthService } from './types';

// Local mode: no-op auth service
export const localAuthService: AuthService = {
  enabled: false,

  async getSession() {
    console.log('[Auth] Local mode - getSession skipped');
    return { session: null, user: null };
  },

  async signInWithGoogle() {
    console.log('[Auth] Local mode - signInWithGoogle skipped');
  },

  async signOut() {
    console.log('[Auth] Local mode - signOut skipped');
  },

  async fetchProfile(_userId: string) {
    console.log('[Auth] Local mode - fetchProfile skipped');
    return null;
  },

  onAuthStateChange(_callback) {
    console.log('[Auth] Local mode - onAuthStateChange skipped');
    // Return no-op unsubscribe
    return () => {};
  },
};
