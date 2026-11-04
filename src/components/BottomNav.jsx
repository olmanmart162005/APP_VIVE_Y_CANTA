import {
  Home,
  CalendarDays,
  DollarSign,
  Users,
  User,
  Music4,
} from "lucide-react"
import { NavLink } from "react-router-dom"

function BottomNav() {
  const navItems = [
    {
      icon: Home,
      path: "/dashboard",
    },
    {
      icon: CalendarDays,
      path: "/activities",
    },
    {
      icon: DollarSign,
      path: "/finance",
    },
    {
      icon: Music4,
      path: "/hojas-cantos",
    },
    {
      icon: Users,
      path: "/members",
    },
    {
      icon: User,
      path: "/profile",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="w-full max-w-[430px] px-4 pb-4">
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-xl rounded-[28px] shadow-2xl border border-[var(--border-color)] px-3 py-3 flex items-center justify-between transition-colors">
          {navItems.map((item, index) => {
            const Icon = item.icon

            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--gold)] text-black scale-105 shadow-lg shadow-[var(--gold)]/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--gold)]"
                  }`
                }
              >
                <Icon size={22} strokeWidth={2.3} />
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BottomNav