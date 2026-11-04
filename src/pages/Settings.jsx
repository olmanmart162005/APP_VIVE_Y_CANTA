import { useNavigate } from "react-router-dom"
import { LogOut, Moon, Sun, Shield, Info, Palette } from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { useTheme } from "../context/ThemeContext"
import { supabase } from "../lib/supabase"

function Settings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    const confirmLogout = window.confirm("¿Deseas cerrar tu sesión?")
    if (!confirmLogout) return

    try {
      await supabase.auth.signOut()
      toast.success("Sesión cerrada correctamente")
      navigate("/", { replace: true })
    } catch (err) {
      console.error(err)
      toast.error("Error al cerrar sesión")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-4 md:p-8 pb-32 text-[var(--text-primary)] transition-colors duration-200">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="page-header-gold rounded-3xl px-5 py-5">
          <div className="flex items-center gap-2">
            <Shield size={24} className="header-text-primary" />
            <h1 className="title-professional title-gold-black text-2xl sm:text-3xl tracking-tight">Configuración del Sistema</h1>
          </div>
          <p className="header-text-secondary mt-1 text-xs sm:text-sm">Personalización visual, preferencias y administración</p>
        </div>

        <div className="card-premium p-5 sm:p-6 space-y-5">
          {/* TEMA VISUAL */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center border border-[var(--gold)]/30 shrink-0">
                  <Palette size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Apariencia Visual</p>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {theme === "dark" ? "Modo Oscuro Activo" : "Modo Claro Activo"}
                  </h3>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                Cambiar a {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
              </button>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              El tema seleccionado se sincroniza automáticamente con la barra superior y se mantiene guardado de forma permanente en tu dispositivo.
            </p>
          </div>

          {/* INFORMACIÓN DE LA VERSIÓN */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
                <Info size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sistema Oficial</p>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Coro Vive y Canta v2.0</h3>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Plataforma desarrollada para la Parroquia Nuestro Señor de Esquipulas, El Triunfo, Choluteca, Honduras. Incluye cantoral con 992 himnos litúrgicos y control administrativo.
            </p>
          </div>

          {/* CIERRE DE SESIÓN */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-4 sm:p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Gestión de Sesión</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Puedes cerrar sesión en cualquier momento. Tus credenciales guardadas se conservarán de forma segura en tu navegador si tienes habilitada la opción de guardado.
            </p>
            <button
              onClick={handleLogout}
              className="btn-danger mt-4 flex w-full items-center justify-center gap-2 py-3 text-xs font-bold cursor-pointer"
            >
              <LogOut size={16} />
              Cerrar Sesión Activa
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default Settings
