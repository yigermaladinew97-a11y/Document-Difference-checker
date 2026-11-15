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
        dark: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#111726',
          800: '#161F33',
          750: '#1D2842',
          700: '#253354',
        },
        indigo: {
          500: '#6366f1',
          600: '#4f46e5',
        },
        sky: {
          500: '#0ea5e9',
          400: '#38bdf8',
        },
        emerald: {
          500: '#10b981',
          400: '#34d399',
        },
        rose: {
          500: '#f43f5e',
          400: '#fb7185',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-indigo': '0 0 35px -5px rgba(99, 102, 241, 0.25)',
        'glow-sky': '0 0 35px -5px rgba(14, 165, 233, 0.25)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.25)',
      }
    },
  },
  plugins: [],
}
