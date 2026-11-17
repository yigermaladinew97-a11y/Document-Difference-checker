/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF5E1E',
          'orange-hover': '#E04A0E',
          'orange-light': '#FFF4EF',
          'orange-border': '#FFD6C4',
          indigo: '#4F46E5',
          dark: '#0F172A',
          charcoal: '#1E293B',
          surface: '#F8FAFC',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      boxShadow: {
        'clean': '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 8px 24px -4px rgba(15, 23, 42, 0.08)',
        'clean-hover': '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        'orange-soft': '0 10px 25px -5px rgba(255, 94, 30, 0.3)',
        'orange-glow': '0 0 40px -10px rgba(255, 94, 30, 0.4)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 10px 30px -5px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      }
    },
  },
  plugins: [],
}
