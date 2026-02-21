import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing session id' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid session id format' });
  }

  try {
    const supabase = createSupabaseAdmin();

    const { data: session, error } = await supabase
      .from('payment_sessions')
      .select('status, payment_token, expires_at')
      .eq('session_id', id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'pending' && new Date() > new Date(session.expires_at)) {
      await supabase
        .from('payment_sessions')
        .update({ status: 'expired' })
        .eq('session_id', id);
      return res.status(200).json({ status: 'expired' });
    }

    if (session.status === 'paid') {
      return res.status(200).json({
        status: 'paid',
        payment_token: session.payment_token,
      });
    }

    return res.status(200).json({ status: session.status });

  } catch (error) {
    console.error('check-session error:', error);
    return res.status(500).json({ error: 'Failed to check session' });
  }
}
