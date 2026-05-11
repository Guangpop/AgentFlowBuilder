/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/web-app/**/*.{tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Tailwind JIT scans all files in `content` for static class strings.
  // themes.ts and the per-component palette tables (e.g. ViewerPage CHIP_PALETTE_*) are
  // all literal strings so JIT picks them up directly — no safelist needed for those.
  //
  // The only thing JIT misses is dynamically-composed hover variants like
  // `hover:${theme.textPrimary}` because the prefix + value are concatenated at runtime.
  // List every theme-token text-color value paired with the `hover:` / `group-hover:`
  // variants that actually appear in template literals (verified via grep).
  safelist: [
    // theme.textPrimary values (used as `hover:${theme.textPrimary}`)
    'hover:text-stone-800', 'hover:text-white', 'hover:text-slate-900',
    // theme.textSecondary values (used as `hover:${theme.textSecondary}`)
    'hover:text-stone-600', 'hover:text-slate-300', 'hover:text-white/70', 'hover:text-slate-600',
    // theme.accentColor values (used as `group-hover:${theme.accentColor}` in ViewerPage)
    'group-hover:text-teal-600', 'group-hover:text-blue-500',
    'group-hover:text-violet-400', 'group-hover:text-slate-700',
  ],
};
