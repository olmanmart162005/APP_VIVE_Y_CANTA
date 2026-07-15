import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CalendarDays,
  DollarSign,
  Users,
  BookOpen,
  Music,
  MapPin,
  Clock,
  PlusCircle,
  FileText,
  UserPlus,
  ArrowRight,
  Music4,
} from "lucide-react"
import { motion } from "framer-motion"
import Avatar from "react-avatar"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"
import {
  canManageActivities,
  canManageFinance,
  canManageNotices,
  canManageMembers,
  canManageCantos,
} from "../services/permissions"

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [nextActivity, setNextActivity] = useState(null)
  const [membersCount, setMembersCount] = useState(0)

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
    try {
      const profile = await getCurrentUser()
      setUser(profile)
    } catch (err) {
      console.error("Error loading user:", err)
    }
  }

  const loadFinance = async () => {
    try {
      const { data, error } = await supabase.from("financial_records").select("*")
      if (error) throw error
      if (!data) return

      const ingresos = data
        .filter((r) => r.tipo === "ingreso")
        .reduce((acc, curr) => acc + Number(curr.monto), 0)

      const gastos = data
        .filter((r) => r.tipo === "gasto")
        .reduce((acc, curr) => acc + Number(curr.monto), 0)

      setBalance(ingresos - gastos)
    } catch (err) {
      console.error("Error loading finance:", err)
    }
  }

  const loadActivity = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("estado", "pendiente")
        .order("fecha", { ascending: true })
        .limit(1)

      if (error) throw error
      if (data?.length) {
        setNextActivity(data[0])
      }
    } catch (err) {
      console.error("Error loading activity:", err)
    }
  }

  const loadMembersCount = async () => {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })

      if (error) throw error
      setMembersCount(count || 0)
    } catch (err) {
      console.error("Error loading members count:", err)
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

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  }

  return (
    <div className="min-h-screen bg-[#0E0C09] pb-32 font-sans antialiased text-[#F5E9C0]">
      {/* HEADER DE BIENVENIDA CON IDENTIDAD PREMIUM */}
      <div className="page-header-gold rounded-b-[45px] px-5 pt-8 pb-12 relative">
        <div className="flex items-center justify-between max-w-4xl mx-auto mt-2">
          <div className="min-w-0 flex-1">
            <p className="header-text-secondary text-[10px] uppercase font-bold tracking-widest block">
              {currentDate}
            </p>
            <h1 className="title-professional title-gold-black text-2xl sm:text-3xl mt-1 tracking-tight break-words">
              ¡Hola, {user?.nombre_completo?.split(" ")[0] || "Bienvenido"}!
            </h1>
            <span className="header-chip inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full mt-2.5 backdrop-blur-xs">
              {getRoleName()}
            </span>
          </div>

          <div className="w-14 h-14 p-0.5 rounded-full bg-gradient-to-tr from-black/20 to-black/40 shadow-md shrink-0 ml-4">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1A1710] p-0.5">
              {user?.foto ? (
                <img src={user.foto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Avatar
                  name={user?.nombre_completo || "Usuario"}
                  size="48"
                  round={true}
                  color="#1A1710"
                  textColor="#D4AF37"
                  className="font-bold"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-4 max-w-4xl mx-auto -mt-6 space-y-5"
      >
        {/* TARJETAS DE MÉTRICAS */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* CAJA GENERAL */}
          <div className="card-premium relative overflow-hidden p-4 min-h-[172px] sm:min-h-[140px] group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-start justify-between gap-3 sm:gap-4 min-w-0">
              <div className="bg-[#221F18] p-3 rounded-2xl text-[#D4AF37] border border-[#D4AF37]/10 shadow-inner shrink-0">
                <DollarSign size={20} />
              </div>
              <div className="text-right min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.3em] text-[#a89060]">Caja</p>
                <p className="text-2xl sm:text-4xl font-black text-[#D4AF37] mt-1 leading-none break-words">L {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#a89060]">Caja General</h3>
              <p className="mt-2 text-sm text-[#F5E9C0]/80">Saldo disponible del fondo administrativo.</p>
            </div>
          </div>

          {/* INTEGRANTES */}
          <div className="card-premium relative overflow-hidden p-4 min-h-[172px] sm:min-h-[140px] group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-start justify-between gap-3 sm:gap-4 min-w-0">
              <div className="bg-[#221F18] p-3 rounded-2xl text-[#D4AF37] border border-[#D4AF37]/10 shadow-inner shrink-0">
                <Users size={20} />
              </div>
              <div className="text-right min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.3em] text-[#a89060]">Miembros</p>
                <p className="text-2xl sm:text-4xl font-black text-[#D4AF37] mt-1 leading-none">{membersCount}</p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#a89060]">Integrantes</h3>
              <p className="mt-2 text-sm text-[#F5E9C0]/80">Total de integrantes activos en el coro.</p>
            </div>
          </div>
        </motion.div>

        {/* ACCESOS RÁPIDOS */}
        {user && (canManageFinance(user.role) || canManageActivities(user.role) || canManageNotices(user.role) || canManageMembers(user.role) || canManageCantos(user.role)) && (
          <motion.div variants={itemVariants} className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase text-[#a89060] tracking-widest pl-1">
              Acceso Rápido Administrativo
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {canManageFinance(user.role) && (
                <button
                  onClick={() => navigate("/finance")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1710] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#221F18] transition-all duration-200 text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                    <PlusCircle size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#F5E9C0]">Registrar Pago</span>
                </button>
              )}

              {canManageActivities(user.role) && (
                <button
                  onClick={() => navigate("/activities")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1710] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#221F18] transition-all duration-200 text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                    <CalendarDays size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#F5E9C0]">Agendar Evento</span>
                </button>
              )}

              {canManageNotices(user.role) && (
                <button
                  onClick={() => navigate("/notices")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1710] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#221F18] transition-all duration-200 text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                    <FileText size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#F5E9C0]">Publicar Aviso</span>
                </button>
              )}

              {canManageCantos(user.role) && (
                <button
                  onClick={() => navigate("/hojas-cantos")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1710] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#221F18] transition-all duration-200 text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                    <Music4 size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#F5E9C0]">Hoja de Cantos</span>
                </button>
              )}

              {canManageMembers(user.role) && (
                <button
                  onClick={() => navigate("/members")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1710] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#221F18] transition-all duration-200 text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                    <UserPlus size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#F5E9C0]">Nuevo Integrante</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* AGENDA Y VERSÍCULO */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* VERSÍCULO DEL DÍA */}
          <div className="card-premium relative overflow-hidden p-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-2.5 text-[#F5E9C0]">
              <BookOpen size={18} className="text-[#D4AF37]" />
              <h2 className="font-bold uppercase tracking-[0.3em] text-[10px] text-[#a89060]">
                Versículo del día
              </h2>
            </div>
            <p className="mt-4 font-semibold italic text-[#F5E9C0] leading-relaxed text-sm">
              "{todayVerse.text}"
            </p>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              — {todayVerse.ref}
            </p>
          </div>

          {/* MENSAJE ESPIRITUAL */}
          <div className="card-premium relative overflow-hidden p-5 border border-[#D4AF37]/10 bg-[#1A1710]">
            <div className="absolute top-0 left-0 w-20 h-20 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5">
              <Music size={18} className="text-[#D4AF37]" />
              <h2 className="font-bold uppercase tracking-[0.3em] text-[10px] text-[#a89060]">
                Mensaje espiritual
              </h2>
            </div>
            <p className="mt-4 text-base font-bold leading-tight text-[#F5E9C0]">
              “Yo, no moriré, sino que viviré y cantaré las obras del Señor”
            </p>
            <div className="mt-5 h-1 w-16 rounded-full bg-[#D4AF37]/40" />
          </div>
        </motion.div>

        {/* PRÓXIMA ACTIVIDAD */}
        <motion.div variants={itemVariants} className="card-premium">
          <div className="flex gap-4 items-start">
            <div className="bg-[#221F18] p-3 rounded-xl text-[#D4AF37] border border-[#D4AF37]/10 shrink-0">
              <CalendarDays size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[10px] uppercase tracking-wider text-[#a89060]">
                Próxima actividad académica o litúrgica
              </h2>

              {nextActivity ? (
                <div className="mt-2.5 space-y-1.5">
                  <h3 className="font-bold text-base text-[#F5E9C0] tracking-tight break-words">
                    {nextActivity.titulo}
                  </h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <p className="text-[#a89060] font-medium text-xs flex items-center gap-1.5">
                      <Clock size={13} className="text-[#D4AF37]" />
                      {nextActivity.fecha} • {nextActivity.hora}
                    </p>
                    <p className="text-[#a89060] font-medium text-xs flex items-center gap-1.5 break-words">
                      <MapPin size={13} className="text-[#D4AF37]" />
                      {nextActivity.lugar}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[#a89060]/50 font-semibold text-xs mt-2">
                  No hay actividades pendientes en la agenda.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate("/activities")}
              className="p-2 bg-[#221F18] hover:bg-[#D4AF37]/10 rounded-full text-[#D4AF37] border border-[#D4AF37]/10 shrink-0 self-center transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>

      <BottomNav />
    </div>
  )
}

export default Dashboard