import {
  Home,
  CalendarDays,
  DollarSign,
  Users,
  User,
} from "lucide-react"

import {
  NavLink,
} from "react-router-dom"

function BottomNav() {

  const navItems = [
    {
      icon: Home,
      path:
        "/dashboard",
    },
    {
      icon:
        CalendarDays,
      path:
        "/activities",
    },
    
    {
      icon:
        DollarSign,
      path:
        "/finance",
    },
    {
      icon:
        Users,
      path:
        "/members",
    },
    {
      icon: User,
      path:
        "/profile",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">

      <div className="w-full max-w-[430px] px-4 pb-4">

        <div className="bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl border border-gray-100 px-3 py-3 flex items-center justify-between">

          {navItems.map(
            (
              item,
              index
            ) => {

              const Icon =
                item.icon

              return (
                <NavLink
                  key={index}
                  to={
                    item.path
                  }
                  className={({
                    isActive,
                  }) =>
                    `flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-[#D4AF37] text-white scale-105 shadow-lg"
                        : "text-gray-400 hover:text-[#B8860B]"
                    }`
                  }
                >

                  <Icon
                    size={22}
                    strokeWidth={
                      2.3
                    }
                  />

                </NavLink>
              )
            }
          )}

        </div>

      </div>

    </div>
  )
}

export default BottomNav