import { useEffect, useMemo, useState } from "react"
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Flame,
  Info,
  X,
  Layers,
  Sparkles
} from "lucide-react"

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  differenceInDays
} from "date-fns"
import { es } from "date-fns/locale"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageActivities } from "../services/permissions"
import { supabase } from "../lib/supabase"

function Activities() {
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState("calendar")
  const [agendaFilter, setAgendaFilter] = useState("proximas")

  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)

  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [tipo, setTipo] = useState("Ensayo")
  const [lugar, setLugar] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [responsable, setResponsable] = useState("")
  const [estado, setEstado] = useState("pendiente")

  useEffect(() => {
    loadUser()
    loadActivities()
  }, [])

  const loadUser = async () => {
    const profile = await getCurrentUser()
    setUser(profile)
  }

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })

    if (!error && data) setRecords(data)
  }

  const clearForm = () => {
    setTitulo("")
    setDescripcion("")
    setTipo("Ensayo")
    setLugar("")
    setFecha("")
    setHora("")
    setResponsable("")
    setEstado("pendiente")
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!titulo.trim() || !fecha || !hora || !lugar.trim()) {
      return alert("Por favor complete los campos obligatorios: Título, Fecha, Hora y Lugar.")
    }

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo,
      lugar: lugar.trim(),
      fecha,
      hora,
      responsable: responsable.trim(),
      estado,
    }

    let error = null

    if (editingId) {
      const { error: updateError } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from("activities")
        .insert([{ ...payload, created_by: user?.id }])
      error = insertError
    }

    if (error) {
      console.error(error)
      return alert("Error de sincronización al guardar la actividad.")
    }

    alert(editingId ? "¡Actividad modificada!" : "¡Actividad agendada con éxito!")
    clearForm()
    loadActivities()
  }

  const handleDelete = async (id) => {
    const confirmDelete = confirm("¿Está seguro de eliminar esta actividad definitivamente?")
    if (!confirmDelete) return

    const { error } = await supabase.from("activities").delete().eq("id", id)

    if (!error) {
      setSelectedActivity(null)
      loadActivities()
    } else {
      alert("Error al intentar eliminar la actividad.")
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setTitulo(item.titulo)
    setDescripcion(item.descripcion || "")
    setTipo(item.tipo)
    setLugar(item.lugar)
    setFecha(item.fecha)
    setHora(item.hora)
    setResponsable(item.responsable || "")
    setEstado(item.estado)
    setSelectedActivity(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const isVencida = (item) => {
    if (item.estado === "realizada" || item.estado === "cancelada") return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return parseISO(item.fecha) < hoy
  }

  // ✅ COLORES CON DARK MODE — premium negro/dorado
  const getTypeColors = (tipoActividad) => {
    switch (tipoActividad) {
      case "Ensayo":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/40",
          text: "text-blue-700 dark:text-blue-300",
          border: "border-blue-200 dark:border-blue-800/60",
          badge: "bg-blue-500",
        }
      case "Misa":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40",
          text: "text-amber-800 dark:text-amber-300",
          border: "border-amber-200 dark:border-amber-700/50",
          badge: "bg-[#D4AF37]",
        }
      case "Concierto":
        return {
          bg: "bg-red-50 dark:bg-red-950/40",
          text: "text-red-700 dark:text-red-300",
          border: "border-red-200 dark:border-red-800/60",
          badge: "bg-red-500",
        }
      case "Retiro":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/40",
          text: "text-purple-700 dark:text-purple-300",
          border: "border-purple-200 dark:border-purple-800/60",
          badge: "bg-purple-500",
        }
      case "Reunión":
        return {
          bg: "bg-green-50 dark:bg-green-950/40",
          text: "text-green-700 dark:text-green-300",
          border: "border-green-200 dark:border-green-800/60",
          badge: "bg-green-500",
        }
      default:
        return {
          bg: "bg-gray-50 dark:bg-white/5",
          text: "text-gray-700 dark:text-gray-300",
          border: "border-gray-200 dark:border-white/10",
          badge: "bg-gray-500",
        }
    }
  }

  const getEstadoBadge = (estadoActividad) => {
    switch (estadoActividad) {
      case "pendiente":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-semibold border border-yellow-200 dark:border-yellow-700/50"
      case "confirmada":
        return "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-700/50"
      case "realizada":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold border border-green-200 dark:border-green-700/50"
      case "cancelada":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-medium border border-red-200 dark:border-red-700/50 line-through"
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-300"
    }
  }

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const activitiesThisMonth = useMemo(() => {
    return records.filter((r) => {
      if (!r.fecha) return false
      const d = parseISO(r.fecha)
      return (
        d.getMonth() === currentMonth.getMonth() &&
        d.getFullYear() === currentMonth.getFullYear()
      )
    })
  }, [records, currentMonth])

  const selectedDayActivities = useMemo(() => {
    return records.filter(
      (r) => r.fecha && isSameDay(parseISO(r.fecha), selectedDate)
    )
  }, [records, selectedDate])

  const eventoDestacado = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return records.find((r) => {
      if (!r.fecha || r.estado === "cancelada" || r.estado === "realizada") return false
      const targetDate = parseISO(r.fecha)
      const diff = differenceInDays(targetDate, hoy)
      return diff >= 0 && diff <= 7
    })
  }, [records])

  const renderTimeBadge = (fechaActividad) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const target = parseISO(fechaActividad)

    if (isSameDay(target, hoy)) {
      return (
        <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
          <Flame size={10} /> Hoy
        </span>
      )
    }
    const diff = differenceInDays(target, hoy)
    if (diff > 0 && diff <= 3) {
      return (
        <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          <AlertTriangle size={10} /> Próximo
        </span>
      )
    }
    return null
  }

  const agendaTabs = [
    { key: "proximas", label: "Próximas" },
    { key: "realizadas", label: "Realizadas" },
    { key: "todas", label: "Todas" },
  ]

  const getFilteredRecords = (filterKey) => {
    return records.filter((item) => {
      if (filterKey === "proximas")
        return !isVencida(item) && item.estado !== "realizada" && item.estado !== "cancelada"
      if (filterKey === "realizadas")
        return item.estado === "realizada" || isVencida(item)
      return true
    })
  }

  const filteredRecords = useMemo(
    () => getFilteredRecords(agendaFilter),
    [records, agendaFilter]
  )

  // ✅ CLASES REUTILIZABLES DARK MODE
  const inputCls =
    "w-full p-3.5 rounded-xl bg-[#F8F4E9] dark:bg-white/5 dark:text-[#F5E9C0] dark:placeholder-white/30 border-none outline-none text-sm font-medium text-gray-700"

  const selectCls =
    "w-full p-3.5 rounded-xl bg-[#F8F4E9] dark:bg-white/5 dark:text-[#F5E9C0] border-none outline-none text-sm font-bold text-gray-700"

  return (
    <div className="min-h-screen bg-[#F8F4E9] dark:bg-[#16120D] p-4 md:p-8 pb-32 font-sans antialiased text-gray-800 dark:text-[#F5E9C0]">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-gray-200 dark:border-[rgba(212,175,55,0.15)] pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#B8860B]">♪</span>
            <h1 className="text-3xl font-black text-[#B8860B] tracking-tight">Calendario Coral</h1>
          </div>
          <p className="text-gray-500 dark:text-[#F5E9C0]/50 text-sm mt-0.5">
            Gestión y control de eventos para Coro Vive y Canta
          </p>
        </div>

        {canManageActivities(user?.role) && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white px-5 py-3 rounded-2xl font-bold shadow-md transition w-full sm:w-auto text-sm cursor-pointer"
          >
            <PlusCircle size={18} />
            Agendar Actividad
          </button>
        )}
      </div>

      {/* EVENTO DESTACADO */}
      {eventoDestacado && (
        <div className="mt-5 bg-gradient-to-r from-red-600 to-amber-600 rounded-3xl p-5 text-white shadow-xl flex items-center justify-between gap-4 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl hidden sm:inline-block">
              <Sparkles className="text-yellow-200" size={22} />
            </div>
            <div>
              <span className="text-[10px] bg-black/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                🔥 Evento Crítico Cercano
              </span>
              <h3 className="font-black text-xl mt-1 tracking-tight">{eventoDestacado.titulo}</h3>
              <p className="text-xs text-white/90 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-medium">
                <span className="flex items-center gap-1">📍 {eventoDestacado.lugar}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  📅 {format(parseISO(eventoDestacado.fecha), "dd 'de' MMMM", { locale: es })}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right whitespace-nowrap bg-black/15 p-3 rounded-2xl border border-white/10 min-w-[75px]">
            <span className="text-2xl font-black tracking-tight">
              {differenceInDays(
                parseISO(eventoDestacado.fecha),
                new Date() >= parseISO(eventoDestacado.fecha)
                  ? parseISO(eventoDestacado.fecha)
                  : new Date()
              )}
            </span>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/80">Días Faltan</p>
          </div>
        </div>
      )}

      {/* SELECTOR MOBILE */}
      <div className="flex mt-5 bg-white dark:bg-white/5 p-1.5 rounded-2xl shadow-xs border border-gray-100 dark:border-[rgba(212,175,55,0.10)] md:hidden">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "calendar"
              ? "bg-[#B8860B] text-white shadow-xs"
              : "text-gray-500 dark:text-[#F5E9C0]/50"
          }`}
        >
          Vista Calendario
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "agenda"
              ? "bg-[#B8860B] text-white shadow-xs"
              : "text-gray-500 dark:text-[#F5E9C0]/50"
          }`}
        >
          Vista Agenda
        </button>
      </div>

      {/* FORMULARIO CRUD */}
      {showForm && canManageActivities(user?.role) && (
        <div className="bg-white dark:bg-[#1E1A12] rounded-[30px] p-6 mt-5 shadow-lg border border-amber-100 dark:border-[rgba(212,175,55,0.12)] max-w-2xl mx-auto transition-all">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-white/10 pb-3">
            <h2 className="font-black text-gray-800 dark:text-[#F5E9C0] text-lg flex items-center gap-2">
              <Layers className="text-[#B8860B]" size={20} />
              {editingId ? "Modificar Datos de Actividad" : "Planificar Nueva Actividad"}
            </h2>
            <button
              onClick={clearForm}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-[#F5E9C0]/40 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Título de la Actividad *
              </label>
              <input
                type="text"
                placeholder="Ej: Misa de Pentecostés"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Descripción / Notas
              </label>
              <textarea
                placeholder="Detalles extras o cantos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={`${inputCls} h-24 resize-none`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Categoría
              </label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
                <option value="Ensayo">🔵 Ensayo</option>
                <option value="Misa">🔱 Misa</option>
                <option value="Concierto">🔴 Concierto</option>
                <option value="Retiro">🟣 Retiro</option>
                <option value="Reunión">🤝 Reunión</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Estado de Confirmación
              </label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
                <option value="pendiente">⏳ Pendiente</option>
                <option value="confirmada">✅ Confirmada</option>
                <option value="realizada">🎉 Realizada</option>
                <option value="cancelada">❌ Cancelada</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Fecha Programada *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Hora de Convocatoria *
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Lugar Establecido *
              </label>
              <input
                type="text"
                placeholder="Parroquia, Auditorio..."
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase block mb-1">
                Responsable / Encargado
              </label>
              <input
                type="text"
                placeholder="Coordinador a cargo..."
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={clearForm}
              className="flex-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-[#F5E9C0]/70 py-3.5 rounded-xl text-sm font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-[#D4AF37] hover:bg-[#B8860B] text-white py-3.5 rounded-xl text-sm font-bold shadow-md transition cursor-pointer"
            >
              {editingId ? "Actualizar Parámetros" : "Agendar Actividad"}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">

        {/* CALENDARIO MENSUAL */}
        <div
          className={`lg:col-span-2 bg-white dark:bg-[#1E1A12] rounded-[30px] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[rgba(212,175,55,0.10)] ${
            activeTab === "calendar" ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-800 dark:text-[#F5E9C0] capitalize flex items-center gap-2 tracking-tight">
              <CalendarIcon className="text-[#B8860B]" size={20} />
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <div className="flex gap-1 bg-[#F8F4E9] dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition text-gray-600 dark:text-[#F5E9C0]/60 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition text-gray-600 dark:text-[#F5E9C0]/60 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-gray-400 dark:text-[#F5E9C0]/40 uppercase tracking-wider mb-2">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="aspect-square bg-gray-50/40 dark:bg-white/[0.02] rounded-xl md:rounded-2xl"
              />
            ))}

            {daysInMonth.map((day) => {
              const matches = activitiesThisMonth.filter((r) =>
                isSameDay(parseISO(r.fecha), day)
              )
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDay = isToday(day)

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-xl md:rounded-2xl p-1 flex flex-col justify-between items-center relative transition border cursor-pointer group ${
                    isSelected
                      ? "bg-[#B8860B] text-white border-[#B8860B] shadow-md scale-102"
                      : isTodayDay
                        ? "bg-amber-50 dark:bg-amber-900/30 text-[#B8860B] border-amber-300 dark:border-amber-600/40 font-bold"
                        : "bg-gray-50 dark:bg-white/[0.04] text-gray-700 dark:text-[#F5E9C0]/70 hover:bg-gray-100 dark:hover:bg-white/[0.08] border-transparent"
                  }`}
                >
                  <span className="text-xs md:text-sm font-bold mt-0.5">{format(day, "d")}</span>
                  <div className="flex flex-wrap gap-0.5 justify-center w-full max-w-full overflow-hidden px-0.5 mb-1">
                    {matches.slice(0, 3).map((act) => (
                      <span
                        key={act.id}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : getTypeColors(act.tipo).badge}`}
                      />
                    ))}
                    {matches.length > 3 && (
                      <span className={`text-[8px] font-black leading-none ${isSelected ? "text-white" : "text-[#B8860B]"}`}>+</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* AGENDA DIARIA */}
          <div className="mt-6 border-t border-gray-100 dark:border-white/10 pt-5">
            <h3 className="text-xs font-black uppercase text-gray-400 dark:text-[#F5E9C0]/40 tracking-wider mb-3">
              Eventos para el {format(selectedDate, "dd 'de' MMMM", { locale: es })}
            </h3>

            {selectedDayActivities.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#F5E9C0]/30 bg-gray-50 dark:bg-white/[0.03] rounded-2xl p-4 text-center border border-dashed border-gray-200 dark:border-white/10">
                No hay actividades programadas para esta fecha.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedDayActivities.map((act) => {
                  const colors = getTypeColors(act.tipo)
                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivity(act)}
                      className={`p-3.5 rounded-2xl border ${colors.bg} ${colors.border} cursor-pointer hover:shadow-xs transition-all flex justify-between items-center`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors.badge}`} />
                          <h4 className={`font-bold text-sm truncate ${colors.text}`}>{act.titulo}</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#F5E9C0]/40 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {act.hora}</span>
                          <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {act.lugar}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {renderTimeBadge(act.fecha)}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/10 shadow-2xs uppercase dark:text-[#F5E9C0]/70">
                          {act.tipo}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL AGENDA */}
        <div
          className={`bg-white dark:bg-[#1E1A12] rounded-[30px] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[rgba(212,175,55,0.10)] ${
            activeTab === "agenda" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Tabs de filtro */}
          <div className="flex bg-[#F8F4E9] dark:bg-white/5 p-1 rounded-xl mb-4 gap-1">
            {agendaTabs.map(({ key, label }) => {
              const count = getFilteredRecords(key).length
              return (
                <button
                  key={key}
                  onClick={() => setAgendaFilter(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    agendaFilter === key
                      ? "bg-[#B8860B] text-white shadow-xs"
                      : "text-gray-500 dark:text-[#F5E9C0]/40 hover:text-gray-700 dark:hover:text-[#F5E9C0]/70"
                  }`}
                >
                  {label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none ${
                      agendaFilter === key
                        ? "bg-white/25 text-white"
                        : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-[#F5E9C0]/40"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-[#F5E9C0]/30 text-sm">
                No hay actividades en esta categoría.
              </div>
            ) : (
              filteredRecords.map((item) => {
                const colors = getTypeColors(item.tipo)
                const vencida = isVencida(item)
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivity(item)}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden group ${
                      vencida
                        ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-700/30 hover:border-amber-300 dark:hover:border-amber-600/50"
                        : "bg-gray-50/60 dark:bg-white/[0.03] border-gray-100 dark:border-white/[0.06] hover:border-amber-200 dark:hover:border-[rgba(212,175,55,0.25)]"
                    }`}
                  >
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl ${
                        vencida ? "bg-amber-400" : colors.badge
                      }`}
                    />

                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4
                        className={`font-extrabold text-sm tracking-tight line-clamp-1 transition-colors ${
                          vencida
                            ? "text-amber-800 dark:text-amber-300 group-hover:text-amber-900 dark:group-hover:text-amber-200"
                            : "text-gray-800 dark:text-[#F5E9C0] group-hover:text-[#B8860B]"
                        }`}
                      >
                        {item.titulo}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vencida ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 uppercase">
                            Vencida
                          </span>
                        ) : (
                          renderTimeBadge(item.fecha)
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 dark:text-[#F5E9C0]/40 font-medium">
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-[#F5E9C0]/80 font-bold">
                        <CalendarIcon size={13} className={vencida ? "text-amber-600" : "text-[#B8860B]"} />
                        <span>
                          {format(parseISO(item.fecha + "T00:00:00"), "dd 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>{item.hora}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">{item.lugar}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100 dark:border-white/[0.06]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-[#F5E9C0]/30">
                        {item.tipo}
                      </span>
                      <div className="flex items-center gap-2">
                        {vencida && canManageActivities(user?.role) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await supabase
                                .from("activities")
                                .update({ estado: "realizada" })
                                .eq("id", item.id)
                              loadActivities()
                            }}
                            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700/50 hover:bg-green-200 dark:hover:bg-green-800/50 transition cursor-pointer uppercase"
                          >
                            ✓ Marcar realizada
                          </button>
                        )}
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase ${getEstadoBadge(item.estado)}`}>
                          {item.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1A12] rounded-[30px] p-6 w-full max-w-md shadow-2xl relative border border-gray-100 dark:border-[rgba(212,175,55,0.15)]">
            <button
              onClick={() => setSelectedActivity(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-[#F5E9C0]/40 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${getEstadoBadge(selectedActivity.estado)}`}>
                  {selectedActivity.estado}
                </span>
                {isVencida(selectedActivity) && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                    Vencida
                  </span>
                )}
              </div>
              <h3 className="font-black text-xl text-gray-800 dark:text-[#F5E9C0] tracking-tight mt-2.5">
                {selectedActivity.titulo}
              </h3>
              <p className="text-xs text-[#B8860B] font-bold mt-0.5">Categoría: {selectedActivity.tipo}</p>
            </div>

            <div className="bg-gray-50 dark:bg-white/[0.04] rounded-2xl p-4 space-y-3 text-sm text-gray-600 dark:text-[#F5E9C0]/60 border border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <CalendarIcon size={16} className="text-[#B8860B]" />
                <span className="font-bold text-gray-700 dark:text-[#F5E9C0]/90">
                  {format(parseISO(selectedActivity.fecha + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-gray-400 dark:text-[#F5E9C0]/30" />
                <span className="font-medium">{selectedActivity.hora}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-gray-400 dark:text-[#F5E9C0]/30" />
                <span className="font-medium">{selectedActivity.lugar}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={16} className="text-gray-400 dark:text-[#F5E9C0]/30" />
                <span className="font-medium">
                  Encargado: {selectedActivity.responsable || "Coordinación General"}
                </span>
              </div>
            </div>

            {selectedActivity.descripcion && (
              <div className="mt-4">
                <h5 className="text-xs font-bold text-gray-400 dark:text-[#F5E9C0]/40 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Info size={12} /> Observaciones Internas
                </h5>
                <p className="text-xs text-gray-600 dark:text-[#F5E9C0]/60 leading-relaxed bg-amber-50/50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100/40 dark:border-amber-700/20 font-medium">
                  {selectedActivity.descripcion}
                </p>
              </div>
            )}

            {canManageActivities(user?.role) && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-white/10">
                {isVencida(selectedActivity) && (
                  <button
                    onClick={async () => {
                      await supabase
                        .from("activities")
                        .update({ estado: "realizada" })
                        .eq("id", selectedActivity.id)
                      setSelectedActivity(null)
                      loadActivities()
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors cursor-pointer text-center"
                  >
                    ✓ Marcar Realizada
                  </button>
                )}
                <button
                  onClick={() => handleEdit(selectedActivity)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer text-center"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(selectedActivity.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors cursor-pointer text-center"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Activities