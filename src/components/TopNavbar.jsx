import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Sun,
  Moon,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
} from "lucide-react"
import Avatar from "react-avatar"
import { useTheme } from "../context/ThemeContext"
import { usePwa } from "../context/PwaContext"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"
import logoImg from "../assets/logo.png"

function TopNavbar({ onToggleMobileMenu, isCollapsed, onToggleCollapse }) {
  const { theme, toggleTheme } = useTheme()
  const { promptInstall, isInstalled } = usePwa()
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchUser = async () => {
      try {
        const u = await getCurrentUser()
        if (isMounted) setUser(u)
      } catch (e) {
        console.error(e)
      }
    }
    fetchUser()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    if (window.confirm("¿Deseas cerrar tu sesión?")) {
      await supabase.auth.signOut()
      navigate("/", { replace: true })
    }
  }

  // Get current section title based on path
  const getSectionTitle = () => {
    const path = location.pathname
    if (path.startsWith("/dashboard")) return "Panel Principal"
    if (path.startsWith("/hojas-cantos")) return "Hoja de Cantos"
    if (path.startsWith("/activities")) return "Calendario Coral"
    if (path.startsWith("/finance")) return "Control Financiero"
    if (path.startsWith("/members")) return "Gestión de Integrantes"
    if (path.startsWith("/notices")) return "Avisos y Comunicados"
    if (path.startsWith("/gallery")) return "Galería Oficial"
    if (path.startsWith("/profile")) return "Perfil de Integrante"
    if (path.startsWith("/settings")) return "Configuración del Sistema"
    return "Coro Vive y Canta"
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-navbar)] border-b border-[var(--border-color)] transition-colors duration-200 shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Hamburger (mobile) or Collapse Toggle (desktop) + Brand/Section */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            aria-label="Contraer/Expandir menú lateral"
            title={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {/* Logo on mobile / Title on desktop */}
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover lg:hidden border border-[var(--gold)]/30"
            />
            <div>
              <h2 className="title-professional text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                {getSectionTitle()}
              </h2>
              <p className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Coro Vive y Canta • Esquipulas
              </p>
            </div>
          </div>
        </div>

        {/* Right: Install Button, Theme Toggle, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* BOTÓN INSTALAR PWA SI NO ESTÁ INSTALADA */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] hover:bg-[var(--gold)]/25 border border-[var(--gold)]/35 text-xs font-bold transition-all shadow-xs cursor-pointer group"
              title="Instalar Coro Vive y Canta"
            >
              <Download size={14} className="text-[var(--gold)] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Instalar App</span>
              <span className="sm:hidden">Instalar</span>
            </button>
          )}

          {/* THEME TOGGLE BUTTON (SOL / LUNA) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="relative p-2.5 rounded-2xl bg-[var(--bg-muted)] hover:bg-[var(--border-color)]/50 text-[var(--text-primary)] border border-[var(--border-color)] transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            aria-label={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            title={theme === "dark" ? "Activar Modo Claro" : "Activar Modo Oscuro"}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              {theme === "dark" ? (
                <Sun
                  size={19}
                  className="text-[#D4AF37] group-hover:rotate-45 transition-transform duration-300"
                />
              ) : (
                <Moon
                  size={19}
                  className="text-[#BFA15A] group-hover:-rotate-12 transition-transform duration-300"
                />
              )}
            </div>
            <span className="sr-only">Cambiar tema</span>
          </button>

          {/* USER AVATAR & DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-2xl bg-[var(--bg-muted)] hover:bg-[var(--border-color)]/40 border border-[var(--border-color)] transition-all cursor-pointer"
              aria-label="Menú de usuario"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-surface)] border border-[var(--gold)]/40 p-0.5">
                {user?.foto ? (
                  <img
                    src={user.foto}
                    alt={user.nombre_completo || "Usuario"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Avatar
                    name={user?.nombre_completo || "Usuario"}
                    size="28"
                    round={true}
                    color="#252525"
                    textColor="#D4AF37"
                    className="font-bold text-xs"
                  />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] leading-none truncate max-w-[110px]">
                  {user?.nombre_completo?.split(" ")[0] || "Usuario"}
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5">
                  {user?.role || "Integrante"}
                </p>
              </div>
              <ChevronDown size={14} className="text-[var(--text-secondary)] hidden sm:block" />
            </button>

            {/* Profile Menu Popup */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {user?.nombre_completo || "Usuario"}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">
                      {user?.email || ""}
                    </p>
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] mt-1.5 border border-[var(--gold)]/30">
                      {user?.role || "integrante"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      navigate("/profile")
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors text-left cursor-pointer"
                  >
                    <User size={15} className="text-[var(--gold)]" />
                    Mi Perfil
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      navigate("/settings")
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors text-left cursor-pointer"
                  >
                    <Shield size={15} className="text-[var(--gold)]" />
                    Configuración
                  </button>

                  {!isInstalled && (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        promptInstall()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors text-left cursor-pointer"
                    >
                      <Download size={15} className="text-[var(--gold)]" />
                      Instalar Aplicación
                    </button>
                  )}

                  <div className="my-1 border-t border-[var(--border-color)]" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-500 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={15} />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopNavbar
