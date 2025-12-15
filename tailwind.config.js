/** @type {import('tailwindcss').Config} */
export default {
  // Keep this flexible for the future; marketing is currently designed in light mode.
  darkMode: 'class',
  content: [
    './index.html',
    './privacy.html',
    './public/**/*.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
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
        12: '3rem', // enables class: min-h-12
        tap: '44px', // optional alias: min-h-tap (Apple HIG minimum)
      },

      // Monochrome “Apple-ish” marketing palette (use Tailwind neutrals + these aliases as needed)
      colors: {
        ink: '#0a0a0a',
        paper: '#ffffff',
        soft: '#f5f5f7',
      },

      fontSize: {
        'display-1': ['3.5rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        h2: ['2.25rem', { lineHeight: '1.18', letterSpacing: '-0.02em' }],
        h3: ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        body: ['0.9375rem', { lineHeight: '1.65' }],
      },

      // Small micro-animation for inline success/error toasts
      keyframes: {
        'toast-pop': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-pop': 'toast-pop 0.22s ease-out both',
      },

      boxShadow: {
        // Subtle “device” shadow used by UI mocks
        device: '0 20px 60px rgba(0,0,0,0.18)',
      },

      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
