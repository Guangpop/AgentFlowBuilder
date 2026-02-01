import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_utils/supabase.js';
import { logEvent } from '../_utils/logger.js';
import { createOrder, WORKFLOW_COST, SOP_COST_PER_NODE, TOPUP_AMOUNTS } from '../_utils/paypal.js';

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
const isAnonymousMode = process.env.ANONYMOUS_MODE === 'true';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user (optional for anonymous mode)
    const authHeader = req.headers.authorization || '';
    const user = await verifyToken(authHeader);

    if (!isAnonymousMode && !user) {
      return res.status(401).json({ error: 'Please log in to continue' });
    }

    const { type, amount, nodeCount } = req.body;

    if (!type || !['workflow', 'sop', 'topup'].includes(type)) {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    let orderAmount: string;
    let description: string;

    switch (type) {
      case 'workflow':
        orderAmount = WORKFLOW_COST.toFixed(2);
        description = 'Generate Workflow';
        break;
      case 'sop':
        if (!nodeCount || nodeCount < 1) {
          return res.status(400).json({ error: 'Invalid node count' });
        }
        orderAmount = (nodeCount * SOP_COST_PER_NODE).toFixed(2);
        description = `Generate SOP (${nodeCount} nodes)`;
        break;
      case 'topup':
        if (!amount || !TOPUP_AMOUNTS.includes(amount)) {
          return res.status(400).json({ error: 'Invalid topup amount' });
        }
        orderAmount = amount.toFixed(2);
        description = `Top Up $${amount}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid order type' });
    }

    const userId = user?.id || ANONYMOUS_USER_ID;
    const customId = JSON.stringify({ userId, type, nodeCount, amount });

    const orderId = await createOrder({
      amount: orderAmount,
      description,
      customId,
    });

    await logEvent('paypal_order_created', {
      orderId,
      type,
      amount: orderAmount,
    }, userId);

    return res.status(200).json({ orderId });

  } catch (error) {
    console.error('Create order error:', error);
    await logEvent('error', {
      context: 'paypal_create_order',
      error: String(error),
    });
    return res.status(500).json({ error: 'Failed to create order' });
  }
}
