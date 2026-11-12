/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bletchley: {
          ink: '#070b14',
          slate: '#0f172a',
          panel: '#151f32',
          card: '#1b263b',
          border: '#2b3a55',
          brass: '#d4a853',
          'brass-bright': '#f0c869',
          'brass-dim': '#8c6d32',
          ivory: '#f1ede4',
          parchment: '#e2dac8',
          lamp: '#fbbf24',
          signal: '#38bdf8',
          emerald: '#10b981',
          crimson: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        lamp: '0 0 18px 4px rgba(251, 191, 36, 0.55), inset 0 0 8px rgba(255, 243, 196, 0.8)',
        brass: '0 0 15px rgba(212, 168, 83, 0.25)',
        panel: '0 10px 30px -10px rgba(0, 0, 0, 0.65)',
      },
      keyframes: {
        'signal-dash': {
          '0%': { strokeDashoffset: '48' },
          '100%': { strokeDashoffset: '0' },
        },
        'rotor-tick': {
          '0%': { transform: 'translateY(-6px)', opacity: '0.45' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 168, 83, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(212, 168, 83, 0)' },
        },
      },
      animation: {
        'signal-dash': 'signal-dash 1.2s linear infinite',
        'rotor-tick': 'rotor-tick 0.18s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

