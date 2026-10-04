/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          darkest: '#090B0D',
          dark: '#0E1114',
          base: '#14181C',
        },
        surface: {
          dark: '#181D21',
          base: '#1D2328',
          light: '#242A30',
          border: '#2A323A',
        },
        text: {
          primary: '#F4F5F2',
          secondary: '#B8BEC4',
          muted: '#737B82',
        },
        accent: {
          amber: '#F59E0B',
          amberHover: '#D97706',
          cyan: '#06B6D4',
        },
        traffic: {
          smooth: '#10B981',
          moderate: '#F59E0B',
          congested: '#EF4444',
          inactive: '#4B5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(245, 158, 11, 0.2)',
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.2)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.25)',
      }
    },
  },
  plugins: [],
}
