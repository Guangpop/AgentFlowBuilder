import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin, verifyToken } from './_utils/supabase.js';
import { logEvent } from './_utils/logger.js';
import { promptsZhTW } from '../prompts/zh-TW.js';
import { promptsEn } from '../prompts/en.js';

const COST_PER_NODE = 15; // TWD per node

// Lazy initialization to avoid cold start errors
let anthropic: Anthropic | null = null;

const getAnthropicClient = () => {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization || '');
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { workflow, language = 'zh-TW' } = req.body;
  if (!workflow) {
    return res.status(400).json({ error: 'Workflow is required' });
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return res.status(400).json({ error: 'Invalid workflow: nodes array is required' });
  }

  const nodeCount = workflow.nodes.length;
  if (nodeCount === 0) {
    return res.status(400).json({ error: 'Workflow must have at least one node' });
  }

  const totalCost = nodeCount * COST_PER_NODE;

  const supabase = createSupabaseAdmin();
  const ip = req.headers['x-forwarded-for'] as string;

  // Log API request
  await logEvent('api_request', {
    endpoint: 'generate-sop',
    node_count: nodeCount,
    language,
  }, user.id, ip);

  // Check balance
  const { data: profile, error: profileError } = await supabase
    .from('users_profile')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    await logEvent('api_error', { endpoint: 'generate-sop', error: String(profileError) }, user.id, ip);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }

  if (!profile || profile.balance < totalCost) {
    await logEvent('blocked', {
      reason: 'insufficient_balance',
      required: totalCost,
      actual: profile?.balance || 0
    }, user.id, ip);
    return res.status(402).json({
      error: 'Insufficient balance',
      required: totalCost,
      balance: profile?.balance || 0
    });
  }

  try {
    // Select prompts based on language
    const prompts = language === 'en' ? promptsEn : promptsZhTW;
    const workflowJson = JSON.stringify(workflow, null, 2);
    const prompt = prompts.agentInstructionsPrompt(workflowJson);

    // Call Claude API with larger max_tokens for SOP generation
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
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
    const newBalance = profile.balance - totalCost;
    const { error: balanceUpdateError } = await supabase
      .from('users_profile')
      .update({
        balance: newBalance,
      })
      .eq('id', user.id);

    if (balanceUpdateError) {
      console.error('Balance update error:', balanceUpdateError);
      await logEvent('api_error', { endpoint: 'generate-sop', error: String(balanceUpdateError) }, user.id, ip);
      return res.status(500).json({ error: 'Failed to update balance' });
    }

    // Update total_spent using SQL increment
    const { error: rpcError } = await supabase.rpc('increment_total_spent', { user_id: user.id, amount: totalCost });

    if (rpcError) {
      console.error('RPC increment_total_spent error:', rpcError);
      await logEvent('api_error', { endpoint: 'generate-sop', error: String(rpcError) }, user.id, ip);
      // Not returning error here as the main operation succeeded
    }

    // Record transaction
    const { error: transactionError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'charge',
      amount: -totalCost,
      description: `Generate SOP (${nodeCount} nodes)`,
      balance_after: newBalance,
    });

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      await logEvent('api_error', { endpoint: 'generate-sop', error: String(transactionError) }, user.id, ip);
      // Not returning error here as the main operation succeeded
    }

    // Save to workflow_history
    const { error: historyError } = await supabase.from('workflow_history').insert({
      user_id: user.id,
      workflow_name: workflow.name || 'Untitled Workflow',
      workflow_json: workflow,
      node_count: nodeCount,
      generated_prompt: result,
      cost: totalCost,
    });

    if (historyError) {
      console.error('Workflow history insert error:', historyError);
      await logEvent('api_error', { endpoint: 'generate-sop', error: String(historyError) }, user.id, ip);
      // Not returning error here as the main operation succeeded
    }

    await logEvent('charge', {
      amount: totalCost,
      endpoint: 'generate-sop',
      new_balance: newBalance,
      node_count: nodeCount,
    }, user.id, ip);

    await logEvent('api_success', {
      endpoint: 'generate-sop',
      node_count: nodeCount,
    }, user.id, ip);

    return res.status(200).json({
      result,
      cost: totalCost,
      newBalance,
    });
  } catch (error) {
    console.error('Generate SOP error:', error);
    await logEvent('api_error', {
      endpoint: 'generate-sop',
      error: String(error),
      errorType: error instanceof Error ? error.name : typeof error,
    }, user.id, ip);
    return res.status(500).json({ error: 'Failed to generate SOP' });
  }
}
