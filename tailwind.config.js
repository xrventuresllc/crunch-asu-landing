/** @type {import('tailwindcss').Config} */
export default {
  // We use a dark UI by design; no dark: variants needed, but keep media for future use
  darkMode: 'media',
  content: [
    './index.html',
    './privacy.html',                 // include your privacy page if it lives at project root
    './public/**/*.html',             // (optional) include other static htmls
    './src/**/*.{js,ts,jsx,tsx,mdx}', // scan all source files
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      // Optional brand aliases if you want to reference them later (not required by current code)
      colors: {
        brand: {
          DEFAULT: '#6366f1', // indigo-500
          strong: '#4f46e5',  // indigo-600
          warm: '#f97316',    // orange-500
          mint: '#34d399',    // emerald-ish / mint
        },
      },
      // Small animation used by milestone toasts (mirrors App.css if you prefer class-based usage)
      keyframes: {
        'toast-pop': {
          '0%':   { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-pop': 'toast-pop 0.24s ease-out both',
      },
      boxShadow: {
        'brand': '0 10px 25px -10px rgba(99, 102, 241, 0.45)',
      },
      // You can also add custom radii, if desired:
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [
    // Add plugins here if you decide to use them (e.g., require('@tailwindcss/forms'))
  ],
};
