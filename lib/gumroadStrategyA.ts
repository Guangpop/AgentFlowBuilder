import type { GumroadPaymentService, PaymentParams, PaymentResult } from './gumroadPayment';
import { computeCents, buildGumroadUrl, getProductId } from './gumroadPayment';

export class StrategyAService implements GumroadPaymentService {
  async pay(params: PaymentParams): Promise<PaymentResult> {
    const cents = computeCents(params);
    const productId = getProductId(params.type);
    // Use a local UUID as the session field (not strictly needed for A,
    // but included for symmetry and future debugging)
    const sessionId = crypto.randomUUID();
    const url = buildGumroadUrl(productId, cents, sessionId);

    return new Promise((resolve, reject) => {
      // Open the Gumroad overlay
      const overlayWindow = window.open(url, '_blank', 'width=500,height=650');

      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearInterval(closedCheck);
        fn();
      };

      // Listen for Gumroad postMessage
      const onMessage = async (event: MessageEvent) => {
        // Gumroad sends from gumroad.com
        if (!event.origin.includes('gumroad.com')) return;

        let data: Record<string, unknown>;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          return;
        }

        if (data.post_message_name !== 'sale') return;

        // Log the full payload for validation during initial rollout
        console.info('[StrategyA] postMessage payload:', JSON.stringify(data));

        const licenseKey = data.license_key as string | undefined;

        if (!licenseKey) {
          // Strategy A cannot proceed without license_key in postMessage
          // This is the key unknown — if this fires, switch to Strategy B
          console.error('[StrategyA] license_key missing from postMessage. Switch to Strategy B.');
          settle(() => reject(new Error('STRATEGY_A_NO_LICENSE_KEY')));
          return;
        }

        // Call backend to verify and issue payment_token
        try {
          const response = await fetch('/api/gumroad/verify-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              license_key: licenseKey,
              product_type: params.type,
              expected_cents: cents,
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Unknown error' }));
            settle(() => reject(new Error(err.error ?? 'Verification failed')));
            return;
          }

          const { payment_token } = await response.json();
          settle(() => resolve({ payment_token }));
        } catch (err) {
          settle(() => reject(err instanceof Error ? err : new Error('Network error')));
        }
      };

      window.addEventListener('message', onMessage);

      // Detect if user closes the popup without paying
      const closedCheck = setInterval(() => {
        if (overlayWindow?.closed) {
          settle(() => reject(new Error('PAYMENT_CANCELLED')));
        }
      }, 1000);
    });
  }
}
