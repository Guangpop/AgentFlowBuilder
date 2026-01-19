import { UIConfig } from './types';

// Production mode: full UI with auth and payment
export const productionUIConfig: UIConfig = {
  showAccountButton: true,
  showLoginPage: true,
  showPricing: true,
  showTopupOptions: true,
  modeName: 'production',
};
