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

  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)

  // Estado del formulario
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

    if (!error && data) {
      setRecords(data)
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
        .insert([
          {
            ...payload,
            created_by: user?.id,
          },
        ])
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

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", id)

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

  // Paleta exacta solicitada para los tipos
  const getTypeColors = (tipoActividad) => {
    switch (tipoActividad) {
      case "Ensayo":
        return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-500" }
      case "Misa":
        return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", badge: "bg-[#D4AF37]" }
      case "Concierto":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-500" }
      case "Retiro":
        return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-500" }
      case "Reunión":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "bg-green-500" }
      default:
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", badge: "bg-gray-500" }
    }
  }

  const getEstadoBadge = (estadoActividad) => {
    switch (estadoActividad) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 font-semibold border border-yellow-200"
      case "confirmada":
        return "bg-sky-100 text-sky-800 font-semibold border border-sky-200"
      case "realizada":
        return "bg-green-100 text-green-800 font-bold border border-green-200"
      case "cancelada":
        return "bg-red-100 text-red-800 font-medium border border-red-200 line-through text-opacity-60"
      default:
        return "bg-gray-100 text-gray-800"
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
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()
    })
  }, [records, currentMonth])

  const selectedDayActivities = useMemo(() => {
    return records.filter((r) => r.fecha && isSameDay(parseISO(r.fecha), selectedDate))
  }, [records, selectedDate])

  const eventoDestacado = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    return records.find((r) => {
      if (!r.fecha || r.estado === "cancelada" || r.estado === "realizada") return false
      const targetDate = parseISO(r.fecha)
      const diff = differenceInDays(targetDate, hoy)
      return diff >= 0 && diff <= 7
    })
  }, [records])

  const renderTimeBadge = (fechaActividad) => {
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
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

  return (
    <div className="min-h-screen bg-[#F8F4E9] p-4 md:p-8 pb-32 font-sans antialiased text-gray-800">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#B8860B]">♪</span>
            <h1 className="text-3xl font-black text-[#B8860B] tracking-tight">Calendario Coral</h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Gestión y control de eventos para Coro Vive y Canta</p>
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

      {/* EVENTO DESTACADO MENOS DE 7 DIAS */}
      {eventoDestacado && (
        <div className="mt-5 bg-gradient-to-r from-red-600 to-amber-600 rounded-3xl p-5 text-white shadow-xl flex items-center justify-between gap-4 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl hidden sm:inline-block">
              <Sparkles className="text-yellow-200" size={22} />
            </div>
            <div>
              <span className="text-[10px] bg-black/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">🔥 Evento Crítico Cercano</span>
              <h3 className="font-black text-xl mt-1 tracking-tight">{eventoDestacado.titulo}</h3>
              <p className="text-xs text-white/90 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-medium">
                <span className="flex items-center gap-1">📍 {eventoDestacado.lugar}</span>
                <span>•</span>
                <span className="flex items-center gap-1">📅 {format(parseISO(eventoDestacado.fecha), "dd 'de' MMMM", { locale: es })}</span>
              </p>
            </div>
          </div>
          <div className="text-right whitespace-nowrap bg-black/15 p-3 rounded-2xl border border-white/10 min-w-[75px]">
            <span className="text-2xl font-black tracking-tight">
              {differenceInDays(parseISO(eventoDestacado.fecha), new Date() >= parseISO(eventoDestacado.fecha) ? parseISO(eventoDestacado.fecha) : new Date())}
            </span>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/80">Días Faltan</p>
          </div>
        </div>
      )}

      {/* SELECTOR PARA SMARTPHONES */}
      <div className="flex mt-5 bg-white p-1.5 rounded-2xl shadow-xs border border-gray-100 md:hidden">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "calendar" ? "bg-[#B8860B] text-white shadow-xs" : "text-gray-500"}`}
        >
          Vista Calendario
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "agenda" ? "bg-[#B8860B] text-white shadow-xs" : "text-gray-500"}`}
        >
          Vista Agenda
        </button>
      </div>

      {/* FORMULARIO CRUD */}
      {showForm && canManageActivities(user?.role) && (
        <div className="bg-white rounded-[30px] p-6 mt-5 shadow-lg border border-amber-100 max-w-2xl mx-auto transition-all">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
            <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
              <Layers className="text-[#B8860B]" size={20} />
              {editingId ? "Modificar Datos de Actividad" : "Planificar Nueva Actividad"}
            </h2>
            <button onClick={clearForm} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Título de la Actividad *</label>
              <input
                type="text"
                placeholder="Ej: Misa de Pentecostés"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Descripción / Notas</label>
              <textarea
                placeholder="Detalles extras o cantos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm h-24 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Categoría</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-bold text-gray-700"
              >
                <option value="Ensayo">🔵 Ensayo</option>
                <option value="Misa">🔱 Misa</option>
                <option value="Concierto">🔴 Concierto</option>
                <option value="Retiro">🟣 Retiro</option>
                <option value="Reunión">🤝 Reunión</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Estado de Confirmación</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-bold text-gray-700"
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="confirmada">✅ Confirmada</option>
                <option value="realizada">🎉 Realizada</option>
                <option value="cancelada">❌ Cancelada</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Fecha Programada *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium text-gray-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Hora de Convocatoria *</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium text-gray-700"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Lugar Establecido *</label>
              <input
                type="text"
                placeholder="Parroquia, Auditorio..."
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Responsable / Encargado</label>
              <input
                type="text"
                placeholder="Coordinador a cargo..."
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#F8F4E9] border-none outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={clearForm} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-bold transition cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleSave} className="flex-1 bg-[#D4AF37] hover:bg-[#B8860B] text-white py-3.5 rounded-xl text-sm font-bold shadow-md transition cursor-pointer">
              {editingId ? "Actualizar Parámetros" : "Agendar Actividad"}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start">
        
        {/* CALENDARIO MENSUAL VISUAL GRANDE */}
        <div className={`lg:col-span-2 bg-white rounded-[30px] p-4 md:p-6 shadow-xs border border-gray-100 ${activeTab === "calendar" ? "block" : "hidden md:block"}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-800 capitalize flex items-center gap-2 tracking-tight">
              <CalendarIcon className="text-[#B8860B]" size={20} />
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <div className="flex gap-1 bg-[#F8F4E9] p-1 rounded-xl">
              <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition text-gray-600 cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-gray-400 uppercase tracking-wider mb-2">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square bg-gray-50/40 rounded-xl md:rounded-2xl"></div>
            ))}

            {daysInMonth.map((day) => {
              const matches = activitiesThisMonth.filter((r) => isSameDay(parseISO(r.fecha), day))
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
                        ? "bg-amber-50 text-[#B8860B] border-amber-300 font-bold" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-transparent"
                  }`}
                >
                  <span className="text-xs md:text-sm font-bold mt-0.5">{format(day, "d")}</span>
                  
                  <div className="flex flex-wrap gap-0.5 justify-center w-full max-w-full overflow-hidden px-0.5 mb-1">
                    {matches.slice(0, 3).map((act) => (
                      <span 
                        key={act.id} 
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-white" : getTypeColors(act.tipo).badge}`}
                      ></span>
                    ))}
                    {matches.length > 3 && (
                      <span className={`text-[8px] font-black leading-none ${isSelected ? "text-white" : "text-[#B8860B]"}`}>+</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* AGENDA DIARIA EXPANDIDA ABAJO */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-3">
              Eventos para el {format(selectedDate, "dd 'de' MMMM", { locale: es })}
            </h3>

            {selectedDayActivities.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-2xl p-4 text-center border border-dashed border-gray-200">
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
                          <span className={`w-2 h-2 rounded-full ${colors.badge}`}></span>
                          <h4 className={`font-bold text-sm truncate ${colors.text}`}>{act.titulo}</h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {act.hora}</span>
                          <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {act.lugar}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {renderTimeBadge(act.fecha)}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-gray-200 shadow-2xs uppercase">
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

        {/* LISTADO PRÓXIMAS ACTIVIDADES (AGENDA COMPLETA) */}
        <div className={`bg-white rounded-[30px] p-4 md:p-6 shadow-xs border border-gray-100 ${activeTab === "agenda" ? "block" : "hidden lg:block"}`}>
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <CalendarIcon size={14} /> Próximas Actividades
            </h3>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No se registran actividades en el sistema general.
              </div>
            ) : (
              records.map((item) => {
                const colors = getTypeColors(item.tipo)
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivity(item)}
                    className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100 hover:border-amber-200 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${colors.badge}`}></div>
                    
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="font-extrabold text-sm text-gray-800 tracking-tight group-hover:text-[#B8860B] transition-colors line-clamp-1">
                        {item.titulo}
                      </h4>
                      {renderTimeBadge(item.fecha)}
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5 text-gray-800 font-bold">
                        <CalendarIcon size={13} className="text-[#B8860B]" />
                        <span>{format(parseISO(item.fecha + "T00:00:00"), "dd 'de' MMMM", { locale: es })}</span>
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

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{item.tipo}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase ${getEstadoBadge(item.estado)}`}>
                        {item.estado}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ELEGANTE MODAL PREMIUM DE DETALLES */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[30px] p-6 w-full max-w-md shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setSelectedActivity(null)} 
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mb-4">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${getEstadoBadge(selectedActivity.estado)}`}>
                {selectedActivity.estado}
              </span>
              <h3 className="font-black text-xl text-gray-800 tracking-tight mt-2.5">{selectedActivity.titulo}</h3>
              <p className="text-xs text-[#B8860B] font-bold mt-0.5">Categoría: {selectedActivity.tipo}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm text-gray-600 border border-gray-100">
              <div className="flex items-center gap-2.5">
                <CalendarIcon size={16} className="text-[#B8860B]" />
                <span className="font-bold text-gray-700">{format(parseISO(selectedActivity.fecha + "T00:00:00"), "dd 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-gray-400" />
                <span className="font-medium">{selectedActivity.hora}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-gray-400" />
                <span className="font-medium">{selectedActivity.lugar}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={16} className="text-gray-400" />
                <span className="font-medium">Encargado: {selectedActivity.responsable || "Coordinación General"}</span>
              </div>
            </div>

            {selectedActivity.descripcion && (
              <div className="mt-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1"><Info size={12} /> Observaciones Internas</h5>
                <p className="text-xs text-gray-600 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100/40 font-medium">
                  {selectedActivity.descripcion}
                </p>
              </div>
            )}

            {/* ACCIONES CRUD DENTRO DEL MODAL */}
            {canManageActivities(user?.role) && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleEdit(selectedActivity)} 
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer text-center"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(selectedActivity.id)} 
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer text-center"
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