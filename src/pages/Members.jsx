import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"
import {
  Search, ChevronRight, X, Phone,
  MessageCircle, Calendar, Layers, MapPin,
  Clock, Heart, Star, Plus, Loader2,
  UserPlus, ChevronDown
} from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"

const ROLES = [
  { value: "integrante", label: "Integrante" },
  { value: "secretaria", label: "Secretaria" },
  { value: "tesorero", label: "Tesorero" },
  { value: "director", label: "Director" },
  { value: "admin", label: "Administrador" },
  { value: "parroco", label: "Párroco" },
]
const PASSWORD_GLOBAL = "Viveycanta2026@"
const DOMAIN = "viveycanta.app"

function ModalAgregarIntegrante({ onClose, onSuccess, members }) {
  const [nombre, setNombre] = useState("")
  const [usuario, setUsuario] = useState("")
  const [role, setRole] = useState("integrante")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleNombreChange = (e) => {
    const val = e.target.value
    setNombre(val)
    setErrors(p => ({ ...p, nombre: null }))
    const parts = val.trim().toLowerCase().split(/\s+/)
    if (parts.length >= 2) {
      setUsuario(`${parts[0]}.${parts[1]}`)
    } else {
      setUsuario(parts[0] || "")
    }
  }

  const validate = () => {
    const e = {}
    if (!nombre.trim()) e.nombre = "El nombre es requerido"
    if (!usuario.trim()) e.usuario = "El usuario es requerido"
    else if (!/^[a-z0-9._-]+$/.test(usuario)) e.usuario = "Solo letras minúsculas, números, puntos o guiones"
    if (members.some(m => m.usuario === usuario.trim())) e.usuario = "Este usuario ya existe"
    if (role === "parroco" && members.some(m => m.role === "parroco")) e.role = "Ya existe un párroco registrado"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = async () => {
    if (!validate()) return
    setSaving(true)

    try {
      const emailInterno = `${usuario.trim()}@${DOMAIN}`
      console.log("[MEMBERS] Invocando Edge Function 'create-user'...", usuario.trim())

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          usuario: usuario.trim(),
          nombre: nombre.trim(),
          email: emailInterno,
          role: role.toLowerCase(),
          password: PASSWORD_GLOBAL,
        }
      })

      if (error) {
        console.error("[MEMBERS] Error retornado por Edge Function:", error)
        throw new Error(error.message || "Error al procesar la creación de usuario en el servidor")
      }

      console.log("[MEMBERS] Integrante creado con éxito:", data)

      onSuccess({
        usuario: usuario.trim(),
        email: emailInterno,
        password: PASSWORD_GLOBAL,
      })
    } catch (err) {
      console.error("[MEMBERS] Excepción capturada en handleGuardar:", err)
      setErrors({ global: err.message || "Error al crear integrante. Verifica tu conexión." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#1A1710] w-full max-w-sm rounded-[28px] border border-[#D4AF37]/25 shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#D4AF37] via-[#C9A227] to-[#9A7209] px-6 pt-6 pb-7 text-black">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-black transition">
            <X size={15} />
          </button>
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center border border-black/20">
              <UserPlus size={18} className="text-black" />
            </div>
            <div>
              <p className="text-black/60 text-[10px] font-bold uppercase tracking-widest">Coro Vive y Canta</p>
              <h2 className="text-black font-black text-xl">Nuevo Integrante</h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {errors.global && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-red-400">
              <p className="text-xs font-semibold">{errors.global}</p>
            </div>
          )}

          {/* NOMBRE */}
          <div>
            <label className="block text-[10px] font-bold text-[#a89060] uppercase tracking-wider mb-1.5">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={handleNombreChange}
              placeholder="Ej. Juan Perez"
              className="input-premium"
            />
            {errors.nombre && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.nombre}</p>}
          </div>

          {/* USUARIO */}
          <div>
            <label className="block text-[10px] font-bold text-[#a89060] uppercase tracking-wider mb-1.5">
              Usuario de acceso <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value.toLowerCase()); setErrors(p => ({ ...p, usuario: null })) }}
              placeholder="juan.perez"
              className="input-premium"
            />
            {errors.usuario ? (
              <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.usuario}</p>
            ) : (
              <p className="text-[9px] text-[#a89060]/50 mt-1">El integrante iniciará sesión con este usuario</p>
            )}
          </div>

          {/* ROL */}
          <div>
            <label className="block text-[10px] font-bold text-[#a89060] uppercase tracking-wider mb-1.5">
              Rol *
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={e => { setRole(e.target.value); setErrors(p => ({ ...p, role: null })) }}
                className="input-premium"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {errors.role && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.role}</p>}
          </div>

          {/* CONTRASEÑA */}
          <div className="bg-[#221F18] border border-[#D4AF37]/15 rounded-xl p-3.5 flex items-center gap-2.5">
            <span className="text-base shrink-0">🔑</span>
            <div>
              <p className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wide">Contraseña inicial</p>
              <p className="text-xs text-[#F5E9C0] font-mono tracking-wide mt-0.5">{PASSWORD_GLOBAL}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} disabled={saving} className="btn-secondary flex-1 py-3 text-xs">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={saving} className="btn-primary flex-[2] py-3 text-xs">
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Guardando...</>
            ) : (
              <><UserPlus size={15} /> Agregar</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalExito({ data, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className={`bg-[#1A1710] border border-[#D4AF37]/25 w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-8 pb-6 text-center text-black">
          <div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center mx-auto mb-3 border-2 border-black/20">
            <span className="text-2xl text-black">✓</span>
          </div>
          <h3 className="font-black text-xl text-black">¡Listo!</h3>
          <p className="text-black/70 text-xs mt-1">Integrante agregado correctamente</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-[#221F18] rounded-xl p-3.5 border border-[#D4AF37]/15 space-y-2">
            <div>
              <p className="text-[9px] font-bold text-[#a89060] uppercase tracking-widest">Usuario</p>
              <p className="text-sm font-bold text-[#F5E9C0]">{data.usuario}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#a89060] uppercase tracking-widest">Email interno</p>
              <p className="text-sm font-bold text-[#F5E9C0] break-all">{data.email}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#a89060] uppercase tracking-widest">Contraseña inicial</p>
              <p className="text-sm font-mono font-bold text-[#D4AF37]">{data.password}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#a89060]/50 text-center">Comparte las credenciales con el nuevo integrante.</p>
          <button onClick={onClose} className="btn-primary w-full py-3">
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

function Members() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState("")
  const [selectedMember, setSelectedMember] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    loadCurrentUser()
    loadMembers()
  }, [])

  const loadCurrentUser = async () => {
    try {
      console.log("[MEMBERS] Cargando usuario actual para validar rol...")
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      if (error) {
        console.error("[MEMBERS] Error al buscar rol en 'profiles':", error)
        setCurrentUser({ role: "integrante" }) // Rol de respaldo si no existe en BD
      } else {
        console.log("[MEMBERS] Rol de usuario cargado con éxito:", data?.role)
        setCurrentUser(data)
      }
    } catch (err) {
      console.error("[MEMBERS] Excepción al cargar rol de usuario:", err)
      setCurrentUser({ role: "integrante" })
    }
  }

  const isAdmin = currentUser?.role === "admin"

  const handleDeleteMember = async (member) => {
    const confirmar = window.confirm(
      `¿Eliminar a ${member.nombre_completo} permanentemente?\nEsto borra su cuenta y todos sus datos.`
    )
    if (!confirmar) return

    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: member.id },
      })

      if (error) throw new Error(error.message)

      setSelectedMember(null)
      toast.success("Integrante eliminado correctamente")
      await loadMembers()
    } catch (err) {
      console.error("ERROR DELETE:", err)
      toast.error("Error al intentar eliminar integrante: " + err.message)
    }
  }

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nombre_completo", { ascending: true })
      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar integrantes")
    }
  }

  const getRoleName = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found ? found.label : "Integrante"
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "bg-purple-500/10 text-purple-300 border-purple-500/20"
      case "director": return "bg-blue-500/10 text-blue-300 border-blue-500/20"
      case "secretaria": return "bg-rose-500/10 text-rose-300 border-rose-500/20"
      case "tesorero": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      case "parroco": return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
      default: return "bg-amber-500/5 text-[#D4AF37] border-[#D4AF37]/20"
    }
  }

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null
    const hoy = new Date()
    const cumple = new Date(fechaNac + "T12:00:00")
    let edad = hoy.getFullYear() - cumple.getFullYear()
    const m = hoy.getMonth() - cumple.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--
    return edad
  }

  const calcularAntiguedad = (fechaIngreso) => {
    if (!fechaIngreso) return null
    const hoy = new Date()
    const ingreso = new Date(fechaIngreso + "T12:00:00")
    let anios = hoy.getFullYear() - ingreso.getFullYear()
    const m = hoy.getMonth() - ingreso.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anios--
    return anios <= 0 ? "Nuevo ingreso" : `${anios} ${anios === 1 ? "año" : "años"}`
  }

  const stats = useMemo(() => {
    const total = members.length
    const activos = members.filter(m => m.estado === "activo" || m.estado === undefined || m.estado === null).length
    return { total, activos }
  }, [members])

  const cumpleaniosMes = useMemo(() => {
    const hoy = new Date()
    const mesActual = hoy.getMonth()
    return members
      .filter(m => {
        if (!m.fecha_nacimiento) return false
        const cumple = new Date(m.fecha_nacimiento + "T12:00:00")
        return cumple.getMonth() === mesActual
      })
      .map(m => {
        const cumpleOriginal = new Date(m.fecha_nacimiento + "T12:00:00")
        const cumpleEsteAnio = new Date(hoy.getFullYear(), cumpleOriginal.getMonth(), cumpleOriginal.getDate())
        let diffTime = cumpleEsteAnio - hoy
        let diasFaltantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diasFaltantes < 0 && diasFaltantes >= -1) diasFaltantes = 0
        return { ...m, diasFaltantes, diaMes: cumpleOriginal.getDate() }
      })
      .map(m => {
        // Safe correction in case of negative ceiling calculations
        if (m.diasFaltantes < 0) return { ...m, diasFaltantes: 0 }
        return m
      })
      .sort((a, b) => a.diaMes - b.diaMes)
  }, [members])

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const q = search.toLowerCase()
      return (
        member.nombre_completo?.toLowerCase().includes(q) ||
        member.telefono?.toLowerCase().includes(q) ||
        member.ministerio?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||
        member.usuario?.toLowerCase().includes(q)
      )
    })
  }, [members, search])

  return (
    <div className="min-h-screen bg-[#0E0C09] pb-32 antialiased text-[#F5E9C0]">
      <div className="page-header-gold relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-8 -right-4 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 left-8 w-36 h-36 rounded-full bg-black/5" />
        <div className="relative p-6 pb-10">
          <div className="flex justify-between items-start">
            <div className="header-text-primary">
              <p className="header-text-secondary text-xs font-semibold tracking-widest uppercase mb-1">Coro Vive y Canta</p>
              <h1 className="title-professional title-gold-black text-4xl tracking-tight">Integrantes</h1>
            </div>
            <div className="header-chip rounded-2xl px-4 py-3 text-center backdrop-blur-xs">
              <p className="text-2xl font-black leading-none">{stats.total}</p>
              <p className="header-text-secondary text-[10px] font-bold uppercase tracking-wider mt-0.5">Miembros</p>
            </div>
          </div>
          <div className="flex gap-2 mt-5 flex-wrap">
            <div className="header-chip flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="header-text-primary text-xs font-bold">{stats.activos} activos</span>
            </div>
            <div className="header-chip flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Star size={12} className="text-yellow-100" />
              <span className="header-text-primary text-xs font-bold">{cumpleaniosMes.length} cumpleaños este mes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-[#1A1710] rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#D4AF37]/15">
            <Search className="text-[#D4AF37] shrink-0" size={17} />
            <input
              type="text"
              placeholder="Buscar miembro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none bg-transparent text-sm placeholder-[#a89060]/30 text-[#F5E9C0]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#a89060] hover:text-[#D4AF37] transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="bg-[#1A1710] rounded-2xl overflow-hidden border border-[#D4AF37]/15">
            <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] px-4 py-3 flex items-center gap-2 text-black">
              <span className="text-lg">🎂</span>
              <h3 className="text-black text-xs font-black uppercase tracking-wider">Cumpleaños del mes</h3>
            </div>
            <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
              {cumpleaniosMes.length === 0 ? (
                <p className="text-xs text-[#a89060]/50 text-center py-6 italic">Ningún cumpleaños registrado este mes.</p>
              ) : (
                cumpleaniosMes.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#221F18] border border-[#D4AF37]/15">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7209] flex items-center justify-center text-black">
                      <p className="text-[10px] font-black">{m.diaMes}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#F5E9C0] truncate">{m.nombre_completo}</p>
                      <p className="text-[10px] text-[#a89060] font-bold">
                        {m.diasFaltantes === 0 ? "¡Hoy!" : `Faltan ${m.diasFaltantes} días`}
                      </p>
                    </div>
                    {m.diasFaltantes === 0 && (
                      <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse shrink-0">HOY</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {search && (
            <p className="text-xs text-[#a89060] font-semibold mb-3 px-1">
              {filteredMembers.length} resultado{filteredMembers.length !== 1 ? "s" : ""} para "{search}"
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMembers.map((member) => {
              const edad = calcularEdad(member.fecha_nacimiento)
              const antiguedad = calcularAntiguedad(member.fecha_ingreso)
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="bg-[#1A1710] rounded-[22px] p-4 border border-[#D4AF37]/15 hover:border-[#D4AF37]/50 hover:shadow-2xl transition-all duration-200 cursor-pointer group relative overflow-hidden active:scale-[0.985]"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3.5">
                    <div className="shrink-0 relative">
                      <div className="p-0.5 rounded-2xl bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37]">
                        <div className="rounded-[14px] overflow-hidden bg-[#0E0C09] p-px">
                          {member.foto || member.foto_url ? (
                            <img
                              src={member.foto || member.foto_url}
                              alt={member.nombre_completo}
                              className="w-14 h-14 rounded-[13px] object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Avatar name={member.nombre_completo} size="56" round="13px" color="#221F18" textColor="#D4AF37" />
                          )}
                        </div>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#1A1710]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-[#F5E9C0] text-sm leading-snug truncate group-hover:text-[#D4AF37] transition-colors">
                        {member.nombre_completo}
                      </h2>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getRoleColor(member.role)}`}>
                          {getRoleName(member.role)}
                        </span>
                        {member.ministerio && (
                          <span className="text-[9px] px-2 py-0.5 bg-[#221F18] border border-[#D4AF37]/10 rounded-md font-bold text-[#a89060]">
                            {member.ministerio}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#a89060]/40 group-hover:text-[#D4AF37] transition-colors shrink-0" />
                  </div>
                  {(edad || antiguedad) && (
                    <div className="mt-3 pt-2.5 border-t border-[#D4AF37]/10 flex items-center justify-between">
                      <span className="text-[11px] text-[#a89060]">{edad ? `${edad} años` : ""}</span>
                      {antiguedad && (
                        <span className="text-[10px] font-semibold text-[#a89060]/70 bg-[#221F18] px-2 py-0.5 rounded-lg border border-[#D4AF37]/10">{antiguedad} en el coro</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {filteredMembers.length === 0 && (
            <div className="bg-[#1A1710] rounded-3xl text-center py-20 border border-dashed border-[#D4AF37]/15">
              <Layers className="mx-auto text-[#a89060]/20 mb-3" size={36} />
              <p className="text-sm font-semibold text-[#a89060]/60">Sin resultados</p>
              <p className="text-xs text-[#a89060]/40 mt-1">Intenta con otro nombre o usuario</p>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-black pl-4 pr-5 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-[#B8860B]/30"
        >
          <Plus size={16} strokeWidth={3} />
          <span className="font-bold text-sm">Agregar Integrante</span>
        </button>
      )}

      {/* MODAL DETALLE MIEMBRO */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMember(null) }}
        >
          <div
            className="bg-[#1A1710] border border-[#D4AF37]/25 w-full sm:max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 80px)" }}
          >
            <div className="relative bg-gradient-to-br from-[#D4AF37] to-[#9A7209] px-6 pt-6 pb-6 shrink-0 text-black">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-black transition"
              >
                <X size={15} />
              </button>
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-0.5 rounded-2xl bg-white/25">
                  <div className="rounded-[14px] overflow-hidden bg-[#0E0C09] p-px">
                    {selectedMember.foto || selectedMember.foto_url ? (
                      <img
                        src={selectedMember.foto || selectedMember.foto_url}
                        alt={selectedMember.nombre_completo}
                        className="w-[72px] h-[72px] rounded-[13px] object-cover"
                      />
                    ) : (
                      <Avatar name={selectedMember.nombre_completo} size="72" round="13px" color="#221F18" textColor="#D4AF37" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <span className="inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1.5 bg-black/20 text-black border border-black/10">
                    {getRoleName(selectedMember.role)}
                  </span>
                  <h3 className="font-extrabold text-black text-lg leading-tight break-words">{selectedMember.nombre_completo}</h3>
                  {selectedMember.email && (
                    <p className="text-black/70 text-xs mt-0.5 truncate">{selectedMember.email}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1 bg-[#1A1710]">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#221F18] border border-[#D4AF37]/15 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#a89060] uppercase tracking-wider">Ministerio</p>
                  <p className="text-xs font-bold text-[#F5E9C0] mt-0.5 truncate">{selectedMember.ministerio || "General"}</p>
                </div>
                <div className="bg-[#221F18] border border-[#D4AF37]/15 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#a89060] uppercase tracking-wider">Ingreso</p>
                  <p className="text-xs font-bold text-[#F5E9C0] mt-0.5 flex items-center gap-1">
                    <Clock size={11} className="text-[#a89060]" />
                    {selectedMember.fecha_ingreso || "-"}
                  </p>
                </div>
              </div>
              <div className="bg-[#221F18] rounded-xl p-3.5 border border-[#D4AF37]/15 space-y-2.5">
                {selectedMember.direccion && (
                  <div className="flex items-start gap-2.5 text-xs text-[#F5E9C0]">
                    <MapPin size={13} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>{selectedMember.direccion}</span>
                  </div>
                )}
                {selectedMember.fecha_nacimiento && (
                  <div className="flex items-center gap-2.5 text-xs text-[#F5E9C0]">
                    <Calendar size={13} className="text-[#D4AF37] shrink-0" />
                    <span>
                      {selectedMember.fecha_nacimiento}
                      {calcularEdad(selectedMember.fecha_nacimiento) !== null && (
                        <span className="ml-1.5 text-[#D4AF37] font-bold">
                          ({calcularEdad(selectedMember.fecha_nacimiento)} años)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {selectedMember.tipo_sangre && (
                  <div className="flex items-center gap-2.5 text-xs text-[#F5E9C0]">
                    <span className="text-red-400 shrink-0">🩸</span>
                    <span>Tipo de sangre: <span className="font-extrabold text-red-400">{selectedMember.tipo_sangre}</span></span>
                  </div>
                )}
                {selectedMember.contacto_emergencia && (
                  <div className="flex items-start gap-2.5 text-xs text-[#F5E9C0] border-t border-[#D4AF37]/10 pt-2.5">
                    <Heart size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{selectedMember.contacto_emergencia}</p>
                      {selectedMember.telefono_emergencia && (
                        <p className="text-[#a89060] mt-0.5">{selectedMember.telefono_emergencia}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 px-5 pb-6 pt-3 shrink-0 border-t border-[#D4AF37]/10 bg-[#1A1710] w-full">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => navigate(`/member/${selectedMember.id}`)}
                  className="btn-outline flex-1 py-3 text-xs justify-center text-center"
                >
                  Ver Perfil
                </button>
                <button
                  onClick={() => navigate(`/carnet/${selectedMember.id}`)}
                  className="btn-primary flex-1 py-3 text-xs justify-center text-center"
                >
                  Carnet
                </button>
              </div>

              <div className="flex gap-2 w-full justify-between items-center">
                {selectedMember.telefono ? (
                  <>
                    <a
                      href={`tel:${selectedMember.telefono}`}
                      className="flex-1 h-11 text-xs px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Phone size={14} />
                      <span>Llamar</span>
                    </a>
                    <a
                      href={`https://wa.me/${
                        selectedMember.telefono.replace(/\D/g, "").startsWith("504")
                          ? selectedMember.telefono.replace(/\D/g, "")
                          : `504${selectedMember.telefono.replace(/\D/g, "")}`
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-11 text-xs px-3 bg-[#4ADE80]/10 hover:bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/20 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  </>
                ) : (
                  <div className="flex-1 text-xs text-[#a89060]/50 italic text-left pl-1">
                    Sin teléfono registrado
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteMember(selectedMember)}
                    className="w-11 h-11 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center transition-all shrink-0"
                    title="Eliminar integrante"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <ModalAgregarIntegrante
          onClose={() => setShowAddModal(false)}
          onSuccess={(data) => {
            setShowAddModal(false)
            setSuccessData(data)
            loadMembers()
          }}
          members={members}
        />
      )}

      {successData && (
        <ModalExito data={successData} onClose={() => setSuccessData(null)} />
      )}

      <BottomNav />
    </div>
  )
}

export default Members