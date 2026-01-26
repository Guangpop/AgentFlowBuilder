import { UIConfig } from './types';
import { isAnonymousMode } from '../../lib/mode';

// Production mode: full UI with auth and payment
// Anonymous mode: payment only, no auth
export const productionUIConfig: UIConfig = {
  showAccountButton: !isAnonymousMode,
  showLoginPage: !isAnonymousMode,
  showPricing: true,
  showTopupOptions: !isAnonymousMode,
  requireAuth: !isAnonymousMode,
  modeName: 'production',
};
