/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D4AF37",
        secondary: "#F8F4E9",
        dark: "#1E1E1E",
        light: "#FFFFFF",
        accent: "#B8860B",
      },

      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },

      boxShadow: {
        card: "0 8px 25px rgba(0,0,0,0.08)",
      },

      borderRadius: {
        xl2: "24px",
      },
    },
  },
  plugins: [],
}