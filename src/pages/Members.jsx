import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"
import {
  Search,
  ChevronRight,
  Users,
  X,
  Phone,
  MessageCircle,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Heart
} from "lucide-react"

import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"

function Members() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState("")

  // Estado del modal de perfil rápido
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("nombre_completo", { ascending: true })

    if (error) {
      console.error(error)
      return
    }
    setMembers(data || [])
  }

  // Formateo estético de Roles
  const getRoleName = (role) => {
    switch (role) {
      case "admin": return "Administrador"
      case "director": return "Director"
      case "secretaria": return "Secretaria"
      case "tesorero": return "Tesorero"
      default: return "Integrante"
    }
  }

  // Cálculos Automáticos de Fechas (Edad y Antigüedad)
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null
    const hoy = new Date()
    const cumple = new Date(fechaNac)
    let edad = hoy.getFullYear() - cumple.getFullYear()
    const m = hoy.getMonth() - cumple.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--
    }
    return edad
  }

  const calcularAntiguedad = (fechaIngreso) => {
    if (!fechaIngreso) return null
    const hoy = new Date()
    const ingreso = new Date(fechaIngreso)
    let anios = hoy.getFullYear() - ingreso.getFullYear()
    const m = hoy.getMonth() - ingreso.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) {
      anios--
    }
    return anios <= 0 ? "Nuevo ingreso" : `${anios} ${anios === 1 ? "año" : "años"} en el coro`
  }

  // Métricas superiores globales
  const stats = useMemo(() => {
    const total = members.length
    const activos = members.filter(m => m.estado === "activo" || m.estado === undefined || m.estado === null).length
    return { total, activos }
  }, [members])

  // Filtrado de próximos cumpleaños
  const cumpleaniosMes = useMemo(() => {
    const hoy = new Date()
    const mesActual = hoy.getMonth()

    return members
      .filter(m => {
        if (!m.fecha_nacimiento) return false
        const cumple = new Date(m.fecha_nacimiento)
        return cumple.getMonth() === mesActual
      })
      .map(m => {
        const hoy_año = hoy.getFullYear()
        const cumpleOriginal = new Date(m.fecha_nacimiento)
        const cumpleEsteAño = new Date(hoy_año, cumpleOriginal.getMonth(), cumpleOriginal.getDate())
        
        let diffTime = cumpleEsteAño - hoy
        let diasFaltantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diasFaltantes < 0 && diasFaltantes >= -1) diasFaltantes = 0

        return {
          ...m,
          diasFaltantes,
          diaMes: cumpleOriginal.getDate()
        }
      })
      .sort((a, b) => a.diaMes - b.diaMes)
  }, [members])

  // Lógica de búsqueda fluida por texto
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const searchLower = search.toLowerCase()
      return (
        member.nombre_completo?.toLowerCase().includes(searchLower) ||
        member.telefono?.toLowerCase().includes(searchLower) ||
        member.ministerio?.toLowerCase().includes(searchLower) ||
        member.correo?.toLowerCase().includes(searchLower)
      )
    })
  }, [members, search])

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 font-sans antialiased text-gray-800">
      
      {/* HEADER PREMIUM REFINADO - SIN EMOJIS */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-b-[45px] p-6 md:p-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">
              Integrantes
            </h1>
            <p className="opacity-90 text-sm mt-1 font-medium">
              Administración y control de miembros del Coro Vive y Canta
            </p>
          </div>
          <span className="text-xs bg-white/20 border border-white/10 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">
            {stats.activos} Activos
          </span>
        </div>

        {/* MÉTRICA EN TIEMPO REAL */}
        <div className="grid grid-cols-1 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-yellow-100 font-black">Censo Total Registrado</p>
              <h3 className="text-3xl font-black mt-0.5">{stats.total} Miembros</h3>
            </div>
            <Users className="text-white/30" size={36} />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y CUMPLEAÑOS */}
        <div className="space-y-4 lg:col-span-1">
          
          {/* BUSCADOR */}
          <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-xs border border-gray-100">
            <Search className="text-gray-400 shrink-0" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none bg-transparent text-sm font-medium placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* CUMPLEAÑOS DEL MES */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider block mb-3">
              Cumpleaños de este Mes
            </h3>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {cumpleaniosMes.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Ningún miembro cumple años este mes.</p>
              ) : (
                cumpleaniosMes.map(m => (
                  <div key={m.id} className="flex justify-between items-center bg-[#F8F4E9]/60 p-2.5 rounded-xl border border-amber-100/50">
                    <div>
                      <h4 className="text-xs font-black text-gray-800 line-clamp-1">{m.nombre_completo}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">Día {m.diaMes}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${m.diasFaltantes === 0 ? "bg-red-600 text-white animate-pulse" : "bg-amber-100 text-[#B8860B]"}`}>
                      {m.diasFaltantes === 0 ? "HOY" : `Faltan ${m.diasFaltantes} días`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: SE ELIMINÓ EL FILTRO DE ROLES SLIDER, MUESTRA DIRECTA DE TARJETAS */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMembers.map((member) => {
              const edad = calcularEdad(member.fecha_nacimiento)
              const tiempoCoro = calcularAntiguedad(member.fecha_ingreso)

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="w-full bg-white rounded-[26px] p-4 shadow-2xs border border-gray-100/80 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99] group relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    
                    {/* MARCO DE AVATAR CON DEGRADADO EN COLOR */}
                    <div className="shrink-0 relative p-0.5 rounded-2xl bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-xs">
                      <div className="rounded-[14px] overflow-hidden bg-white p-0.5">
                        {member.foto ? (
                          <img
                            src={member.foto}
                            alt=""
                            className="w-14 h-14 rounded-[12px] object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                        ) : (
                          <Avatar
                            name={member.nombre_completo}
                            size="56"
                            round="12px"
                            color="#F3EAC2"
                            textColor="#8B6508"
                            className="font-black"
                          />
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"></span>
                    </div>

                    {/* DATOS GENERALES */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="font-black text-gray-800 text-base leading-tight tracking-tight group-hover:text-[#B8860B] transition-colors line-clamp-1">
                        {member.nombre_completo}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] bg-amber-50 text-[#B8860B] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-100">
                          {getRoleName(member.role)}
                        </span>
                        {member.ministerio && (
                          <span className="text-[9px] px-2 py-0.5 bg-stone-100 rounded-md font-bold text-gray-500">
                            {member.ministerio}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PIE DE TARJETA */}
                  <div className="mt-4 pt-2.5 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <div className="flex items-center gap-3">
                      {edad && <span>{edad} años</span>}
                      {member.direccion && <span className="truncate max-w-[120px]">📍 {member.direccion}</span>}
                    </div>
                    {tiempoCoro && (
                      <span className="text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-md text-[10px]">
                        {tiempoCoro}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-[#B8860B] transition-colors hidden md:block" size={18} />
                </div>
              )
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="bg-white rounded-3xl text-center text-gray-400 py-16 border border-dashed border-gray-200">
              <Layers className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm font-medium">No se encontraron integrantes</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLE DE PERFIL */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden border border-gray-100">
            
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition z-10 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* HEADER DEL MODAL CON MARCO EN FOTO */}
            <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B] p-6 text-white pt-10 relative">
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-0.5 rounded-2xl bg-white/20 shadow-md">
                  <div className="rounded-[14px] overflow-hidden bg-white p-0.5">
                    {selectedMember.foto ? (
                      <img
                        src={selectedMember.foto}
                        alt=""
                        className="w-20 h-20 rounded-[12px] object-cover"
                      />
                    ) : (
                      <Avatar
                        name={selectedMember.nombre_completo}
                        size="80"
                        round="12px"
                        color="#F3EAC2"
                        textColor="#8B6508"
                        className="font-black"
                      />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black bg-black/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {getRoleName(selectedMember.role)}
                  </span>
                  <h3 className="font-black text-xl tracking-tight mt-1 truncate">{selectedMember.nombre_completo}</h3>
                  <p className="text-xs text-yellow-100 font-medium truncate">{selectedMember.correo}</p>
                </div>
              </div>
            </div>

            {/* CUERPO DETALLES */}
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 col-span-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ministerio Asignado</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">{selectedMember.ministerio || "General"}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 col-span-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha de Ingreso</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5 flex items-center gap-1">
                    <Clock size={12} /> {selectedMember.fecha_ingreso || "No registrada"}
                  </p>
                </div>
              </div>

              <div className="bg-[#F8F4E9]/60 rounded-2xl p-3.5 border border-amber-100/40 space-y-2.5 text-xs">
                {selectedMember.direccion && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin size={14} className="text-[#B8860B] shrink-0 mt-0.5" />
                    <span><strong>Dirección:</strong> {selectedMember.direccion}</span>
                  </div>
                )}
                {selectedMember.fecha_nacimiento && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} className="text-[#B8860B] shrink-0" />
                    <span><strong>Nacimiento:</strong> {selectedMember.fecha_nacimiento} ({calcularEdad(selectedMember.fecha_nacimiento)} años)</span>
                  </div>
                )}
                {selectedMember.tipo_sangre && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-red-500 font-bold shrink-0 text-xs">🩸</span>
                    <span><strong>Tipo de Sangre:</strong> <span className="font-black text-red-600">{selectedMember.tipo_sangre}</span></span>
                  </div>
                )}
                {selectedMember.contacto_emergencia && (
                  <div className="border-t border-amber-200/40 pt-2 mt-1 flex items-start gap-2 text-gray-600">
                    <Heart size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p><strong>Contacto de Emergencia:</strong> {selectedMember.contacto_emergencia}</p>
                      {selectedMember.telefono_emergencia && (
                        <p className="text-gray-500 font-semibold mt-0.5">📞 {selectedMember.telefono_emergencia}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTONES */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => {
                  setSelectedMember(null)
                  navigate(`/member/${selectedMember.id}`)
                }}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-700 text-xs font-black py-3 rounded-xl border border-gray-200 transition text-center cursor-pointer shadow-2xs"
              >
                Editar Perfil
              </button>

              {selectedMember.telefono && (
                <>
                  <a
                    href={`tel:${selectedMember.telefono}`}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center justify-center shadow-xs"
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`https://wa.me/${selectedMember.telefono.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center justify-center shadow-xs"
                  >
                    <MessageCircle size={16} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Members