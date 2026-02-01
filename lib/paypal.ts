// PayPal frontend configuration

export const PAYPAL_CONFIG = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
  currency: 'USD',
  intent: 'capture' as const,
};

// Pricing (USD)
export const WORKFLOW_COST = 0.99;
export const SOP_COST_PER_NODE = 0.49;
export const TOPUP_OPTIONS = [5, 10, 20, 50] as const;

export function isPayPalConfigured(): boolean {
  return Boolean(PAYPAL_CONFIG.clientId);
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
