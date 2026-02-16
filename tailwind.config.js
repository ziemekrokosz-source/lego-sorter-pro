/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.{js,ts,jsx,tsx}"]
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0',
      }
    },
  },
  plugins: [],
}
