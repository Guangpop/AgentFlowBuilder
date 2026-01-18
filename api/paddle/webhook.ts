import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Paddle, EventName } from '@paddle/paddle-node-sdk';
import { createSupabaseAdmin } from '../_utils/supabase';
import { logEvent } from '../_utils/logger';

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

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
  const rawBody = buf.toString('utf8');
  const signature = req.headers['paddle-signature'] as string;

  if (!signature || !rawBody) {
    console.error('Missing signature or body');
    return res.status(400).json({ error: 'Bad Request' });
  }

  try {
    // Verify signature and unmarshal event
    const eventData = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    );

    await logEvent('webhook', {
      type: eventData.eventType,
      id: eventData.eventId
    });

    // Handle transaction completed event
    if (eventData.eventType === EventName.TransactionCompleted) {
      const transaction = eventData.data;
      const customData = transaction.customData as { user_id?: string; amount?: string } | null;
      const userId = customData?.user_id;
      const amount = parseFloat(customData?.amount || '0');

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

          const currentBalance = parseFloat(profile?.balance || '0');
          const newBalance = currentBalance + amount;

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
            stripe_payment_id: transaction.id, // Store Paddle transaction ID in this field
            balance_after: newBalance,
          });

          if (txError) {
            throw txError;
          }

          await logEvent('topup', {
            amount,
            new_balance: newBalance,
            payment_id: transaction.id
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
          // Don't return error to Paddle, we'll handle this manually
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook validation failed:', error);
    // Log for investigation but still return 200 to prevent retries for invalid signatures
    return res.status(400).json({ error: 'Invalid signature' });
  }
}
