import { User, Session } from '../../lib/supabase';
import { UserProfile } from '../../lib/database.types';

// Auth Service Interface
export interface AuthService {
  // Check if auth is enabled
  readonly enabled: boolean;

  // Get current session (with timeout handling)
  getSession(): Promise<{ session: Session | null; user: User | null }>;

  // Sign in with Google OAuth
  signInWithGoogle(): Promise<void>;

  // Sign out
  signOut(): Promise<void>;

  // Fetch user profile
  fetchProfile(userId: string): Promise<UserProfile | null>;

  // Subscribe to auth state changes
  // Returns unsubscribe function
  onAuthStateChange(
    callback: (session: Session | null, user: User | null) => void
  ): () => void;
}
