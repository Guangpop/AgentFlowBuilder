// UI Configuration Service Interface
export interface UIConfig {
  // Account & Auth UI
  showAccountButton: boolean;
  showLoginPage: boolean;

  // Pricing & Payment UI
  showPricing: boolean;
  showTopupOptions: boolean;

  // Auth requirement
  requireAuth: boolean;

  // Mode indicator
  modeName: 'local' | 'production';
}
