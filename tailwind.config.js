/** @type {import('tailwindcss').Config} */
export default {
  // Use media-based dark mode support if you later add dark: variants.
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
      // Allow min-h-12 (3rem ~ 48px) for larger tap targets
      minHeight: {
        12: '3rem',  // enables class: min-h-12
        tap: '44px', // optional alias: min-h-tap (Apple HIG minimum)
      },
      // Brand aliases — marketing site uses violet as primary accent
      colors: {
        brand: {
          DEFAULT: '#7c3aed', // violet-600
          soft: '#a78bfa',    // violet-300/400
          strong: '#4c1d95',  // deep violet
        },
      },
      fontSize: {
        'display-1': ['3.5rem', { lineHeight: '1.1' }],
        h2: ['2.25rem', { lineHeight: '1.2' }],
        h3: ['1.5rem', { lineHeight: '1.3' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
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
        brand: '0 10px 25px -10px rgba(124, 58, 237, 0.45)', // violet tint
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [
    // Add plugins here if you decide to use them (e.g., require('@tailwindcss/forms'))
  ],
};
