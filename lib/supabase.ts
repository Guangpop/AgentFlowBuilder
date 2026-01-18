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

export type { User, Session } from '@supabase/supabase-js';
