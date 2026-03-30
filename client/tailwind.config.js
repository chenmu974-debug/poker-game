/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#1a3a2a',
        'felt-light': '#1f4a35',
        gold: '#c9a84c',
        'gold-light': '#e8c86a',
        casino: '#0d0d0d',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'flip-card': 'flipCard 0.6s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'chip-collect': 'chipCollect 0.5s ease-in',
        'winner-pop': 'winnerPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'float-up': 'floatUp 1s ease-out forwards',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        flipCard: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        winnerPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-60px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
