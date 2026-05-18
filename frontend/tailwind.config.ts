import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 9s ease-in-out infinite',
        'float-slower': 'float 12s ease-in-out infinite',
        'fade-up':      'fadeUp 0.7s ease forwards',
        'slide-in':     'slideIn 0.5s ease forwards',
        'glow':         'glow 3s ease-in-out infinite',
        'spin-slow':    'spin 20s linear infinite',
        'gradient':     'gradientShift 8s ease infinite',
        'ping-slow':    'ping 3s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':     { transform: 'translateY(-20px) rotate(3deg)' },
          '66%':     { transform: 'translateY(-10px) rotate(-2deg)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 20px rgba(99,102,241,0.5)' },
          '50%':     { boxShadow: '0 0 60px rgba(139,92,246,0.8), 0 0 120px rgba(99,102,241,0.3)' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
