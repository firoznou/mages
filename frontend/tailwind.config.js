/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mage: {
          dark: '#080314',
          card: '#120824',
          border: '#2A1747',
          purple: '#7928CA',
          violet: '#9333EA',
          glow: '#A855F7',
          gold: '#F59E0B',
          amber: '#FBBF24',
          lightGold: '#FEF08A'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'arcane-glow': 'radial-gradient(circle at 50% 30%, rgba(121, 40, 202, 0.25) 0%, rgba(8, 3, 20, 0) 70%)',
        'gold-shimmer': 'linear-gradient(135deg, #FFFBEB 0%, #F59E0B 50%, #B45309 100%)'
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 15px rgba(121, 40, 202, 0.6))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 25px rgba(245, 158, 11, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
