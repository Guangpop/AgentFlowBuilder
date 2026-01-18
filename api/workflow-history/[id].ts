import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin, verifyToken } from '../_utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await verifyToken(req.headers.authorization || '');
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const supabase = createSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('workflow_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('workflow_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
