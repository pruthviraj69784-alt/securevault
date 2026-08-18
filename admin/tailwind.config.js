/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          text: '#F9FAFB'
        },
        admin: {
          50: '#F0F9FF',
          500: '#0284C7',
          600: '#0369A1',
          700: '#075985'
        }
      }
    },
  },
  plugins: [],
}
