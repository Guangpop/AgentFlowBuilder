/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/web-app/**/*.{tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Dynamic theme classes used in themes.ts
    { pattern: /bg-(blue|purple|orange|cyan|indigo|emerald|slate|pink|amber)-(800|900)\/(40|80)/ },
    { pattern: /border-(blue|purple|orange|cyan|indigo|emerald|slate|pink|amber)-500/ },
    { pattern: /text-(blue|purple|orange|cyan|indigo|emerald|slate|pink|amber)-(300|400)/ },
  ],
};
