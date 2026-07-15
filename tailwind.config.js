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
        secondary: "#a89060",
        dark: "#1E1E1E",
        light: "#FFFFFF",
        accent: "#B8860B",
        bgMain: "#0E0C09",
        bgCard: "#1A1710",
        bgInput: "#221F18",
        gold: "#D4AF37",
        goldDark: "#B8860B",
        textClear: "#F5E9C0",
        borderTheme: "rgba(212, 175, 55, 0.15)",
        successTheme: "#4ADE80",
        errorTheme: "#F87171",
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      fontSize: {
        xs: '0.8125rem', // 13px
        sm: '0.875rem',  // 14px
        base: '1rem',    // 16px
        lg: '1.125rem',  // 18px
        xl: '1.5rem',    // 24px
        '2xl': '2rem',   // 32px
      },

      boxShadow: {
        card: "0 8px 25px rgba(0,0,0,0.08)",
        premium: "0 8px 32px rgba(0, 0, 0, 0.5)",
      },

      borderRadius: {
        xl2: "24px",
      },
    },
  },
  plugins: [],
}