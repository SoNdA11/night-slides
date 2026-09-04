/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        neon: {
          pink: '#FF006E',
          blue: '#3A86FF',
          green: '#06D6A0',
          yellow: '#FFD60A',
          orange: '#FB5607',
          purple: '#8338EC',
        },
        dark: {
          900: '#0A0A1A',
          800: '#12122A',
          700: '#1A1A3E',
          600: '#252550',
        },
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.5s ease-in-out',
        'confetti': 'confetti 3s ease-out forwards',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(58, 134, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(58, 134, 255, 0.8), 0 0 40px rgba(58, 134, 255, 0.4)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotateZ(0deg)', opacity: 1 },
          '100%': { transform: 'translateY(-200px) rotateZ(720deg)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
