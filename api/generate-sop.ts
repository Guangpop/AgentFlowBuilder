import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdmin, verifyToken } from './_utils/supabase.js';
import { logEvent } from './_utils/logger.js';
import { promptsZhTW } from '../prompts/zh-TW.js';
import { promptsEn } from '../prompts/en.js';

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
const isAnonymousMode = process.env.ANONYMOUS_MODE === 'true';

const COST_PER_NODE = 15; // TWD per node

// TapPay API endpoint
const TAPPAY_SANDBOX_URL = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';
const TAPPAY_PROD_URL = 'https://prod.tappaysdk.com/tpc/payment/pay-by-prime';

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

// Process TapPay payment
async function processTapPayPayment(
  prime: string,
  amount: number,
  userEmail: string,
  description: string
): Promise<{ success: boolean; recTradeId?: string; error?: { code: number; message: string } }> {
  const partnerKey = process.env.TAPPAY_PARTNER_KEY;
  const merchantId = process.env.TAPPAY_MERCHANT_ID;

  if (!partnerKey || !merchantId) {
    return { success: false, error: { code: -99, message: 'TapPay not configured' } };
  }

  const isProduction = process.env.VITE_TAPPAY_ENV === 'production';
  const apiUrl = isProduction ? TAPPAY_PROD_URL : TAPPAY_SANDBOX_URL;

  const tapPayRequest = {
    prime,
    partner_key: partnerKey,
    merchant_id: merchantId,
    details: description,
    amount,
    currency: 'TWD',
    cardholder: {
      phone_number: '',
      name: userEmail.split('@')[0] || 'User',
      email: userEmail,
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': partnerKey,
    },
    body: JSON.stringify(tapPayRequest),
  });

  const result = await response.json();

  if (result.status === 0) {
    return { success: true, recTradeId: result.rec_trade_id };
  } else {
    return { success: false, error: { code: result.status, message: result.msg } };
  }
}

// Log critical event to system_logs table
async function logCriticalEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  userEmail: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('system_logs').insert({
      level: 'critical',
      event: 'payment_failed_after_generation',
      user_id: userId,
      user_email: userEmail,
      details,
    });
  } catch (err) {
    console.error('Failed to log critical event:', err);
  }
}

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

  const { workflow, language = 'zh-TW', prime } = req.body;
  if (!workflow) {
    return res.status(400).json({ error: 'Workflow is required' });
  }

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return res.status(400).json({ error: 'Invalid workflow: nodes array is required' });
  }

  if (!prime) {
    return res.status(400).json({ error: 'Payment information is required' });
  }

  const nodeCount = workflow.nodes.length;
  if (nodeCount === 0) {
    return res.status(400).json({ error: 'Workflow must have at least one node' });
  }

  const totalCost = nodeCount * COST_PER_NODE;

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

    // Step 1: Generate SOP first
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

    // Step 2: Process payment after successful generation
    const paymentResult = await processTapPayPayment(
      prime,
      totalCost,
      user.email || '',
      `生成 SOP (${nodeCount} 節點) - NT$${totalCost}`
    );

    if (!paymentResult.success) {
      // Generation succeeded but payment failed - log critical event
      const firstNode = workflow.nodes[0] || {};
      await logCriticalEvent(supabase, user.id, user.email || '', {
        type: 'sop',
        amount: totalCost,
        node_count: nodeCount,
        workflow_title: workflow.name || 'Untitled',
        workflow_description: workflow.description || '',
        first_node: {
          id: firstNode.node_id || '',
          type: firstNode.node_type || '',
          description: firstNode.description || '',
        },
        tappay_error: paymentResult.error,
      });

      await logEvent('payment_failed', {
        endpoint: 'generate-sop',
        amount: totalCost,
        node_count: nodeCount,
        error: paymentResult.error,
      }, user.id, ip);

      return res.status(402).json({
        error: '付款失敗，請重試',
        payment_error: paymentResult.error,
      });
    }

    // Step 3: Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'charge',
      amount: -totalCost,
      description: isAnonymousMode ? `Anonymous SOP (${nodeCount} nodes)` : `Generate SOP (${nodeCount} nodes)`,
      stripe_payment_id: paymentResult.recTradeId,
      balance_after: isAnonymousMode ? null : 0,
    });

    if (txError) {
      console.error('Transaction record error:', txError);
      // Non-critical - payment succeeded, just log the error
    }

    // Update total_spent and save history (skip in anonymous mode)
    if (!isAnonymousMode) {
      await supabase.rpc('increment_total_spent', {
        p_user_id: user.id,
        p_amount: totalCost,
      }).catch(err => {
        console.error('Failed to update total_spent:', err);
      });

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
      }
    }

    await logEvent('charge', {
      amount: totalCost,
      endpoint: 'generate-sop',
      rec_trade_id: paymentResult.recTradeId,
      node_count: nodeCount,
    }, user.id, ip);

    await logEvent('api_success', {
      endpoint: 'generate-sop',
      node_count: nodeCount,
    }, user.id, ip);

    return res.status(200).json({
      result,
      cost: totalCost,
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
