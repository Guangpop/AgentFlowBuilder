import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin, verifyToken } from './_utils/supabase';
import { logEvent } from './_utils/logger';

const WORKFLOW_COST = 0.5;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization as string);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { prompt, language } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const supabase = createSupabaseAdmin();
  const ip = req.headers['x-forwarded-for'] as string;

  // Log API request
  await logEvent('api_request', {
    endpoint: 'generate-workflow',
    prompt_length: prompt.length
  }, user.id, ip);

  // Check balance
  const { data: profile } = await supabase
    .from('users_profile')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (!profile || profile.balance < WORKFLOW_COST) {
    await logEvent('blocked', {
      reason: 'insufficient_balance',
      required: WORKFLOW_COST,
      actual: profile?.balance || 0
    }, user.id, ip);
    return res.status(402).json({
      error: 'Insufficient balance',
      required: WORKFLOW_COST,
      balance: profile?.balance || 0
    });
  }

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
    });

    // Extract result
    const textBlock = response.content.find(block => block.type === 'text');
    const result = textBlock?.type === 'text' ? textBlock.text : '';

    // Deduct balance after successful API call
    const newBalance = profile.balance - WORKFLOW_COST;
    await supabase
      .from('users_profile')
      .update({
        balance: newBalance,
      })
      .eq('id', user.id);

    // Update total_spent using SQL increment
    await supabase.rpc('increment_total_spent', { user_id: user.id, amount: WORKFLOW_COST });

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'charge',
      amount: -WORKFLOW_COST,
      description: 'Generate Workflow',
      balance_after: newBalance,
    });

    await logEvent('charge', {
      amount: WORKFLOW_COST,
      endpoint: 'generate-workflow',
      new_balance: newBalance
    }, user.id, ip);

    await logEvent('api_success', {
      endpoint: 'generate-workflow'
    }, user.id, ip);

    return res.status(200).json({ result });
  } catch (error) {
    console.error('Generate workflow error:', error);
    await logEvent('api_error', {
      endpoint: 'generate-workflow',
      error: String(error)
    }, user.id, ip);
    return res.status(500).json({ error: 'Failed to generate workflow' });
  }
}
