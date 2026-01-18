import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createSupabaseAdmin } from '../_utils/supabase';
import { logEvent } from '../_utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Disable body parsing for raw body access
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  await logEvent('webhook', {
    type: event.type,
    id: event.id
  });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amount = parseFloat(session.metadata?.amount || '0');

    if (userId && amount > 0) {
      try {
        const supabase = createSupabaseAdmin();

        // Get current balance
        const { data: profile, error: fetchError } = await supabase
          .from('users_profile')
          .select('balance')
          .eq('id', userId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const currentBalance = profile?.balance || 0;
        const newBalance = parseFloat(currentBalance) + amount;

        // Update balance
        const { error: updateError } = await supabase
          .from('users_profile')
          .update({ balance: newBalance })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        // Record transaction
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: userId,
          type: 'topup',
          amount: amount,
          description: `儲值 $${amount}`,
          stripe_payment_id: session.payment_intent as string,
          balance_after: newBalance,
        });

        if (txError) {
          throw txError;
        }

        await logEvent('topup', {
          amount,
          new_balance: newBalance,
          payment_id: session.payment_intent
        }, userId);

        console.log(`Topup successful: user=${userId}, amount=${amount}, new_balance=${newBalance}`);

      } catch (error) {
        console.error('Error processing payment:', error);
        await logEvent('error', {
          error: String(error),
          context: 'webhook_topup',
          user_id: userId,
          amount
        });
        // Don't return error to Stripe, we'll handle this manually
      }
    }
  }

  return res.status(200).json({ received: true });
}
