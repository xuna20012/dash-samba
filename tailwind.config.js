/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'whatsapp': {
          'green': '#00a884',
          'light-green': '#dcf8c6',
          'panel': '#f0f2f5',
          'drawer': '#ffffff',
          'border': '#e9edef',
        }
      }
    },
  },
  plugins: [],
};