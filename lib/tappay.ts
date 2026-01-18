// TapPay SDK initialization and utilities

declare global {
  interface Window {
    TPDirect: {
      setupSDK: (appId: number, appKey: string, env: 'sandbox' | 'production') => void;
      card: {
        setup: (config: TapPayCardSetupConfig) => void;
        onUpdate: (callback: (update: TapPayCardUpdate) => void) => void;
        getPrime: (callback: (result: TapPayPrimeResult) => void) => void;
      };
    };
  }
}

interface TapPayCardSetupConfig {
  fields: {
    number: { element: string; placeholder: string };
    expirationDate: { element: string; placeholder: string };
    ccv: { element: string; placeholder: string };
  };
  styles: {
    input: Record<string, string>;
    'input.ccv': Record<string, string>;
    'input:focus': Record<string, string>;
    'input.error': Record<string, string>;
  };
  isMaskCreditCardNumber?: boolean;
  maskCreditCardNumberRange?: { beginIndex: number; endIndex: number };
}

interface TapPayCardUpdate {
  canGetPrime: boolean;
  hasError: boolean;
  status: {
    number: number;
    expiry: number;
    ccv: number;
  };
}

interface TapPayPrimeResult {
  status: number;
  msg: string;
  card: {
    prime: string;
    bincode: string;
    lastfour: string;
    issuer: string;
    type: number;
    funding: number;
    cardidentifier: string;
  };
}

export function initializeTapPay(): void {
  const appId = import.meta.env.VITE_TAPPAY_APP_ID;
  const appKey = import.meta.env.VITE_TAPPAY_APP_KEY;
  const env = import.meta.env.VITE_TAPPAY_ENV === 'production' ? 'production' : 'sandbox';

  console.log('[TapPay Debug] Starting initialization...');
  console.log('[TapPay Debug] Environment:', env);
  console.log('[TapPay Debug] App ID:', appId ? 'SET' : 'NOT SET');

  if (!appId || !appKey) {
    console.warn('[TapPay Debug] App ID or App Key not configured');
    return;
  }

  // Wait for TapPay SDK to load
  const checkTPDirect = setInterval(() => {
    if (window.TPDirect) {
      clearInterval(checkTPDirect);
      console.log('[TapPay Debug] TPDirect loaded');

      window.TPDirect.setupSDK(Number(appId), appKey, env);
      console.log('[TapPay Debug] TapPay initialized successfully');
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => {
    clearInterval(checkTPDirect);
    if (!window.TPDirect) {
      console.error('[TapPay Debug] TapPay SDK failed to load after 10 seconds');
    }
  }, 10000);
}

export function setupCardForm(): void {
  if (!window.TPDirect) {
    console.error('[TapPay Debug] TPDirect not available');
    return;
  }

  window.TPDirect.card.setup({
    fields: {
      number: {
        element: '#card-number',
        placeholder: '**** **** **** ****',
      },
      expirationDate: {
        element: '#card-expiration-date',
        placeholder: 'MM / YY',
      },
      ccv: {
        element: '#card-ccv',
        placeholder: 'CCV',
      },
    },
    styles: {
      input: {
        'color': '#f1f5f9',
        'font-size': '14px',
        'font-family': 'Inter, sans-serif',
      },
      'input.ccv': {
        'font-size': '14px',
      },
      'input:focus': {
        'color': '#f1f5f9',
      },
      'input.error': {
        'color': '#ef4444',
      },
    },
    isMaskCreditCardNumber: true,
    maskCreditCardNumberRange: {
      beginIndex: 6,
      endIndex: 11,
    },
  });
}

export function onCardUpdate(callback: (update: TapPayCardUpdate) => void): void {
  if (!window.TPDirect) {
    console.error('[TapPay Debug] TPDirect not available');
    return;
  }
  window.TPDirect.card.onUpdate(callback);
}

export function getPrime(): Promise<TapPayPrimeResult> {
  return new Promise((resolve) => {
    if (!window.TPDirect) {
      resolve({
        status: -1,
        msg: 'TPDirect not available',
        card: {
          prime: '',
          bincode: '',
          lastfour: '',
          issuer: '',
          type: 0,
          funding: 0,
          cardidentifier: '',
        },
      });
      return;
    }
    window.TPDirect.card.getPrime((result) => {
      resolve(result);
    });
  });
}

export type { TapPayCardUpdate, TapPayPrimeResult };
