import { createSupabaseAdmin } from './supabase';

type EventType =
  | 'login'
  | 'logout'
  | 'topup'
  | 'charge'
  | 'api_request'
  | 'api_success'
  | 'api_error'
  | 'blocked'
  | 'webhook'
  | 'error';

export const logEvent = async (
  eventType: EventType,
  details: Record<string, unknown>,
  userId?: string,
  ipAddress?: string
) => {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('server_logs').insert({
      user_id: userId || null,
      event_type: eventType,
      details,
      ip_address: ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
};
