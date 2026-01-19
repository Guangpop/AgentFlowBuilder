import { UIConfig } from './types';

// Local mode: minimal UI, no auth/payment features
export const localUIConfig: UIConfig = {
  showAccountButton: false,
  showLoginPage: false,
  showPricing: false,
  showTopupOptions: false,
  modeName: 'local',
};
