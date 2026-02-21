// api/_utils/paymentToken.ts
import { createSupabaseAdmin } from './supabase.js';

export interface TokenPayload {
  payment_token: string;
  product_type: 'workflow' | 'sop';
  node_count?: number;
}

/**
 * Issues a new one-time payment_token (UUID) and inserts it into
 * used_payment_tokens with used_at = NULL (not yet consumed).
 */
export async function issuePaymentToken(
  productType: 'workflow' | 'sop',
  nodeCount?: number
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const token = crypto.randomUUID();

  const { error } = await supabase
    .from('used_payment_tokens')
    .insert({
      payment_token: token,
      product_type: productType,
      node_count: nodeCount ?? null,
      used_at: null,
    });

  if (error) {
    throw new Error(`Failed to issue payment token: ${error.message}`);
  }

  return token;
}

/**
 * Validates and consumes a payment_token.
 * Checks: exists, not consumed (used_at IS NULL), product_type matches.
 * Sets used_at = NOW() atomically.
 * Throws on any failure.
 */
export async function consumePaymentToken(
  token: string,
  expectedProductType: 'workflow' | 'sop'
): Promise<TokenPayload> {
  if (!token) throw new Error('Missing payment_token');

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('used_payment_tokens')
    .select('payment_token, product_type, node_count, used_at')
    .eq('payment_token', token)
    .single();

  if (error || !data) {
    throw new Error('Invalid payment token');
  }

  if (data.used_at !== null) {
    throw new Error('Payment token already used');
  }

  if (data.product_type !== expectedProductType) {
    throw new Error('Payment token type mismatch');
  }

  const { error: updateError } = await supabase
    .from('used_payment_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('payment_token', token)
    .is('used_at', null);

  if (updateError) {
    throw new Error('Failed to consume payment token');
  }

  return {
    payment_token: token,
    product_type: data.product_type as 'workflow' | 'sop',
    node_count: data.node_count ?? undefined,
  };
}
