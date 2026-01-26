// Unified mode detection
// Local mode: VITE_LOCAL_API_KEY is set (use local Claude API key, skip online services)
// Production mode: VITE_LOCAL_API_KEY is NOT set (use backend API, require auth)
// Anonymous mode: Production mode + VITE_ANONYMOUS_MODE is set (no auth, direct payment)

export const isLocalMode = !!import.meta.env.VITE_LOCAL_API_KEY;
export const isProductionMode = !isLocalMode;
export const isAnonymousMode = isProductionMode && import.meta.env.VITE_ANONYMOUS_MODE === 'true';
