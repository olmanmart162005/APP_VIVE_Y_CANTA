import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useEffect, useState, useCallback } from "react"
import { Toaster, toast } from "react-hot-toast"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

import SplashScreen from "./components/SplashScreen"
import MainLayout from "./components/MainLayout"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import { PwaProvider } from "./context/PwaContext"
import InstallModal from "./components/pwa/InstallModal"
import OfflineBanner from "./components/pwa/OfflineBanner"

import EditProfile from "./pages/EditProfile"
import Login from "./pages/Login"
import ForcePasswordChange from "./pages/ForcePasswordChange"
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
  const [authChecking, setAuthChecking] = useState(true)
  // Pantalla de bienvenida animada: se inicia en true al abrir la aplicación
  const [showSplash, setShowSplash] = useState(true)
  const { theme } = useTheme()
  const location = useLocation()
  const isDark = theme === "dark"

  const fetchAndSyncProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null)
      setAuthChecking(false)
      return
    }

    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle()

      if (error) {
        console.error("Error consultando perfil:", error.message)
      }

      // Si la cuenta fue desactivada por el administrador, cerrar sesión inmediatamente
      if (profileData?.estado === "retirado") {
        await supabase.auth.signOut()
        setUser(null)
        setAuthChecking(false)
        toast.error("Tu cuenta se encuentra desactivada por la administración.")
        return
      }

      setUser({
        id: authUser.id,
        email: profileData?.email || authUser.email,
        auth_email: authUser.email,
        usuario: profileData?.usuario || authUser.email?.split("@")[0] || "",
        nombre_completo:
          profileData?.nombre_completo || authUser.email?.split("@")[0] || "Integrante",
        role: profileData?.role || "integrante",
        estado: profileData?.estado || "activo",
        // Por seguridad, si el campo es true o null, exigir actualización de contraseña
        debe_cambiar_password: profileData ? profileData.debe_cambiar_password !== false : true,
        ...profileData,
        profileLoaded: true,
      })
    } catch (err) {
      console.error("Error sincronizando perfil:", err)
      setUser({
        id: authUser.id,
        email: authUser.email,
        usuario: authUser.email?.split("@")[0] || "",
        nombre_completo: authUser.email?.split("@")[0] || "Integrante",
        role: "integrante",
        estado: "activo",
        debe_cambiar_password: true,
        profileLoaded: true,
      })
    } finally {
      setAuthChecking(false)
    }
  }, [])

  const refreshCurrentUserProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      await fetchAndSyncProfile(data.user)
    }
  }, [fetchAndSyncProfile])

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setShowSplash(false)
    }, 3200)

    const checkInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          await fetchAndSyncProfile(session.user)
        } else {
          setUser(null)
          setAuthChecking(false)
        }
      } catch (err) {
        console.error(err)
        setAuthChecking(false)
      }
    }

    checkInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchAndSyncProfile(session.user)
      } else {
        setUser(null)
        setAuthChecking(false)
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [fetchAndSyncProfile])

  const mustChangePassword = Boolean(user && user.debe_cambiar_password !== false)
  const isPublicOrStandalonePage =
    location.pathname === "/" ||
    location.pathname === "/actualizar-password" ||
    mustChangePassword

  // Guardián de rutas protegidas y bloqueo estricto durante el cambio obligatorio de contraseña
  const renderProtected = (Component) => {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl">
            <Loader2 className="animate-spin text-[#D4AF37]" size={22} />
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              Verificando credenciales y seguridad de sesión…
            </span>
          </div>
        </div>
      )
    }

    if (!user) {
      return <Navigate to="/" replace />
    }

    if (mustChangePassword) {
      return <Navigate to="/actualizar-password" replace />
    }

    return Component
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -6 },
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
          {/* Ruta de Inicio de Sesión */}
          <Route
            path="/"
            element={
              user && user.profileLoaded ? (
                mustChangePassword ? (
                  <Navigate to="/actualizar-password" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Login user={user} />
              )
            }
          />

          {/* Pantalla Obligatoria de Actualización de Contraseña */}
          <Route
            path="/actualizar-password"
            element={
              authChecking ? (
                <div className="min-h-screen bg-[#111111] flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#D4AF37]" size={28} />
                </div>
              ) : !user ? (
                <Navigate to="/" replace />
              ) : !mustChangePassword ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <ForcePasswordChange
                  user={user}
                  onPasswordUpdated={refreshCurrentUserProfile}
                />
              )
            }
          />

          {/* Módulos Protegidos del Sistema */}
          <Route path="/dashboard" element={renderProtected(<Dashboard />)} />
          <Route path="/activities" element={renderProtected(<Activities />)} />
          <Route path="/actividades" element={renderProtected(<Activities />)} />
          <Route path="/finance" element={renderProtected(<Finance />)} />
          <Route path="/finanzas" element={renderProtected(<Finance />)} />
          <Route path="/members" element={renderProtected(<Members />)} />
          <Route path="/integrantes" element={renderProtected(<Members />)} />
          <Route path="/member/:id" element={renderProtected(<MemberDetails />)} />
          <Route path="/carnet/:id" element={renderProtected(<MemberCard />)} />
          <Route path="/profile" element={renderProtected(<Profile />)} />
          <Route path="/perfil" element={renderProtected(<Profile />)} />
          <Route path="/profile/edit" element={renderProtected(<EditProfile />)} />
          <Route path="/notices" element={renderProtected(<Notices />)} />
          <Route path="/avisos" element={renderProtected(<Notices />)} />
          <Route path="/gallery" element={renderProtected(<Gallery />)} />
          <Route path="/galeria" element={renderProtected(<Gallery />)} />
          <Route path="/settings" element={renderProtected(<Settings />)} />
          <Route path="/hojas-cantos" element={renderProtected(<HojaCantos />)} />

          {/* Cualquier otra ruta redirige según el estado de seguridad */}
          <Route
            path="*"
            element={
              !user ? (
                <Navigate to="/" replace />
              ) : mustChangePassword ? (
                <Navigate to="/actualizar-password" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
      <OfflineBanner />
      <InstallModal />
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
      {isPublicOrStandalonePage ? routesElement : <MainLayout>{routesElement}</MainLayout>}
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <PwaProvider>
        <AppContent />
      </PwaProvider>
    </ThemeProvider>
  )
}

export default App
