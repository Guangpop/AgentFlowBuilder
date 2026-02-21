import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../_utils/supabase.js';
import { issuePaymentToken } from '../_utils/paymentToken.js';
import { logEvent } from '../_utils/logger.js';

const isTestMode = process.env.GUMROAD_TEST_MODE === 'true';

const PRODUCT_IDS: Record<string, string> = {
  workflow: process.env.GUMROAD_PRODUCT_WORKFLOW_ID || '',
  sop: process.env.GUMROAD_PRODUCT_SOP_ID || '',
};

interface GumroadVerifyResponse {
  success: boolean;
  uses?: number;
  purchase?: {
    price: number;        // in cents
    refunded: boolean;
    disputed: boolean;
    sale_id: string;
    test?: boolean;
  };
  message?: string;
}

async function verifyGumroadLicense(
  productId: string,
  licenseKey: string
): Promise<GumroadVerifyResponse> {
  if (isTestMode) {
    return {
      success: true,
      uses: 1,
      purchase: {
        price: 99,
        refunded: false,
        disputed: false,
        sale_id: `test-sale-${Date.now()}`,
        test: true,
      },
    };
  }

  const body = new URLSearchParams({
    product_id: productId,
    license_key: licenseKey,
    increment_uses_count: 'false',
  });

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return response.json() as Promise<GumroadVerifyResponse>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    license_key,
    product_type,
    expected_cents,
  }: {
    license_key?: string;
    product_type?: 'workflow' | 'sop';
    expected_cents?: number;
  } = req.body;

  if (!license_key || typeof license_key !== 'string') {
    return res.status(400).json({ error: 'Missing license_key' });
  }
  if (!product_type || !['workflow', 'sop'].includes(product_type)) {
    return res.status(400).json({ error: 'Invalid product_type' });
  }
  if (!expected_cents || typeof expected_cents !== 'number' || expected_cents < 1) {
    return res.status(400).json({ error: 'Invalid expected_cents' });
  }

  const productId = PRODUCT_IDS[product_type];
  if (!productId && !isTestMode) {
    console.error(`GUMROAD_PRODUCT_${product_type.toUpperCase()}_ID is not set`);
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

  const ip = req.headers['x-forwarded-for'] as string;

  try {
    const gumroadResult = await verifyGumroadLicense(productId, license_key);

    if (!gumroadResult.success) {
      await logEvent('webhook', {
        event: 'license_verify_failed',
        license_key: license_key.slice(0, 8) + '...',
        reason: gumroadResult.message,
      }, undefined, ip);
      return res.status(402).json({ error: 'License key is invalid or not found' });
    }

    const purchase = gumroadResult.purchase!;

    if (purchase.refunded || purchase.disputed) {
      return res.status(402).json({ error: 'This purchase has been refunded or disputed' });
    }

    if (purchase.price < expected_cents) {
      await logEvent('webhook', {
        event: 'license_underpaid',
        paid: purchase.price,
        expected: expected_cents,
      }, undefined, ip);
      return res.status(402).json({ error: 'Payment amount does not match' });
    }

    const supabase = createSupabaseAdmin();
    const { error: insertError } = await supabase
      .from('used_license_keys')
      .insert({
        license_key,
        product_type,
        amount_paid: purchase.price,
        sale_id: purchase.sale_id,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'This license key has already been used' });
      }
      throw insertError;
    }

    const paymentToken = await issuePaymentToken(product_type);

    await logEvent('webhook', {
      event: 'license_verify_success',
      product_type,
      sale_id: purchase.sale_id,
      amount_paid: purchase.price,
    }, undefined, ip);

    return res.status(200).json({ payment_token: paymentToken });

  } catch (error) {
    console.error('verify-license error:', error);
    await logEvent('error', {
      context: 'gumroad_verify_license',
      error: String(error),
    }, undefined, ip);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}
