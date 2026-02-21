export type PaymentStrategy = 'A' | 'B';

/**
 * Active payment strategy, controlled by VITE_PAYMENT_STRATEGY env var.
 * Strategy A: postMessage + Gumroad license verify API
 * Strategy B: postMessage trigger + webhook + polling
 * Defaults to 'A' if not set.
 */
export const PAYMENT_STRATEGY: PaymentStrategy =
  (import.meta.env.VITE_PAYMENT_STRATEGY as PaymentStrategy) ?? 'A';
