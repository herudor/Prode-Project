/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          500: '#4361ee',
          600: '#3a56d4',
          700: '#2f45b8',
          900: '#1a2a7a'
        },
        world: {
          gold: '#FFD700',
          green: '#006633',
          red: '#CC0000'
        }
      }
    }
  },
  plugins: []
};
