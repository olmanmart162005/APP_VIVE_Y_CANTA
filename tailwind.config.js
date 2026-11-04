/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D4AF37",
        gold: "#D4AF37",
        goldSoft: "#BFA15A",
        goldDark: "#9E7F25",
        carbon: "#111111",
        graphite: "#252525",
        ivory: "#F5F0E6",
        light: "#FFFFFF",
        secondary: "#A69F93",
        bgMain: "var(--bg-app)",
        bgCard: "var(--bg-card)",
        bgSidebar: "var(--bg-sidebar)",
        bgNavbar: "var(--bg-navbar)",
        bgInput: "var(--bg-input)",
        bgMuted: "var(--bg-muted)",
        textClear: "var(--text-primary)",
        borderTheme: "var(--border-color)",
        successTheme: "#4ADE80",
        errorTheme: "#F87171",
      },

      fontFamily: {
        sans: ["Cormorant Garamond", "Georgia", "serif"],
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
        premium: "0 8px 32px rgba(0, 0, 0, 0.45)",
      },

      borderRadius: {
        xl2: "24px",
      },
    },
  },
  plugins: [],
}
