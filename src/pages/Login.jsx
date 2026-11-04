import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Lock, User, Loader2, Eye, EyeOff, Sun, Moon, ShieldAlert } from "lucide-react"
import { toast } from "react-hot-toast"
import { motion } from "framer-motion"

import logo from "../assets/logo.png"
import { supabase } from "../lib/supabase"
import { useTheme } from "../context/ThemeContext"

function Login({ user }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberLogin, setRememberLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, navigate])

  // Cargar usuario guardado previamente si la opción de recordar estaba activa
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("vyc_saved_usuario")
      const savedRemember = localStorage.getItem("vyc_remember_login")
      if (savedRemember !== null) {
        setRememberLogin(savedRemember === "true")
      }
      if (savedUser && savedRemember !== "false") {
        setUsuario(savedUser)
      }
    } catch (e) {
      console.warn("No se pudo leer localStorage:", e)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!usuario.trim() || !password) {
      toast.error("Por favor completa tu usuario y contraseña")
      return
    }

    const cleanUser = usuario.trim().toLowerCase()
    const email = cleanUser.includes("@") ? cleanUser : `${cleanUser}@viveycanta.app`

    try {
      setLoading(true)

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 35000)
      )

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise,
      ])

      if (error) {
        console.error("[LOGIN] Error retornado por Supabase:", error)
        toast.error("Usuario o contraseña incorrectos")
        return
      }

      // Guardar usuario en localStorage sólo si el usuario lo autorizó (sin guardar contraseña)
      try {
        if (rememberLogin) {
          localStorage.setItem("vyc_saved_usuario", cleanUser)
          localStorage.setItem("vyc_remember_login", "true")
        } else {
          localStorage.removeItem("vyc_saved_usuario")
          localStorage.setItem("vyc_remember_login", "false")
        }
      } catch (storageErr) {
        console.warn("No se pudo persistir en localStorage:", storageErr)
      }

      toast.success("¡Bienvenido al sistema!")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      console.error("[LOGIN] Error en autenticación:", err)
      if (err.message === "TIMEOUT") {
        toast.error("Tiempo de espera agotado. Por favor verifica tu conexión a internet.")
      } else {
        toast.error("Error al conectar con el servidor. Inténtalo de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-3 sm:p-6 transition-colors duration-300 relative select-none ${
        isDark ? "bg-[#111111]" : "bg-[#F5F0E6]"
      }`}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Botón flotante selector de tema (Modo Claro / Modo Oscuro) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          title={isDark ? "Activar Modo Claro" : "Activar Modo Oscuro"}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-200 shadow-md border cursor-pointer ${
            isDark
              ? "bg-[#252525] hover:bg-[#2e2e2e] text-[#F5F0E6] border-[#383838]"
              : "bg-[#FFFFFF] hover:bg-[#F0EBE0] text-[#111111] border-[#DDD6CA]"
          }`}
        >
          {isDark ? (
            <Sun size={16} className="text-[#D4AF37] transition-transform duration-300 hover:rotate-45" />
          ) : (
            <Moon size={16} className="text-[#BFA15A] transition-transform duration-300 hover:-rotate-12" />
          )}
          <span className="hidden sm:inline font-sans">{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
        </button>
      </div>

      {/* Contenedor Principal / Tarjeta de Autenticación */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-[420px] rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-2xl transition-all duration-300 border ${
          isDark
            ? "bg-[#252525] border-[#D4AF37]/25 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            : "bg-[#FFFFFF] border-[#DDD6CA] shadow-[0_20px_40px_rgba(17,17,17,0.08)]"
        }`}
      >
        {/* =====================================================================
            ENCABEZADO SUPERIOR DORADO (Protagonista institucional)
           ===================================================================== */}
        <div className="relative pt-8 pb-7 px-6 text-center bg-gradient-to-b from-[#E2BE53] via-[#D4AF37] to-[#C49E2E] text-[#111111] shadow-inner">
          {/* Destello sutil superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Círculo central con el Logotipo Oficial */}
          <div className="relative w-24 h-24 mx-auto mb-3.5">
            <div className="absolute inset-0 rounded-full bg-black/10 blur-sm" />
            <div
              className={`relative w-24 h-24 rounded-full flex items-center justify-center p-2.5 shadow-xl border-2 transition-transform duration-300 hover:scale-105 ${
                isDark
                  ? "bg-[#181818] border-[#111111]"
                  : "bg-[#FFFFFF] border-[#BFA15A]/60"
              }`}
            >
              <img
                src={logo}
                alt="Logotipo Oficial Coro Vive y Canta"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
              />
            </div>
          </div>

          {/* Textos del Encabezado */}
          <p
            className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] uppercase text-[#111111]/85 mb-0.5 font-sans"
          >
            Sistema Administrativo
          </p>

          <h1
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-3xl sm:text-4xl font-bold tracking-[0.02em] text-[#111111] leading-tight"
          >
            Vive y Canta
          </h1>

          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#111111]/75 mt-0.5 font-sans"
          >
            Coro Oficial
          </p>

          {/* Separador decorativo dorado */}
          <div className="flex items-center justify-center gap-2 mt-3 w-28 mx-auto">
            <div className="h-[1px] flex-1 bg-black/20" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#111111]/60" />
            <div className="h-[1px] flex-1 bg-black/20" />
          </div>
        </div>

        {/* =====================================================================
            PANEL DE FORMULARIO DE ACCESO (Grafito en oscuro / Blanco en claro)
           ===================================================================== */}
        <div className={`p-6 sm:p-8 ${isDark ? "bg-[#252525]" : "bg-[#FFFFFF]"}`}>
          <form onSubmit={handleLogin} method="post" autoComplete="on" className="space-y-5">
            {/* CAMPO DE USUARIO */}
            <div>
              <label
                htmlFor="usuario"
                className="block text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase mb-1.5 font-sans text-[#D4AF37]"
              >
                Usuario
              </label>

              <div
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-200 ${
                  isDark
                    ? focusedField === "usuario"
                      ? "border-[#D4AF37] bg-[#181818] shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
                      : "border-[#383838] bg-[#1A1A1A] hover:border-[#4A4A4A]"
                    : focusedField === "usuario"
                    ? "border-[#D4AF37] bg-[#FFFFFF] shadow-[0_0_0_3px_rgba(212,175,55,0.15)]"
                    : "border-[#DDD6CA] bg-[#FAF8F5] hover:border-[#C4BDB0]"
                }`}
              >
                <User
                  size={18}
                  className={`shrink-0 transition-colors duration-200 ${
                    focusedField === "usuario" ? "text-[#D4AF37]" : "text-[#BFA15A]"
                  }`}
                />
                <input
                  id="usuario"
                  name="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  onFocus={() => setFocusedField("usuario")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  required
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className={`w-full bg-transparent border-none outline-none text-base font-normal tracking-wide ${
                    isDark
                      ? "text-[#FFFFFF] placeholder-[#736C61]"
                      : "text-[#111111] placeholder-[#8C8477]"
                  }`}
                />
              </div>
            </div>

            {/* CAMPO DE CONTRASEÑA */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase mb-1.5 font-sans text-[#D4AF37]"
              >
                Contraseña
              </label>

              <div
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-200 ${
                  isDark
                    ? focusedField === "password"
                      ? "border-[#D4AF37] bg-[#181818] shadow-[0_0_0_3px_rgba(212,175,55,0.18)]"
                      : "border-[#383838] bg-[#1A1A1A] hover:border-[#4A4A4A]"
                    : focusedField === "password"
                    ? "border-[#D4AF37] bg-[#FFFFFF] shadow-[0_0_0_3px_rgba(212,175,55,0.15)]"
                    : "border-[#DDD6CA] bg-[#FAF8F5] hover:border-[#C4BDB0]"
                }`}
              >
                <Lock
                  size={18}
                  className={`shrink-0 transition-colors duration-200 ${
                    focusedField === "password" ? "text-[#D4AF37]" : "text-[#BFA15A]"
                  }`}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  required
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className={`w-full bg-transparent border-none outline-none text-base font-normal tracking-wide ${
                    isDark
                      ? "text-[#FFFFFF] placeholder-[#736C61]"
                      : "text-[#111111] placeholder-[#8C8477]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isDark
                      ? "text-[#A69F93] hover:text-[#D4AF37] hover:bg-[#333333]"
                      : "text-[#8C8477] hover:text-[#D4AF37] hover:bg-[#F0EBE0]"
                  }`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* CASILLA RECORDAR ACCESO */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-[#D4AF37] cursor-pointer"
                />
                <span
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className={`text-sm tracking-wide transition-colors ${
                    isDark
                      ? "text-[#A69F93] group-hover:text-[#FFFFFF]"
                      : "text-[#5C564D] group-hover:text-[#111111]"
                  }`}
                >
                  Guardar datos de ingreso
                </span>
              </label>
            </div>

            {/* BOTÓN DE INICIO DE SESIÓN */}
            <button
              type="submit"
              disabled={loading}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E0BA4D] to-[#BFA15A] text-[#111111] font-bold text-lg sm:text-xl tracking-[0.05em] uppercase shadow-[0_8px_25px_rgba(212,175,55,0.35)] hover:shadow-[0_10px_30px_rgba(212,175,55,0.5)] hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-[#111111]" size={20} />
                  <span>Validando credenciales…</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>

          {/* PIE DE PÁGINA DISCRETO */}
          <div className="mt-7 text-center border-t border-[var(--border-color)] pt-4">
            <p
              className={`text-[10px] sm:text-[11px] tracking-wider font-sans ${
                isDark ? "text-[#736C61]" : "text-[#8C8477]"
              }`}
            >
              © Coro Vive y Canta · Acceso restringido
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
