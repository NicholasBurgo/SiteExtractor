/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0e0e10',
        surface: '#181a20',
        border: '#22252d',
        text: '#e8e8ea',
        accent: '#7db2ff',
        confirm: '#7db2ff',
        retry: '#f8d34c',
        deny: '#ff4d4d',
        edit: '#3a3f4b',
        success: '#5bd778',
        warning: '#ffcc66',
        error: '#ff5c5c'
      }
    },
  },
  plugins: [],
}

