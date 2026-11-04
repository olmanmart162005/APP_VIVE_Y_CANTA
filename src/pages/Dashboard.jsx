import { useEffect, useState, useMemo } from "react"
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
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"
import Avatar from "react-avatar"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

import BottomNav from "../components/BottomNav"
import { useTheme } from "../context/ThemeContext"
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
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalEgresos, setTotalEgresos] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [financialHistory, setFinancialHistory] = useState([])
  const [activitiesList, setActivitiesList] = useState([])
  const [totalActivitiesCount, setTotalActivitiesCount] = useState(0)
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const verses = [
    { text: "Quien canta, ora dos veces.", ref: "San Agustín" },
    { text: "Canten al Señor un cántico nuevo.", ref: "Salmo 96:1" },
    { text: "Todo lo puedo en Cristo que me fortalece.", ref: "Filipenses 4:13" },
    { text: "Ámense los unos a los otros.", ref: "Juan 13:34" },
    { text: "Alaben a Dios en su santuario; alábenlo con salterio y arpa.", ref: "Salmo 150:1-3" },
  ]

  const todayVerse = verses[new Date().getDate() % verses.length]

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
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .order("fecha", { ascending: false })

      if (error) throw error
      if (!data) return

      const ingresos = data
        .filter((r) => r.tipo === "ingreso")
        .reduce((acc, curr) => acc + Number(curr.monto || 0), 0)

      const gastos = data
        .filter((r) => r.tipo === "gasto")
        .reduce((acc, curr) => acc + Number(curr.monto || 0), 0)

      setTotalIngresos(ingresos)
      setTotalEgresos(gastos)
      setBalance(ingresos - gastos)
      setRecentTransactions(data.slice(0, 5))

      // Group monthly data for Recharts (last 6 months)
      const monthsMap = {}
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

      // Initialize past 6 months
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        monthsMap[key] = {
          name: `${monthNames[d.getMonth()]}`,
          ingresos: 0,
          egresos: 0,
        }
      }

      data.forEach((item) => {
        if (!item.fecha) return
        const key = item.fecha.slice(0, 7) // "YYYY-MM"
        if (monthsMap[key]) {
          if (item.tipo === "ingreso") {
            monthsMap[key].ingresos += Number(item.monto || 0)
          } else if (item.tipo === "gasto") {
            monthsMap[key].egresos += Number(item.monto || 0)
          }
        }
      })

      setFinancialHistory(Object.values(monthsMap))
    } catch (err) {
      console.error("Error loading finance:", err)
    }
  }

  const loadActivities = async () => {
    try {
      const { data, count, error } = await supabase
        .from("activities")
        .select("*", { count: "exact" })
        .order("fecha", { ascending: true })

      if (error) throw error
      setTotalActivitiesCount(count || 0)

      if (data) {
        // filter today or future, limit 3
        const todayStr = new Date().toISOString().slice(0, 10)
        const upcoming = data.filter((a) => a.fecha >= todayStr || a.estado === "pendiente").slice(0, 4)
        setActivitiesList(upcoming.length > 0 ? upcoming : data.slice(0, 3))
      }
    } catch (err) {
      console.error("Error loading activities:", err)
    }
  }

  const loadMembersCount = async () => {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })

      if (error) throw error
      setMembersCount(count || 0)
    } catch (err) {
      console.error("Error loading members count:", err)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        loadUser(),
        loadFinance(),
        loadActivities(),
        loadMembersCount(),
      ])
      setLoading(false)
    }
    init()
  }, [])

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

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString("es-HN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }, [])

  // Chart theme styling tokens
  const chartTextColor = isDark ? "#94A3B8" : "#64748B"
  const chartGridColor = isDark ? "#293548" : "#E2E8F0"
  const chartTooltipBg = isDark ? "#182235" : "#FFFFFF"
  const chartTooltipBorder = isDark ? "#293548" : "#E2E8F0"

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER DE BIENVENIDA EJECUTIVO */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-8 pb-14 relative overflow-hidden shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <p className="header-text-secondary text-[11px] uppercase font-bold tracking-widest block">
              {currentDate}
            </p>
            <h1 className="title-professional title-gold-black text-2xl sm:text-4xl mt-1 tracking-tight break-words">
              ¡Hola, {user?.nombre_completo?.split(" ")[0] || "Bienvenido"}!
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="header-chip text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-xs">
                {getRoleName()}
              </span>
              <span className="header-chip text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-xs">
                Parroquia Nuestro Señor de Esquipulas
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--header-text-secondary)]">
                Estado del Fondo
              </p>
              <p className="text-xl sm:text-2xl font-black text-[var(--header-text-primary)]">
                L {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full p-0.5 bg-black/15 flex items-center justify-center">
              <Avatar
                name={user?.nombre_completo || "Usuario"}
                src={user?.foto}
                size="44"
                round={true}
                color="#1E293B"
                textColor="#D4AF37"
                className="font-bold text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6"
      >
        {/* FILA DE INDICADORES / KPI CARDS */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
        >
          {/* BALANCE GENERAL */}
          <div className="card-premium p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Balance Caja
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center border border-[var(--gold)]/30">
                <DollarSign size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-black text-[var(--gold)] leading-none break-words">
                L {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] mt-2">
                <span className={balance >= 0 ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                  {balance >= 0 ? "+ Fondo Positivo" : "- Déficit"}
                </span>
              </div>
            </div>
          </div>

          {/* INGRESOS TOTALES */}
          <div className="card-premium p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Ingresos
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                <ArrowUpRight size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-black text-emerald-500 leading-none break-words">
                L {totalIngresos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                Recaudado
              </p>
            </div>
          </div>

          {/* EGRESOS TOTALES */}
          <div className="card-premium p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Egresos
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center border border-red-500/30">
                <ArrowDownRight size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-black text-red-500 leading-none break-words">
                L {totalEgresos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                Gastos Totales
              </p>
            </div>
          </div>

          {/* INTEGRANTES */}
          <div className="card-premium p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Integrantes
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Users size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-none">
                {membersCount}
              </p>
              <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-wider">
                Coristas Activos
              </p>
            </div>
          </div>

          {/* ACTIVIDADES PROGRAMADAS */}
          <div className="card-premium p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Actividades
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <CalendarDays size={17} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-none">
                {totalActivitiesCount}
              </p>
              <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                Eventos Litúrgicos
              </p>
            </div>
          </div>
        </motion.div>

        {/* GRÁFICO ESTADÍSTICO DE INGRESOS VS EGRESOS */}
        <motion.div variants={itemVariants} className="card-premium p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-color)] pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--gold)]" />
                <h3 className="title-professional text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  Balance y Rendimiento Financiero
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Comparativa de Ingresos vs. Egresos mensuales en Lempiras (HNL)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-red-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Egresos
              </span>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72">
            {financialHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                Cargando datos estadísticos...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke={chartTextColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: chartGridColor }}
                  />
                  <YAxis
                    stroke={chartTextColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `L ${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      borderColor: chartTooltipBorder,
                      borderRadius: "16px",
                      color: isDark ? "#F1F5F9" : "#0F172A",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    formatter={(value) => [`L ${Number(value).toFixed(2)}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Ingresos"
                    stroke="#22C55E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="egresos"
                    name="Egresos"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorEgresos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* ACCESOS RÁPIDOS ADMINISTRATIVOS */}
        {user && (canManageFinance(user.role) || canManageActivities(user.role) || canManageNotices(user.role) || canManageMembers(user.role) || canManageCantos(user.role)) && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Acciones Rápidas
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {canManageFinance(user.role) && (
                <button
                  onClick={() => navigate("/finance")}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:bg-[var(--bg-muted)] transition-all duration-200 text-center gap-2 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform border border-emerald-500/30">
                    <PlusCircle size={18} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Registrar Pago</span>
                </button>
              )}

              {canManageActivities(user.role) && (
                <button
                  onClick={() => navigate("/activities")}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:bg-[var(--bg-muted)] transition-all duration-200 text-center gap-2 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 flex items-center justify-center text-[var(--gold)] group-hover:scale-105 transition-transform border border-[var(--gold)]/30">
                    <CalendarDays size={18} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Agendar Misa</span>
                </button>
              )}

              {canManageCantos(user.role) && (
                <button
                  onClick={() => navigate("/hojas-cantos")}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:bg-[var(--bg-muted)] transition-all duration-200 text-center gap-2 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform border border-blue-500/30">
                    <Music4 size={18} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Hoja de Cantos</span>
                </button>
              )}

              {canManageNotices(user.role) && (
                <button
                  onClick={() => navigate("/notices")}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:bg-[var(--bg-muted)] transition-all duration-200 text-center gap-2 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform border border-purple-500/30">
                    <FileText size={18} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Publicar Aviso</span>
                </button>
              )}

              {canManageMembers(user.role) && (
                <button
                  onClick={() => navigate("/members")}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:bg-[var(--bg-muted)] transition-all duration-200 text-center gap-2 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform border border-amber-500/30">
                    <UserPlus size={18} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Integrantes</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* DISTRIBUCIÓN EN 2 COLUMNAS EJECUTIVAS: PRÓXIMAS ACTIVIDADES Y ÚLTIMOS MOVIMIENTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PRÓXIMAS ACTIVIDADES */}
          <motion.div variants={itemVariants} className="card-premium p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-[var(--gold)]" />
                  <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">
                    Próximas Actividades Litúrgicas
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/activities")}
                  className="text-xs font-bold text-[var(--gold)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>

              {activitiesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No hay actividades programadas próximamente.
                </div>
              ) : (
                <div className="space-y-3">
                  {activitiesList.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => navigate("/activities")}
                      className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] hover:border-[var(--gold)]/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                            {act.tipo || "Misa"}
                          </span>
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--gold)] transition-colors">
                            {act.titulo}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)] mt-1.5 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-[var(--gold)]" />
                            {act.fecha} • {act.hora}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} className="text-[var(--gold)]" />
                            {act.lugar}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => navigate("/activities")}
                className="w-full btn-secondary py-2 text-xs cursor-pointer"
              >
                Abrir Calendario Completo
              </button>
            </div>
          </motion.div>

          {/* ÚLTIMOS MOVIMIENTOS FINANCIEROS */}
          <motion.div variants={itemVariants} className="card-premium p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  <h3 className="title-professional text-lg font-bold text-[var(--text-primary)]">
                    Últimos Movimientos Financieros
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/finance")}
                  className="text-xs font-bold text-[var(--gold)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Ver libro <ChevronRight size={14} />
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No hay transacciones recientes registradas.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentTransactions.map((tx) => {
                    const isIngreso = tx.tipo === "ingreso"
                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {tx.descripcion || tx.categoria || "Movimiento contable"}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                            {tx.fecha} • {tx.categoria || (isIngreso ? "Aporte" : "Egreso")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-extrabold ${
                              isIngreso ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {isIngreso ? "+" : "-"} L {Number(tx.monto || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {isIngreso ? "Ingreso" : "Egreso"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => navigate("/finance")}
                className="w-full btn-secondary py-2 text-xs cursor-pointer"
              >
                Gestionar Registros Financieros
              </button>
            </div>
          </motion.div>
        </div>

        {/* VERSÍCULO Y MENSAJE ESPIRITUAL */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-5 relative overflow-hidden">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <BookOpen size={18} className="text-[var(--gold)]" />
              <h4 className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-secondary)]">
                Versículo del día
              </h4>
            </div>
            <p className="mt-3 font-semibold italic text-[var(--text-primary)] leading-relaxed text-sm">
              "{todayVerse.text}"
            </p>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-[var(--gold)]">
              — {todayVerse.ref}
            </p>
          </div>

          <div className="card-premium p-5 relative overflow-hidden">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <Music size={18} className="text-[var(--gold)]" />
              <h4 className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-secondary)]">
                Lema del Coro Vive y Canta
              </h4>
            </div>
            <p className="mt-3 text-base font-bold leading-tight text-[var(--text-primary)]">
              “No moriré, sino que viviré y contaré las obras del Señor”
            </p>
            <p className="mt-4 text-xs text-[var(--text-secondary)]">
              Salmo 118:17 • Parroquia Nuestro Señor de Esquipulas
            </p>
          </div>
        </motion.div>
      </motion.div>

      <BottomNav />
    </div>
  )
}

export default Dashboard
