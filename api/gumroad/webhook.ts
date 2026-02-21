import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { issuePaymentToken } from '../_utils/paymentToken.js';
import { logEvent } from '../_utils/logger.js';

export const config = {
  api: { bodyParser: false },
};

const isTestMode = process.env.GUMROAD_TEST_MODE === 'true';

async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseFormBody(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const body = parseFormBody(rawBody);

  if (!isTestMode) {
    const secret = process.env.GUMROAD_SECRET;
    const signature = req.headers['x-gumroad-signature'] as string;

    if (!secret) {
      console.error('GUMROAD_SECRET is not set');
      return res.status(200).end();
    }

    if (!signature || !verifySignature(rawBody, signature, secret)) {
      await logEvent('webhook', { event: 'invalid_signature' });
      return res.status(200).end();
    }
  }

  if (body.resource_name !== 'sale') {
    return res.status(200).end();
  }

  const sessionId = body['Session ID'];
  const priceStr = body.price;
  const saleId = body.sale_id;
  const refunded = body.refunded === 'true';
  const disputed = body.disputed === 'true';

  if (!sessionId) {
    await logEvent('webhook', { event: 'missing_session_id', sale_id: saleId });
    return res.status(200).end();
  }

  const pricePaid = parseInt(priceStr, 10);
  const ip = req.headers['x-forwarded-for'] as string;
  const supabase = createSupabaseAdmin();

  try {
    const { data: session, error: fetchError } = await supabase
      .from('payment_sessions')
      .select('session_id, status, expected_cents, expires_at, product_type')
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !session) {
      await logEvent('webhook', { event: 'session_not_found', session_id: sessionId }, undefined, ip);
      return res.status(200).end();
    }

    if (session.status !== 'pending') {
      await logEvent('webhook', { event: 'session_already_processed', session_id: sessionId, status: session.status }, undefined, ip);
      return res.status(200).end();
    }

    if (new Date() > new Date(session.expires_at)) {
      await supabase.from('payment_sessions').update({ status: 'expired' }).eq('session_id', sessionId);
      return res.status(200).end();
    }

    if (refunded || disputed) {
      await logEvent('webhook', { event: 'sale_refunded_or_disputed', session_id: sessionId, sale_id: saleId }, undefined, ip);
      return res.status(200).end();
    }

    if (isNaN(pricePaid) || pricePaid < session.expected_cents) {
      await logEvent('webhook', { event: 'underpayment', session_id: sessionId, paid: pricePaid, expected: session.expected_cents }, undefined, ip);
      return res.status(200).end();
    }

    const paymentToken = await issuePaymentToken(session.product_type as 'workflow' | 'sop');

    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({ status: 'paid', sale_id: saleId, amount_paid: pricePaid, payment_token: paymentToken })
      .eq('session_id', sessionId)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    await logEvent('webhook', {
      event: 'session_paid',
      session_id: sessionId,
      sale_id: saleId,
      amount_paid: pricePaid,
      product_type: session.product_type,
    }, undefined, ip);

    return res.status(200).end();

  } catch (error) {
    console.error('webhook error:', error);
    await logEvent('error', { context: 'gumroad_webhook', session_id: sessionId, error: String(error) }, undefined, ip);
    return res.status(200).end();
  }
}
