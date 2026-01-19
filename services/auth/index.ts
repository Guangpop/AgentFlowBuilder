import { isLocalMode } from '../../lib/mode';
import { localAuthService } from './local';
import { productionAuthService } from './production';

export type { AuthService } from './types';

// Select auth service based on mode
export const authService = isLocalMode ? localAuthService : productionAuthService;
