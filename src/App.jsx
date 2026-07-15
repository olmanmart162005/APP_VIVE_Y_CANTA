import { Routes, Route, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"

import SplashScreen from "./components/SplashScreen"

import EditProfile from "./pages/EditProfile"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import MemberDetails from "./pages/MemberDetails"
import MemberCard from "./pages/MemberCard"
import Activities from "./pages/Activities"
import Finance from "./pages/Finance"
import Profile from "./pages/Profile"
import Notices from "./pages/Notices"
import Members from "./pages/Members"
import Gallery from "./pages/Gallery"
import Settings from "./pages/Settings"
import HojaCantos from "./pages/HojaCantos"
import { supabase } from "./lib/supabase"

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("theme")
    if (stored === "dark" || stored === "light") return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem("theme", theme)
  }, [theme])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            nombre_completo: session.user.email.split("@")[0],
            role: "integrante",
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            nombre_completo: session.user.email.split("@")[0],
            role: "integrante",
          })
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error(err)
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const location = useLocation()

  if (loading) {
    return <SplashScreen />
  }

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    in:      { opacity: 1, y: 0  },
    out:     { opacity: 0, y: -8 },
  }

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.22,
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1A1710",
            color: "#F5E9C0",
            border: "1px solid rgba(212, 175, 55, 0.15)",
            borderRadius: "16px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          },
          success: {
            iconTheme: {
              primary: "#D4AF37",
              secondary: "#1A1710",
            },
          },
          error: {
            iconTheme: {
              primary: "#F87171",
              secondary: "#1A1710",
            },
          },
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          style={{ width: "100%", minHeight: "100%" }}
        >
          <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={<Login user={user} />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/activities"
          element={<Activities />}
        />

        <Route
          path="/finance"
          element={<Finance />}
        />

        <Route
          path="/members"
          element={<Members />}
        />

        <Route
          path="/member/:id"
          element={<MemberDetails />}
        />

        <Route
          path="/carnet/:id"
          element={<MemberCard />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/profile/edit"
          element={<EditProfile />}
        />

        <Route
          path="/notices"
          element={<Notices />}
        />

        <Route
          path="/gallery"
          element={<Gallery />}
        />

        <Route
          path="/settings"
          element={<Settings theme={theme} onToggleTheme={toggleTheme} />}
        />

          <Route
            path="/hojas-cantos"
            element={<HojaCantos />}
          />
        </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default App