import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin, verifyToken } from '../_utils/supabase.js';
import { logEvent } from '../_utils/logger.js';
import { captureOrder, getPayPalErrorMessage } from '../_utils/paypal.js';

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
const isAnonymousMode = process.env.ANONYMOUS_MODE === 'true';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const user = await verifyToken(authHeader);

    if (!isAnonymousMode && !user) {
      return res.status(401).json({ error: 'Please log in to continue' });
    }

    const { orderId, type } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
    }

    // Capture the payment
    const captureResult = await captureOrder(orderId);

    if (captureResult.status !== 'COMPLETED') {
      return res.status(400).json({
        error: getPayPalErrorMessage(captureResult.status)
      });
    }

    const userId = user?.id || ANONYMOUS_USER_ID;
    const supabase = createSupabaseAdmin();
    const amount = parseFloat(captureResult.amount);

    // Handle topup: update balance
    if (type === 'topup' && user) {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('balance')
        .eq('id', user.id)
        .single();

      const currentBalance = parseFloat(profile?.balance || '0');
      const newBalance = currentBalance + amount;

      await supabase
        .from('users_profile')
        .update({ balance: newBalance })
        .eq('id', user.id);

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'topup',
        amount: amount,
        description: `Top Up $${amount}`,
        stripe_payment_id: captureResult.transactionId,
        balance_after: newBalance,
      });

      await logEvent('topup', {
        amount,
        new_balance: newBalance,
        paypal_transaction_id: captureResult.transactionId,
      }, user.id);

      return res.status(200).json({
        success: true,
        transactionId: captureResult.transactionId,
        newBalance,
      });
    }

    // For workflow/sop, just record the payment
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'charge',
      amount: -amount,
      description: type === 'workflow' ? 'Generate Workflow' : 'Generate SOP',
      stripe_payment_id: captureResult.transactionId,
      balance_after: isAnonymousMode ? null : 0,
    });

    await logEvent('charge', {
      amount,
      type,
      paypal_transaction_id: captureResult.transactionId,
    }, userId);

    return res.status(200).json({
      success: true,
      transactionId: captureResult.transactionId,
    });

  } catch (error) {
    console.error('Capture order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Capture failed';
    await logEvent('error', {
      context: 'paypal_capture_order',
      error: errorMessage,
    });
    return res.status(500).json({
      error: getPayPalErrorMessage(errorMessage)
    });
  }
}
