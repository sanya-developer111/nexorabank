import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nexora: {
          cyan: '#34d399',
          purple: '#6366f1',
          pink: '#f472b6',
          accent: '#10b981',
          dark: '#0f1419',
          darker: '#0a0e12',
          glass: 'rgba(255, 255, 255, 0.04)',
          'glass-border': 'rgba(255, 255, 255, 0.08)',
        },
        admin: {
          red: '#f87171',
          dark: '#1c1010',
          crimson: '#ef4444',
        },
      },
      backgroundImage: {
        'nexora-gradient': 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
        'nexora-radial': 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.12) 0%, transparent 55%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        neon: '0 0 24px rgba(16, 185, 129, 0.15), 0 4px 24px rgba(0, 0, 0, 0.4)',
        'neon-sm': '0 0 12px rgba(16, 185, 129, 0.2)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
