import { isLocalMode } from '../../lib/mode';
import { localUIConfig } from './local';
import { productionUIConfig } from './production';

export type { UIConfig } from './types';

// Select UI config based on mode
export const uiConfig = isLocalMode ? localUIConfig : productionUIConfig;
