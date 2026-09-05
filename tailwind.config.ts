import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        card: '#111827',
        accent: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b'
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
