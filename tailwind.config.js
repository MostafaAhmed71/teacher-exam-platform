/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4FA',
          100: '#DDE6F4',
          200: '#B8CCE9',
          300: '#8EB0DC',
          400: '#5E8ECB',
          500: '#346BB4',
          600: '#1E4D94',
          700: '#1B3E75',
          800: '#1E293B',
          900: '#0F172A',
          950: '#080D1A',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        }
      },
      fontFamily: {
        tajawal: ['Tajawal', 'Almarai', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
