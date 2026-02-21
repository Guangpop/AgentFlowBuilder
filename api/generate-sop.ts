import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin, verifyToken } from './_utils/supabase.js';
import { logEvent } from './_utils/logger.js';
import { consumePaymentToken } from './_utils/paymentToken.js';
import { promptsZhTW } from '../prompts/zh-TW.js';
import { promptsEn } from '../prompts/en.js';

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
const isAnonymousMode = process.env.ANONYMOUS_MODE === 'true';

const SOP_COST_PER_NODE = 0.49; // USD per node

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

  // Anonymous mode: skip JWT verification
  let user: { id: string; email?: string } | null = null;

  if (isAnonymousMode) {
    user = { id: ANONYMOUS_USER_ID, email: 'anonymous@local' };
  } else {
    user = await verifyToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Validate payment token (skip in anonymous/dev mode)
  if (!isAnonymousMode) {
    const paymentToken = req.headers['x-payment-token'] as string;
    try {
      await consumePaymentToken(paymentToken, 'sop');
    } catch (err) {
      return res.status(402).json({
        error: err instanceof Error ? err.message : 'Payment required',
      });
    }
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

  const totalCost = nodeCount * SOP_COST_PER_NODE;

  const supabase = createSupabaseAdmin();
  const ip = req.headers['x-forwarded-for'] as string;

  // Rate limit check (5 requests per minute per user) - skip in anonymous mode
  if (!isAnonymousMode) {
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'generate-sop',
      p_max_requests: 5
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (!allowed) {
      await logEvent('blocked', { reason: 'rate_limit', endpoint: 'generate-sop' }, user.id, ip);
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }
  }

  // Log API request
  await logEvent('api_request', {
    endpoint: 'generate-sop',
    node_count: nodeCount,
    language,
  }, user.id, ip);

  try {
    // Select prompts based on language
    const prompts = language === 'en' ? promptsEn : promptsZhTW;
    const workflowJson = JSON.stringify(workflow, null, 2);
    const prompt = prompts.agentInstructionsPrompt(workflowJson);

    // Generate SOP
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

    await logEvent('api_success', {
      endpoint: 'generate-sop',
      cost: totalCost,
      node_count: nodeCount,
    }, user.id, ip);

    return res.status(200).json({ result });
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
