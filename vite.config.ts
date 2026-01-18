import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Security check: VITE_LOCAL_API_KEY and ANTHROPIC_API_KEY are mutually exclusive
    const hasLocalKey = !!env.VITE_LOCAL_API_KEY;
    const hasProdKey = !!env.ANTHROPIC_API_KEY;

    if (hasLocalKey && hasProdKey) {
      throw new Error(
        '\n❌ Configuration Error: VITE_LOCAL_API_KEY and ANTHROPIC_API_KEY cannot coexist!\n\n' +
        '   - Local development: Set only VITE_LOCAL_API_KEY\n' +
        '   - Production: Set only ANTHROPIC_API_KEY (in Vercel, NOT in .env)\n\n' +
        '   This prevents accidentally exposing API keys in production builds.\n'
      );
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
