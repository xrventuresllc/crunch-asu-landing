/** @type {import('tailwindcss').Config} */
export default {
  // Marketing is “Ink & Paper” (black/white + soft neutrals).
  // Keep media darkMode for future app UI; landing page styling is explicit.
  darkMode: 'media',
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
        12: '3rem',
        tap: '44px', // Apple HIG minimum
      },

      // Brand tokens (updated to black/white first)
      colors: {
        ink: '#111111',
        paper: '#FFFFFF',
        soft: '#F5F5F7',
        border: '#E5E7EB',
      },

      // Type roles (keep these disciplined across sections)
      fontSize: {
        'display-1': ['3.5rem', { lineHeight: '1.1' }],
        h2: ['2.25rem', { lineHeight: '1.2' }],
        h3: ['1.5rem', { lineHeight: '1.3' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
      },

      // Small animation used by milestone toasts (mirrors App.css if you prefer class-based usage)
      keyframes: {
        'toast-pop': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-pop': 'toast-pop 0.24s ease-out both',
      },

      boxShadow: {
        // A very “Apple-ish” soft lift for cards on white.
        apple: '0 0 0 1px rgba(0,0,0,0.04), 0 24px 60px rgba(0,0,0,0.18)',
        // Heavier shadow for dark device shells.
        device: '0 0 0 1px rgba(0,0,0,0.06), 0 28px 80px rgba(0,0,0,0.35)',
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
