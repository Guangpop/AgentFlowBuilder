import type { GumroadPaymentService, PaymentParams, PaymentResult } from './gumroadPayment';
import { computeCents, buildGumroadUrl, getProductId } from './gumroadPayment';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 30; // 30 seconds max

export class StrategyBService implements GumroadPaymentService {
  async pay(params: PaymentParams): Promise<PaymentResult> {
    const cents = computeCents(params);
    const productId = getProductId(params.type);

    // 1. Create a backend session
    const sessionResponse = await fetch('/api/gumroad/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: params.type, expected_cents: cents }),
    });

    if (!sessionResponse.ok) {
      throw new Error('Failed to create payment session');
    }

    const { session_id } = await sessionResponse.json();
    const url = buildGumroadUrl(productId, cents, session_id);

    return new Promise((resolve, reject) => {
      const overlayWindow = window.open(url, '_blank', 'width=500,height=650');

      let settled = false;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let attempts = 0;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('message', onMessage);
        clearInterval(closedCheck);
        if (pollTimer) clearInterval(pollTimer);
        fn();
      };

      // Start polling the backend for session status
      const startPolling = () => {
        if (pollTimer) return; // don't double-start
        pollTimer = setInterval(async () => {
          attempts++;

          if (attempts > POLL_MAX_ATTEMPTS) {
            settle(() => reject(new Error('PAYMENT_CONFIRMATION_TIMEOUT')));
            return;
          }

          try {
            const res = await fetch(`/api/gumroad/check-session?id=${session_id}`);
            if (!res.ok) return;

            const data = await res.json();

            if (data.status === 'paid' && data.payment_token) {
              settle(() => resolve({ payment_token: data.payment_token }));
            } else if (data.status === 'expired') {
              settle(() => reject(new Error('PAYMENT_SESSION_EXPIRED')));
            }
            // 'pending' — keep polling
          } catch {
            // network hiccup — keep polling
          }
        }, POLL_INTERVAL_MS);
      };

      // postMessage fires when user completes purchase in overlay
      // Use it to start polling immediately (faster than waiting for next tick)
      const onMessage = (event: MessageEvent) => {
        if (!event.origin.includes('gumroad.com')) return;

        let data: Record<string, unknown>;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch {
          return;
        }

        if (data.post_message_name !== 'sale') return;
        startPolling(); // webhook should arrive very soon
      };

      window.addEventListener('message', onMessage);

      // Also start polling immediately as fallback
      // (in case postMessage doesn't fire or fires late)
      startPolling();

      // Detect popup closed without paying
      const closedCheck = setInterval(() => {
        if (overlayWindow?.closed && !settled) {
          // Give polling a 3-second grace period after popup closes
          // (user might have closed popup after paying)
          setTimeout(() => {
            if (!settled) {
              settle(() => reject(new Error('PAYMENT_CANCELLED')));
            }
          }, 3000);
          clearInterval(closedCheck);
        }
      }, 1000);
    });
  }
}
