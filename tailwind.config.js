/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Avant-Garde Brutalist Dark Mode
        'obsidian': '#020202',
        'void': '#050505',
        'midnight': '#0a0a0a',
        'slate-950': '#0a0a0a',
        'slate-900': '#111111',
        'slate-800': '#1a1a1a',
        'slate-700': '#222222',
        'slate-600': '#333333',
        'slate-500': '#444444',
        'slate-400': '#666666',
        'slate-300': '#888888',
        'slate-200': '#aaaaaa',
        'slate-100': '#cccccc',
        'slate-50': '#eeeeee',

        // Accent colors
        'emerald-500': '#10b981',
        'emerald-600': '#059669',
        'amber-500': '#f59e0b',
        'amber-600': '#d97706',
        'purple-500': '#a855f7',
        'purple-600': '#9333ea',
        'cyan-500': '#06b6d4',
        'cyan-600': '#0891b2',
        'blue-500': '#3b82f6',
        'blue-600': '#2563eb',
        'red-500': '#ef4444',
        'red-600': '#dc2626',
      },
      fontFamily: {
        // JetBrains Mono for logs and code
        'mono': ['"JetBrains Mono"', '"Fira Code"', '"Consolas"', 'monospace'],
        // Roboto or similar for titles
        'sans': ['"Inter"', '"Roboto"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
        'xxxs': '0.5rem',
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
