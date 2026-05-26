import { useNavigate, useLocation } from "react-router-dom"
import {
  Home,
  CalendarDays,
  Bell,
  DollarSign,
  User,
} from "lucide-react"

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const active =
    "text-[#B8860B] scale-110"

  const inactive =
    "text-gray-400"

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-[30px] shadow-xl flex items-center gap-8 z-50">

      <button
        onClick={() =>
          navigate("/dashboard")
        }
        className={
          location.pathname === "/dashboard"
            ? active
            : inactive
        }
      >
        <Home />
      </button>

      <button
        onClick={() =>
          navigate("/activities")
        }
        className={
          location.pathname === "/activities"
            ? active
            : inactive
        }
      >
        <CalendarDays />
      </button>

      <button
        onClick={() =>
          navigate("/notices")
        }
        className={
          location.pathname === "/notices"
            ? active
            : inactive
        }
      >
        <Bell />
      </button>

      <button
        onClick={() =>
          navigate("/finance")
        }
        className={
          location.pathname === "/finance"
            ? active
            : inactive
        }
      >
        <DollarSign />
      </button>

      <button
        onClick={() =>
          navigate("/profile")
        }
        className={
          location.pathname === "/profile"
            ? active
            : inactive
        }
      >
        <User />
      </button>

    </div>
  )
}

export default BottomNav