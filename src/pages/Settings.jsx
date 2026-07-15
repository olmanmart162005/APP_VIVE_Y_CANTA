import { useNavigate } from "react-router-dom"
import { LogOut, MoonStar, SunMedium } from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"

function Settings({ theme, toggleTheme }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const confirmLogout = window.confirm("¿Cerrar sesión?")
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
    <div className="min-h-screen bg-[var(--bg-app)] p-4 pb-28 text-[var(--text-primary)] sm:p-5">
      <div className="mx-auto mt-2 max-w-2xl">
        <div className="page-header-gold rounded-3xl px-5 py-4">
          <h1 className="title-professional title-gold-black text-2xl tracking-tight">Configuración</h1>
          <p className="header-text-secondary mt-1 text-sm">Opciones y administración del sistema</p>
        </div>

        <div className="card-premium mt-4 space-y-4">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Tema</p>
                <h2 className="text-sm font-black">Apariencia de la app</h2>
              </div>
              <button onClick={toggleTheme} className="btn-secondary px-3 py-2 text-[10px]">
                {theme === "dark" ? <SunMedium size={14} /> : <MoonStar size={14} />}
                {theme === "dark" ? "Claro" : "Oscuro"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Se adapta automáticamente al sistema y puedes cambiarlo manualmente aquí.</p>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Sesión de usuario</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">Puedes cerrar tu sesión de forma segura aquí. Se mantendrán tus datos guardados en el dispositivo de forma encriptada para el próximo inicio.</p>
            <button onClick={handleLogout} className="btn-danger mt-3 flex w-full items-center justify-center gap-2 py-3 text-xs font-bold">
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default Settings