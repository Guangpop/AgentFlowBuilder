import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { verifyToken } from '../_utils/supabase';
import { logEvent } from '../_utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const VALID_AMOUNTS = [3, 5, 10, 20, 50];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyToken(req.headers.authorization as string);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { amount, returnUrl } = req.body;

  if (!amount || !VALID_AMOUNTS.includes(amount)) {
    return res.status(400).json({ error: 'Invalid amount. Valid amounts: 3, 5, 10, 20, 50' });
  }

  try {
    await logEvent('api_request', {
      endpoint: 'create-checkout',
      amount
    }, user.id);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AgentFlowBuilder 儲值 $${amount}`,
              description: '帳戶餘額儲值',
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        amount: amount.toString(),
      },
      success_url: `${returnUrl || process.env.VITE_APP_URL || 'http://localhost:3000'}?payment=success&amount=${amount}`,
      cancel_url: `${returnUrl || process.env.VITE_APP_URL || 'http://localhost:3000'}?payment=canceled`,
    });

    await logEvent('api_success', {
      endpoint: 'create-checkout',
      session_id: session.id
    }, user.id);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    await logEvent('api_error', {
      endpoint: 'create-checkout',
      error: String(error)
    }, user.id);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
