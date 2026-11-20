import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1d4ed8',
          dark: '#1e3a8a',
          light: '#eff6ff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#0284c7',
          light: '#e0f2fe',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#0ea5e9',
          foreground: '#ffffff',
        },
        background: '#f0f6ff',
        card: '#ffffff',
        ink: '#0f172a',
        muted: {
          DEFAULT: '#64748b',
          light: '#f1f5f9',
        },
        border: '#e2e8f0',
        ring: '#1d4ed8',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -8px rgba(29, 78, 216, 0.18)',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
