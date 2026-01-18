import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin, verifyToken } from '../_utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization as string);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
