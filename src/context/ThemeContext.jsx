import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = window.localStorage.getItem("theme")
      if (stored === "dark" || stored === "light") return stored
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } catch {
      return "dark"
    }
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-theme", theme)
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }
    root.style.colorScheme = theme
    try {
      window.localStorage.setItem("theme", theme)
    } catch (e) {
      console.error(e)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
export default ThemeContext
