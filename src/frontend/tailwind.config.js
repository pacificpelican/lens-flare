/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        'primary-light': '#a78bfa',
        'primary-dark': '#6d28d9',
      },
      spacing: {
        'glassy-border': '1px',
      },
      borderRadius: {
        'sharp': '6px',
      },
    },
  },
  plugins: [],
};
