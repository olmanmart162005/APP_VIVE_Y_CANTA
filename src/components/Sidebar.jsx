import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Music4,
  CalendarDays,
  DollarSign,
  Users,
  Image,
  User,
  Settings as SettingsIcon,
  X,
  Sparkles,
} from "lucide-react"
import logoImg from "../assets/logo.png"

const MENU_CATEGORIES = [
  {
    category: "Principal",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Hoja de Cantos", path: "/hojas-cantos", icon: Music4 },
      { name: "Actividades", path: "/activities", icon: CalendarDays },
    ],
  },
  {
    category: "Administración",
    items: [
      { name: "Finanzas", path: "/finance", icon: DollarSign },
      { name: "Integrantes", path: "/members", icon: Users },
    ],
  },
  {
    category: "Comunidad",
    items: [
      { name: "Galería", path: "/gallery", icon: Image },
      { name: "Mi Perfil", path: "/profile", icon: User },
      { name: "Configuración", path: "/settings", icon: SettingsIcon },
    ],
  },
]

function Sidebar({ isCollapsed, isMobile, onCloseMobile }) {
  return (
    <aside
      className={`h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 z-50 ${
        isMobile
          ? "w-72 shadow-2xl"
          : isCollapsed
          ? "w-20"
          : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 h-16 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={logoImg}
              alt="Coro Vive y Canta"
              className="w-9 h-9 rounded-full object-cover border border-[var(--gold)]/40 shadow-sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-sidebar)]" />
          </div>

          {(!isCollapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <h1 className="title-professional text-sm font-bold text-[var(--text-primary)] truncate leading-tight tracking-tight">
                Vive y Canta
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] truncate">
                Parroquia Esquipulas
              </p>
            </div>
          )}
        </div>

        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {MENU_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="space-y-1.5">
            {(!isCollapsed || isMobile) && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {cat.category}
              </p>
            )}

            {cat.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={isMobile ? onCloseMobile : undefined}
                  title={isCollapsed && !isMobile ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group relative ${
                      isActive
                        ? "bg-[var(--gold)] text-[#111111] shadow-md font-extrabold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                    } ${isCollapsed && !isMobile ? "justify-center px-0" : ""}`
                  }
                >
                  <Icon
                    size={18}
                    className="shrink-0 transition-transform group-hover:scale-110 text-[var(--gold)]"
                  />
                  {(!isCollapsed || isMobile) && (
                    <span className="truncate">{item.name}</span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer info badge */}
      {(!isCollapsed || isMobile) && (
        <div className="p-3.5 m-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] text-center">
          <div className="flex items-center justify-center gap-1.5 text-[var(--gold)] mb-1">
            <Sparkles size={13} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Edición 2026</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Coro Vive y Canta • SaaS
          </p>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
