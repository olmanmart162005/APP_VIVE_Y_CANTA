import { Routes, Route, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"

import SplashScreen from "./components/SplashScreen"
import MainLayout from "./components/MainLayout"
import { ThemeProvider, useTheme } from "./context/ThemeContext"

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

function AppContent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const location = useLocation()
  const isDark = theme === "dark"

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1800)

    const syncUserProfile = (authUser) => {
      if (!authUser) return
      supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUser((prev) => ({
              ...prev,
              ...data,
              email: authUser.email,
            }))
          }
        })
        .catch((err) => console.error("Error cargando perfil en segundo plano:", err))
    }

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
          syncUserProfile(session.user)
        } else {
          setUser(null)
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
          syncUserProfile(session.user)
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

  if (loading) {
    return <SplashScreen />
  }

  const isLoginPage = location.pathname === "/"

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in:      { opacity: 1, y: 0  },
    out:     { opacity: 0, y: -6 },
  }

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.2,
  }

  const routesElement = (
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
          <Route path="/" element={<Login user={user} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/members" element={<Members />} />
          <Route path="/member/:id" element={<MemberDetails />} />
          <Route path="/carnet/:id" element={<MemberCard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hojas-cantos" element={<HojaCantos />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: isDark ? "#252525" : "#FFFFFF",
            color: isDark ? "#F5F0E6" : "#111111",
            border: isDark ? "1px solid rgba(212, 175, 55, 0.25)" : "1px solid #DDD6CA",
            borderRadius: "16px",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: isDark
              ? "0 10px 40px rgba(0,0,0,0.6)"
              : "0 10px 30px rgba(17,17,17,0.06)",
          },
          success: {
            iconTheme: {
              primary: "#D4AF37",
              secondary: isDark ? "#252525" : "#FFFFFF",
            },
          },
          error: {
            iconTheme: {
              primary: "#DC2626",
              secondary: isDark ? "#252525" : "#FFFFFF",
            },
          },
        }}
      />
      {isLoginPage ? routesElement : <MainLayout>{routesElement}</MainLayout>}
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
