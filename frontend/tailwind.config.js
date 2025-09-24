/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Use stock Tailwind colors (zinc/neutral) to avoid unknown utility errors
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
    },
  },
  plugins: [],
}
