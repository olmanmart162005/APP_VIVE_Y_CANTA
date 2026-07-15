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
  Sparkles,
  Loader2
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
import { toast } from "react-hot-toast"

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
  const [saving, setSaving] = useState(false)

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
    try {
      const profile = await getCurrentUser()
      setUser(profile)
    } catch (err) {
      console.error(err)
    }
  }

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true })

      if (error) throw error
      if (data) setRecords(data)
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar actividades")
    }
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
      toast.error("Por favor completa los campos requeridos: Título, Fecha, Hora y Lugar.")
      return
    }
    setSaving(true)

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

    try {
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

      if (error) throw error
      toast.success(editingId ? "¡Actividad modificada!" : "¡Actividad agendada con éxito!")
      clearForm()
      loadActivities()
    } catch (err) {
      console.error(err)
      toast.error("Error de sincronización al guardar la actividad")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("¿Está seguro de eliminar esta actividad definitivamente?")
    if (!confirmDelete) return

    try {
      const { error } = await supabase.from("activities").delete().eq("id", id)
      if (error) throw error
      toast.success("Actividad eliminada.")
      setSelectedActivity(null)
      loadActivities()
    } catch (err) {
      console.error(err)
      toast.error("Error al intentar eliminar la actividad")
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

  const getTypeColors = (tipoActividad) => {
    switch (tipoActividad) {
      case "Ensayo":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-300",
          border: "border-blue-500/20",
          badge: "bg-blue-500",
        }
      case "Misa":
        return {
          bg: "bg-amber-500/10",
          text: "text-[#D4AF37]",
          border: "border-[#D4AF37]/20",
          badge: "bg-[#D4AF37]",
        }
      case "Concierto":
        return {
          bg: "bg-red-500/10",
          text: "text-red-300",
          border: "border-red-500/20",
          badge: "bg-red-500",
        }
      case "Retiro":
        return {
          bg: "bg-purple-500/10",
          text: "text-purple-300",
          border: "border-purple-500/20",
          badge: "bg-purple-500",
        }
      case "Reunión":
        return {
          bg: "bg-green-500/10",
          text: "text-green-300",
          border: "border-green-500/20",
          badge: "bg-green-500",
        }
      default:
        return {
          bg: "bg-white/5",
          text: "text-gray-300",
          border: "border-white/10",
          badge: "bg-gray-500",
        }
    }
  }

  const getEstadoBadge = (estadoActividad) => {
    switch (estadoActividad) {
      case "pendiente":
        return "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
      case "confirmada":
        return "bg-sky-500/10 text-sky-300 border border-sky-500/20"
      case "realizada":
        return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold"
      case "cancelada":
        return "bg-red-500/10 text-red-300 border border-red-500/20 line-through"
      default:
        return "bg-white/10 text-gray-300"
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
        <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
          <Flame size={10} /> Hoy
        </span>
      )
    }
    const diff = differenceInDays(target, hoy)
    if (diff > 0 && diff <= 3) {
      return (
        <span className="flex items-center gap-1 bg-amber-500 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
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

  const inputCls = "input-premium"
  const selectCls = "input-premium"

  return (
    <div className="min-h-screen bg-[#0E0C09] p-4 md:p-8 pb-32 font-sans antialiased text-[#F5E9C0]">
      {/* HEADER */}
      <div className="page-header-gold flex flex-col sm:flex-row sm:justify-between sm:items-start rounded-3xl px-4 py-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl header-text-primary">♪</span>
            <h1 className="title-professional title-gold-black text-3xl tracking-tight">Calendario Coral</h1>
          </div>
          <p className="header-text-secondary text-sm mt-0.5">
            Gestión y control de eventos para Coro Vive y Canta
          </p>
        </div>

        {canManageActivities(user?.role) && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary w-full sm:w-auto"
          >
            <PlusCircle size={18} />
            Agendar Actividad
          </button>
        )}
      </div>

      {/* EVENTO DESTACADO */}
      {eventoDestacado && (
        <div className="mt-5 bg-gradient-to-r from-red-700 to-amber-600 rounded-3xl p-5 text-black shadow-xl flex items-center justify-between gap-4 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl hidden sm:inline-block">
              <Sparkles className="text-yellow-200" size={22} />
            </div>
            <div>
              <span className="text-[9px] bg-black/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest text-black">
                🔥 Evento Crítico Cercano
              </span>
              <h3 className="font-black text-xl mt-1 tracking-tight text-black">{eventoDestacado.titulo}</h3>
              <p className="text-xs text-black/80 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-semibold">
                <span className="flex items-center gap-1">📍 {eventoDestacado.lugar}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  📅 {format(parseISO(eventoDestacado.fecha), "dd 'de' MMMM", { locale: es })}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right whitespace-nowrap bg-black/10 p-3 rounded-2xl border border-black/10 min-w-[75px]">
            <span className="text-2xl font-black tracking-tight text-black">
              {differenceInDays(
                parseISO(eventoDestacado.fecha),
                new Date() >= parseISO(eventoDestacado.fecha)
                  ? parseISO(eventoDestacado.fecha)
                  : new Date()
              )}
            </span>
            <p className="text-[9px] font-black uppercase tracking-wider text-black/70">Días Faltan</p>
          </div>
        </div>
      )}

      {/* SELECTOR MOBILE */}
      <div className="flex mt-5 bg-[#1A1710] p-1.5 rounded-2xl border border-[#D4AF37]/15 md:hidden">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "calendar"
              ? "bg-[#D4AF37] text-black shadow-md"
              : "text-[#a89060]/60"
          }`}
        >
          Vista Calendario
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "agenda"
              ? "bg-[#D4AF37] text-black shadow-md"
              : "text-[#a89060]/60"
          }`}
        >
          Vista Agenda
        </button>
      </div>

      {/* FORMULARIO CRUD */}
      {showForm && canManageActivities(user?.role) && (
        <div className="bg-[#1A1710] rounded-[30px] p-6 mt-5 shadow-2xl border border-[#D4AF37]/15 max-w-2xl mx-auto transition-all">
          <div className="flex justify-between items-center mb-5 border-b border-[#D4AF37]/10 pb-3">
            <h2 className="font-extrabold text-[#F5E9C0] text-lg flex items-center gap-2">
              <Layers className="text-[#D4AF37]" size={20} />
              {editingId ? "Modificar Datos de Actividad" : "Planificar Nueva Actividad"}
            </h2>
            <button
              onClick={clearForm}
              className="p-2 hover:bg-[#221F18] rounded-full text-[#a89060] transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
                Descripción / Notas
              </label>
              <textarea
                placeholder="Detalles extras o cantos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={`${inputCls} h-24 py-3 resize-none`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              <label className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider block ml-1 mb-1.5">
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
              className="btn-secondary flex-1 py-3.5 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 py-3.5 text-xs font-bold cursor-pointer"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              ) : editingId ? (
                "Actualizar Actividad"
              ) : (
                "Agendar Actividad"
              )}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
        {/* CALENDARIO MENSUAL */}
        <div
          className={`lg:col-span-2 bg-[#1A1710] rounded-[30px] p-4 md:p-6 border border-[#D4AF37]/10 shadow-2xl ${
            activeTab === "calendar" ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#F5E9C0] capitalize flex items-center gap-2 tracking-tight">
              <CalendarIcon className="text-[#D4AF37]" size={20} />
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <div className="flex gap-1 bg-[#221F18] border border-[#D4AF37]/15 p-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-[#1A1710] rounded-lg transition text-[#a89060] cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-[#1A1710] rounded-lg transition text-[#a89060] cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#a89060]/75 uppercase tracking-wider mb-2">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="aspect-square bg-[#221F18]/20 rounded-xl md:rounded-2xl"
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
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md scale-102"
                      : isTodayDay
                        ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40 font-bold"
                        : "bg-[#221F18] text-[#F5E9C0] hover:bg-[#221F18]/80 border-transparent"
                  }`}
                >
                  <span className="text-xs md:text-sm font-bold mt-0.5">{format(day, "d")}</span>
                  <div className="flex flex-wrap gap-0.5 justify-center w-full max-w-full overflow-hidden px-0.5 mb-1">
                    {matches.slice(0, 3).map((act) => (
                      <span
                        key={act.id}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-black" : getTypeColors(act.tipo).badge}`}
                      />
                    ))}
                    {matches.length > 3 && (
                      <span className={`text-[8px] font-black leading-none ${isSelected ? "text-black" : "text-[#D4AF37]"}`}>+</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* AGENDA DIARIA */}
          <div className="mt-6 border-t border-[#D4AF37]/10 pt-5">
            <h3 className="text-xs font-bold uppercase text-[#a89060] tracking-wider mb-3">
              Eventos para el {format(selectedDate, "dd 'de' MMMM", { locale: es })}
            </h3>

            {selectedDayActivities.length === 0 ? (
              <p className="text-xs text-[#a89060]/50 bg-[#221F18]/30 rounded-2xl p-4 text-center border border-dashed border-[#D4AF37]/10">
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
                        <p className="text-xs text-[#a89060]/60 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {act.hora}</span>
                          <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {act.lugar}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {renderTimeBadge(act.fecha)}
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1A1710] border border-[#D4AF37]/15 shadow-2xs uppercase text-[#a89060]">
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
          className={`bg-[#1A1710] rounded-[30px] p-4 md:p-6 border border-[#D4AF37]/10 shadow-2xl ${
            activeTab === "agenda" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Tabs de filtro */}
          <div className="flex bg-[#221F18] border border-[#D4AF37]/15 p-1 rounded-xl mb-4 gap-1">
            {agendaTabs.map(({ key, label }) => {
              const count = getFilteredRecords(key).length
              return (
                <button
                  key={key}
                  onClick={() => setAgendaFilter(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    agendaFilter === key
                      ? "bg-[#D4AF37] text-black shadow-md"
                      : "text-[#a89060]/60 hover:text-[#F5E9C0]"
                  }`}
                >
                  {label}
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      agendaFilter === key
                        ? "bg-black/20 text-black"
                        : "bg-[#1A1710] text-[#a89060]/50"
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
              <div className="text-center py-8 text-[#a89060]/40 text-sm">
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
                        ? "bg-amber-500/5 border-amber-500/15 hover:border-amber-500/35"
                        : "bg-[#221F18]/50 border-[#D4AF37]/10 hover:border-[#D4AF37]/30"
                    }`}
                  >
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl ${
                        vencida ? "bg-amber-400" : colors.badge
                      }`}
                    />

                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4
                        className={`font-bold text-sm tracking-tight line-clamp-1 transition-colors ${
                          vencida
                            ? "text-amber-300 group-hover:text-amber-200"
                            : "text-[#F5E9C0] group-hover:text-[#D4AF37]"
                        }`}
                      >
                        {item.titulo}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vencida ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                            Vencida
                          </span>
                        ) : (
                          renderTimeBadge(item.fecha)
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-xs text-[#a89060]/60 font-medium">
                      <div className="flex items-center gap-1.5 text-[#F5E9C0]/85 font-bold">
                        <CalendarIcon size={13} className={vencida ? "text-amber-500" : "text-[#D4AF37]"} />
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

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-[#D4AF37]/10">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#a89060]/40">
                        {item.tipo}
                      </span>
                      <div className="flex items-center gap-2">
                        {vencida && canManageActivities(user?.role) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const { error } = await supabase
                                  .from("activities")
                                  .update({ estado: "realizada" })
                                  .eq("id", item.id)
                                if (error) throw error
                                toast.success("¡Actividad marcada como realizada!")
                                loadActivities()
                              } catch (err) {
                                console.error(err)
                                toast.error("Error al actualizar estado")
                              }
                            }}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 transition cursor-pointer uppercase"
                          >
                            ✓ Realizada
                          </button>
                        )}
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full uppercase ${getEstadoBadge(item.estado)}`}>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1710] border border-[#D4AF37]/20 rounded-[30px] p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setSelectedActivity(null)}
              className="absolute top-4 right-4 p-2 hover:bg-[#221F18] rounded-full text-[#a89060] transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getEstadoBadge(selectedActivity.estado)}`}>
                  {selectedActivity.estado}
                </span>
                {isVencida(selectedActivity) && (
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Vencida
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-xl text-[#F5E9C0] tracking-tight mt-2.5">
                {selectedActivity.titulo}
              </h3>
              <p className="text-xs text-[#D4AF37] font-bold mt-0.5">Categoría: {selectedActivity.tipo}</p>
            </div>

            <div className="bg-[#221F18] border border-[#D4AF37]/15 rounded-2xl p-4 space-y-3 text-sm text-[#F5E9C0]/70">
              <div className="flex items-center gap-2.5">
                <CalendarIcon size={16} className="text-[#D4AF37]" />
                <span className="font-bold text-[#F5E9C0]">
                  {format(parseISO(selectedActivity.fecha + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-[#a89060]/50" />
                <span className="font-medium">{selectedActivity.hora}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-[#a89060]/50" />
                <span className="font-medium truncate">{selectedActivity.lugar}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={16} className="text-[#a89060]/50" />
                <span className="font-medium">
                  Encargado: {selectedActivity.responsable || "Coordinación General"}
                </span>
              </div>
            </div>

            {selectedActivity.descripcion && (
              <div className="mt-4">
                <h5 className="text-[10px] font-bold text-[#a89060] uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Info size={12} /> Observaciones Internas
                </h5>
                <p className="text-xs text-[#F5E9C0]/80 leading-relaxed bg-[#221F18]/50 p-3 rounded-xl border border-[#D4AF37]/10 font-medium">
                  {selectedActivity.descripcion}
                </p>
              </div>
            )}

            {canManageActivities(user?.role) && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-[#D4AF37]/15">
                {isVencida(selectedActivity) && (
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from("activities")
                          .update({ estado: "realizada" })
                          .eq("id", selectedActivity.id)
                        if (error) throw error
                        toast.success("¡Actividad realizada!")
                        setSelectedActivity(null)
                        loadActivities()
                      } catch (err) {
                        console.error(err)
                        toast.error("Error al actualizar la actividad")
                      }
                    }}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    ✓ Realizada
                  </button>
                )}
                <button
                  onClick={() => handleEdit(selectedActivity)}
                  className="btn-secondary flex-1 py-2 text-xs text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/25 transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(selectedActivity.id)}
                  className="btn-secondary flex-1 py-2 text-xs text-red-450 bg-red-500/10 border-red-500/20 hover:bg-red-500/25 transition-all"
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