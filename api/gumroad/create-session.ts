import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { logEvent } from '../_utils/logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    product_type,
    expected_cents,
  }: {
    product_type?: 'workflow' | 'sop';
    expected_cents?: number;
  } = req.body;

  if (!product_type || !['workflow', 'sop'].includes(product_type)) {
    return res.status(400).json({ error: 'Invalid product_type' });
  }
  if (!expected_cents || typeof expected_cents !== 'number' || expected_cents < 1) {
    return res.status(400).json({ error: 'Invalid expected_cents' });
  }

  const ip = req.headers['x-forwarded-for'] as string;

  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('payment_sessions')
      .insert({
        product_type,
        expected_cents,
        status: 'pending',
      })
      .select('session_id')
      .single();

    if (error || !data) {
      throw error ?? new Error('Failed to create session');
    }

    await logEvent('webhook', {
      event: 'session_created',
      session_id: data.session_id,
      product_type,
      expected_cents,
    }, undefined, ip);

    return res.status(200).json({ session_id: data.session_id });

  } catch (error) {
    console.error('create-session error:', error);
    await logEvent('error', {
      context: 'gumroad_create_session',
      error: String(error),
    }, undefined, ip);
    return res.status(500).json({ error: 'Failed to create payment session' });
  }
}
