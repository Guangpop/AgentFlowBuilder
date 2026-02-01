// PayPal REST API v2 utilities

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
};

// Pricing constants (USD)
export const WORKFLOW_COST = 0.99;
export const SOP_COST_PER_NODE = 0.49;
export const TOPUP_AMOUNTS = [5, 10, 20, 50] as const;

function getBaseUrl(): string {
  const env = process.env.PAYPAL_ENV === 'production' ? 'production' : 'sandbox';
  return PAYPAL_API_BASE[env];
}

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export interface CreateOrderParams {
  amount: string;
  description: string;
  customId?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<string> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: params.amount,
        },
        description: params.description,
        custom_id: params.customId,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal create order failed: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export interface CaptureResult {
  transactionId: string;
  status: string;
  amount: string;
}

export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.details?.[0]?.issue || error.message || 'Capture failed';
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const capture = data.purchase_units[0].payments.captures[0];

  return {
    transactionId: capture.id,
    status: capture.status,
    amount: capture.amount.value,
  };
}

export function getPayPalErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'INSTRUMENT_DECLINED': 'Payment declined. Please try another payment method.',
    'PAYER_ACTION_REQUIRED': 'Please complete PayPal verification.',
    'ORDER_NOT_APPROVED': 'Payment was not approved.',
    'PERMISSION_DENIED': 'Payment permission denied.',
  };
  return errorMessages[error] || 'Payment failed. Please try again.';
}
