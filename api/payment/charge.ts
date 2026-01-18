import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin, verifyToken } from '../_utils/supabase.js';
import { logEvent } from '../_utils/logger.js';

// Allowed amounts whitelist (TWD) - prevents frontend tampering
const ALLOWED_AMOUNTS = [15, 100, 150, 300];

// TapPay API endpoint
const TAPPAY_API_URL = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

interface TapPayRequest {
  prime: string;
  partner_key: string;
  merchant_id: string;
  details: string;
  amount: number;
  cardholder: {
    phone_number: string;
    name: string;
    email: string;
  };
}

interface TapPayResponse {
  status: number;
  msg: string;
  rec_trade_id: string;
  bank_transaction_id: string;
  amount: number;
  order_number: string;
  acquirer: string;
  transaction_time_millis: number;
  card_info: {
    bincode: string;
    lastfour: string;
    issuer: string;
    type: number;
  };
}

function getTapPayErrorMessage(status: number): string {
  const errorMessages: Record<number, string> = {
    [-1]: '信用卡資訊錯誤',
    [-2]: '信用卡餘額不足',
    [-3]: '此卡片已過期',
    [-4]: '交易被拒絕',
    [-5]: '交易失敗',
  };
  return errorMessages[status] || '付款失敗，請稍後再試';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.authorization || '';
    const user = await verifyToken(authHeader);

    if (!user) {
      return res.status(401).json({ error: '登入已過期，請重新登入' });
    }

    // Parse and validate request body
    const { prime, amount } = req.body;

    if (!prime || typeof prime !== 'string') {
      return res.status(400).json({ error: '付款資訊無效' });
    }

    if (!amount || !ALLOWED_AMOUNTS.includes(amount)) {
      await logEvent('error', {
        context: 'payment_invalid_amount',
        amount,
        allowed: ALLOWED_AMOUNTS,
      }, user.id);
      return res.status(400).json({ error: '無效的儲值金額' });
    }

    // Get TapPay credentials from environment
    const partnerKey = process.env.TAPPAY_PARTNER_KEY;
    const merchantId = process.env.TAPPAY_MERCHANT_ID;

    if (!partnerKey || !merchantId) {
      console.error('TapPay credentials not configured');
      await logEvent('error', {
        context: 'tappay_config_missing',
      }, user.id);
      return res.status(500).json({ error: '付款系統配置錯誤' });
    }

    // Determine API URL based on environment
    const isProduction = process.env.VITE_TAPPAY_ENV === 'production';
    const apiUrl = isProduction
      ? 'https://prod.tappaysdk.com/tpc/payment/pay-by-prime'
      : 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

    // Call TapPay Pay by Prime API
    const tapPayRequest = {
      prime,
      partner_key: partnerKey,
      merchant_id: merchantId,
      details: `儲值 NT$${amount}`,
      amount,
      currency: 'TWD',
      cardholder: {
        phone_number: '',
        name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
      },
    };

    console.log('[TapPay] Calling Pay by Prime API...');
    console.log('[TapPay] Merchant ID:', merchantId);
    console.log('[TapPay] API URL:', apiUrl);

    const tapPayResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': partnerKey,
      },
      body: JSON.stringify(tapPayRequest),
    });

    const tapPayResult: TapPayResponse = await tapPayResponse.json();

    console.log('[TapPay] Full response:', JSON.stringify(tapPayResult));
    console.log('[TapPay] Response status:', tapPayResult.status);

    // Check TapPay response
    if (tapPayResult.status !== 0) {
      await logEvent('error', {
        context: 'tappay_payment_failed',
        status: tapPayResult.status,
        msg: tapPayResult.msg,
      }, user.id);
      return res.status(400).json({
        error: getTapPayErrorMessage(tapPayResult.status)
      });
    }

    // Payment successful - update user balance
    const supabase = createSupabaseAdmin();

    // Get current balance
    const { data: profile, error: fetchError } = await supabase
      .from('users_profile')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      await logEvent('error', {
        context: 'payment_fetch_profile_failed',
        error: String(fetchError),
        rec_trade_id: tapPayResult.rec_trade_id,
      }, user.id);
      // Payment was successful but we failed to update - need manual intervention
      return res.status(500).json({
        error: '餘額更新失敗，請聯繫客服',
        rec_trade_id: tapPayResult.rec_trade_id,
      });
    }

    const currentBalance = parseFloat(profile?.balance || '0');
    const newBalance = currentBalance + amount;

    // Update balance
    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ balance: newBalance })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      await logEvent('error', {
        context: 'payment_update_balance_failed',
        error: String(updateError),
        rec_trade_id: tapPayResult.rec_trade_id,
      }, user.id);
      return res.status(500).json({
        error: '餘額更新失敗，請聯繫客服',
        rec_trade_id: tapPayResult.rec_trade_id,
      });
    }

    // Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'topup',
      amount,
      description: `儲值 NT$${amount}`,
      stripe_payment_id: tapPayResult.rec_trade_id, // Using this field for TapPay trade ID
      balance_after: newBalance,
    });

    if (txError) {
      console.error('Error recording transaction:', txError);
      // Non-critical error - balance was updated successfully
      await logEvent('error', {
        context: 'payment_record_transaction_failed',
        error: String(txError),
      }, user.id);
    }

    // Log successful topup
    await logEvent('topup', {
      amount,
      new_balance: newBalance,
      rec_trade_id: tapPayResult.rec_trade_id,
    }, user.id);

    console.log(`[TapPay] Topup successful: user=${user.id}, amount=${amount}, new_balance=${newBalance}`);

    return res.status(200).json({
      success: true,
      amount,
      new_balance: newBalance,
    });

  } catch (error) {
    console.error('Payment error:', error);
    await logEvent('error', {
      context: 'payment_unexpected_error',
      error: String(error),
    });
    return res.status(500).json({ error: '系統錯誤，請稍後再試' });
  }
}
