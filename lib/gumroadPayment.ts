export interface PaymentParams {
  type: 'workflow' | 'sop';
  nodeCount?: number; // Required when type === 'sop'
}

export interface PaymentResult {
  payment_token: string;
}

/**
 * Common interface both strategies implement.
 * Calling pay() opens the Gumroad overlay and resolves when
 * the user has completed payment and a payment_token has been issued.
 * Rejects if payment fails, is cancelled, or times out.
 */
export interface GumroadPaymentService {
  pay(params: PaymentParams): Promise<PaymentResult>;
}

/** Compute the price in cents for a given payment action. */
export function computeCents(params: PaymentParams): number {
  if (params.type === 'workflow') return 99; // $0.99
  if (params.type === 'sop') {
    const count = params.nodeCount ?? 1;
    return Math.round(count * 49); // $0.49 per node
  }
  throw new Error(`Unknown payment type: ${params.type}`);
}

/** Build the Gumroad checkout URL for a given product. */
export function buildGumroadUrl(
  productId: string,
  cents: number,
  sessionId: string
): string {
  const base = `https://${import.meta.env.VITE_GUMROAD_SELLER_HANDLE ?? 'app'}.gumroad.com/l/${productId}`;
  const params = new URLSearchParams({
    wanted: 'true',
    price: String(cents),
    'Session ID': sessionId,
  });
  return `${base}?${params.toString()}`;
}

/** Get the Gumroad product ID for a given payment type. */
export function getProductId(type: 'workflow' | 'sop'): string {
  const ids: Record<string, string> = {
    workflow: import.meta.env.VITE_GUMROAD_WORKFLOW_PRODUCT_ID ?? '',
    sop: import.meta.env.VITE_GUMROAD_SOP_PRODUCT_ID ?? '',
  };
  const id = ids[type];
  if (!id) throw new Error(`VITE_GUMROAD_${type.toUpperCase()}_PRODUCT_ID is not set`);
  return id;
}
