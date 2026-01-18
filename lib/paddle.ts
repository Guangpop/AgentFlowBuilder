// Paddle initialization
declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (data: PaddleEventData) => void;
      }) => void;
      Checkout: {
        open: (options: PaddleCheckoutOptions) => void;
      };
    };
  }
}

interface PaddleEventData {
  name: string;
  data?: {
    id?: string;
    status?: string;
    [key: string]: unknown;
  };
}

interface PaddleCheckoutOptions {
  settings?: {
    displayMode?: 'overlay' | 'inline';
    theme?: 'light' | 'dark';
    locale?: string;
    variant?: 'one-page' | 'multi-page';
    successUrl?: string;
  };
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customData?: Record<string, string | number>;
  customer?: {
    email?: string;
  };
}

export function initializePaddle(): void {
  const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';

  if (!clientToken) {
    console.warn('Paddle client token not configured');
    return;
  }

  // Wait for Paddle.js to load
  const checkPaddle = setInterval(() => {
    if (window.Paddle) {
      clearInterval(checkPaddle);

      // Set environment (sandbox or production)
      if (environment === 'sandbox') {
        window.Paddle.Environment.set('sandbox');
      }

      // Initialize Paddle
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (data) => {
          console.log('Paddle event:', data.name, data);

          // Handle checkout completion
          if (data.name === 'checkout.completed') {
            console.log('Checkout completed:', data.data);
            // The webhook will handle the actual balance update
            // We can show a success message or refresh the page
          }

          // Handle checkout closed
          if (data.name === 'checkout.closed') {
            console.log('Checkout closed');
          }
        },
      });

      console.log('Paddle initialized successfully');
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => {
    clearInterval(checkPaddle);
  }, 10000);
}

export type { PaddleCheckoutOptions, PaddleEventData };
