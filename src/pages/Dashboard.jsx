import { useEffect, useState } from "react"
import {
  CalendarDays,
  DollarSign,
  Users,
  BookOpen,
  Music,
  MapPin,
  Clock,
} from "lucide-react"
import Avatar from "react-avatar"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"

function Dashboard() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [nextActivity, setNextActivity] = useState(null)
  const [membersCount,
    setMembersCount] =
    useState(0)

  const verses = [
    {
      text: "Quien canta, ora dos veces.",
      ref: "San Agustín",
    },
    {
      text: "Canten al Señor un cántico nuevo.",
      ref: "Salmo 96:1",
    },
    {
      text: "Todo lo puedo en Cristo que me fortalece.",
      ref: "Filipenses 4:13",
    },
    {
      text: "Ámense unos a otros.",
      ref: "Juan 13:34",
    },
  ]

  const todayVerse = verses[new Date().getDate() % verses.length]

  useEffect(() => {
    loadUser()
    loadFinance()
    loadActivity()
    loadMembersCount()
  }, [])

  const loadUser = async () => {
    const profile = await getCurrentUser()
    setUser(profile)
  }

  const loadFinance = async () => {
    const { data } = await supabase.from("financial_records").select("*")

    if (!data) return

    const ingresos = data
      .filter((r) => r.tipo === "ingreso")
      .reduce((acc, curr) => acc + Number(curr.monto), 0)

    const gastos = data
      .filter((r) => r.tipo === "gasto")
      .reduce((acc, curr) => acc + Number(curr.monto), 0)

    setBalance(ingresos - gastos)
  }

  const loadActivity = async () => {
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("estado", "pendiente")
      .order("fecha", { ascending: true })
      .limit(1)

    if (data?.length) {
      setNextActivity(data[0])
    }
  }

  const loadMembersCount =
    async () => {

      const {
        count,
        error,
      } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })

      if (!error) {
        setMembersCount(
          count || 0
        )
      }
    }

  const getRoleName = () => {
    switch (user?.role) {
      case "admin":
        return "Administrador"
      case "secretaria":
        return "Secretaria"
      case "director":
        return "Director"
      case "tesorero":
        return "Tesorero"
      default:
        return "Integrante"
    }
  }

  const currentDate = new Date().toLocaleDateString("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 font-sans antialiased text-gray-800">

      {/* HEADER DE BIENVENIDA CON IDENTIDAD PREMIUM */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-b-[45px] px-5 pt-6 pb-8 text-white shadow-lg relative">
        <div className="flex items-center justify-between max-w-4xl mx-auto mt-2">

          <div className="min-w-0 flex-1">
            <p className="opacity-80 text-[10px] uppercase font-black tracking-widest block capitalize">
              {currentDate}
            </p>
            <h1 className="font-black text-2xl mt-1.5 tracking-tight break-words">
              ¡Hola, {user?.nombre_completo?.split(" ")[0] || "Bienvenido"}!
            </h1>
            <span className="inline-block bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-2 backdrop-blur-xs">
              {getRoleName()}
            </span>
          </div>

          {/* AVATAR CORPORATIVO EN EL ENCABEZADO */}
          <div className="w-14 h-14 p-0.5 rounded-full bg-gradient-to-tr from-white/40 to-white shadow-md shrink-0 ml-4">
            <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
              {user?.foto ? (
                <img src={user.foto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Avatar
                  name={user?.nombre_completo || "Usuario"}
                  size="48"
                  round={true}
                  color="#F3EAC2"
                  textColor="#8B6508"
                  className="font-black"
                />
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto -mt-4 space-y-4">

        {/* CONTENEDOR GRID DE TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-2 gap-3.5">

          {/* CAJA GENERAL */}
          <div className="bg-white rounded-[28px] p-4 shadow-xl border border-gray-100/70 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-[#F8F4E9] p-2.5 rounded-xl w-fit text-[#B8860B]">
                <DollarSign size={20} />
              </div>
              <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-wider mt-4">
                Caja General
              </h3>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#B8860B] mt-2 tracking-tight break-words">
              L {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* INTEGRANTES */}
          <div className="bg-white rounded-[28px] p-4 shadow-xl border border-gray-100/70 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-[#F8F4E9] p-2.5 rounded-xl w-fit text-[#B8860B]">
                <Users size={20} />
              </div>
              <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-wider mt-4">
                Integrantes
              </h3>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#B8860B] mt-2 tracking-tight">
              {membersCount}
            </p>
          </div>

        </div>

        {/* GRID SECUNDARIO PARA ENLACES / CONTENIDOS DE TEXTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* TARJETA: VERSÍCULO DEL DÍA */}
          <div className="bg-white rounded-[28px] p-5 shadow-xl border border-gray-100/70 overflow-hidden flex flex-col justify-between relative">
            <div>
              <div className="flex items-center gap-2.5 text-gray-800">
                <BookOpen size={18} className="text-[#B8860B]" />
                <h2 className="font-black uppercase tracking-wider text-[11px] text-gray-400">
                  Versículo del día
                </h2>
              </div>
              <p className="mt-4 font-medium italic text-gray-700 leading-relaxed text-sm break-words">
                "{todayVerse.text}"
              </p>
            </div>
            <p className="text-xs font-black text-[#B8860B] uppercase tracking-wider mt-4">
              — {todayVerse.ref}
            </p>
          </div>

          {/* TARJETA: MENSAJE ESPIRITUAL */}
          <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B] rounded-[28px] p-5 text-white shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <Music size={18} className="text-amber-100" />
              <h2 className="font-black uppercase tracking-wider text-[11px] text-amber-100/90">
                Mensaje espiritual
              </h2>
            </div>
            <p className="mt-4 font-bold text-base leading-snug break-words">
              El que canta con fe, evangeliza con alegría. 🎶
            </p>
            <div className="w-12 h-1 bg-white/30 rounded-full mt-4" />
          </div>

        </div>

        {/* PRÓXIMA ACTIVIDAD */}
        <div className="bg-white rounded-[28px] shadow-xl p-5 border border-gray-100/70 overflow-hidden">
          <div className="flex gap-4 items-start">

            <div className="bg-[#F8F4E9] p-3 rounded-xl text-[#B8860B] shrink-0">
              <CalendarDays size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-black text-[10px] uppercase tracking-wider text-gray-400">
                Próxima actividad académica o litúrgica
              </h2>

              {nextActivity ? (
                <div className="mt-2.5 space-y-1.5">
                  <h3 className="font-black text-base text-gray-800 tracking-tight break-words">
                    {nextActivity.titulo}
                  </h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-1.5">
                      <Clock size={13} className="text-[#B8860B]" />
                      {nextActivity.fecha} • {nextActivity.hora}
                    </p>
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-1.5 break-words">
                      <MapPin size={13} className="text-[#B8860B]" />
                      {nextActivity.lugar}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 font-bold text-xs mt-2">
                  No hay actividades pendientes en la agenda.
                </p>
              )}

            </div>

          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}

export default Dashboard