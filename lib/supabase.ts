import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isLocalMode } from './mode';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Local mode: skip Supabase entirely
// Production mode: require Supabase credentials
export const supabase: SupabaseClient | null = (() => {
  if (isLocalMode) {
    console.log('[Mode] Local mode - Supabase disabled');
    return null;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Mode] Production mode but Supabase credentials not configured');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
})();

// Helper to wrap promises with timeout (workaround for Chrome hanging issue)
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  fallbackValue?: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    if (fallbackValue !== undefined) {
      console.warn('[Supabase] Request timed out, using fallback value');
      return fallbackValue;
    }
    throw error;
  }
}

export type { User, Session } from '@supabase/supabase-js';
