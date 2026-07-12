/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#f5f7fa',
          dark: '#090d16',
          primary: '#6366f1',
          secondary: '#10b981',
          accent: '#f59e0b',
          danger: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
