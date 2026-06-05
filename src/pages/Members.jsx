import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"
import {
  Search, ChevronRight, X, Phone,
  MessageCircle, Calendar, Layers, MapPin,
  Clock, Heart, Star, Plus, Loader2, CheckCircle,
  AlertCircle, UserPlus, ChevronDown
} from "lucide-react"
import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const isSuccess = toast.type === "success"
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-sm w-[calc(100vw-2rem)] ${isSuccess ? "bg-white border-emerald-200" : "bg-white border-red-200"}`}>
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isSuccess ? "bg-emerald-100" : "bg-red-100"}`}>
        {isSuccess ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-800">{toast.title}</p>
        {toast.body && <p className="text-xs text-gray-500 mt-0.5 break-all">{toast.body}</p>}
      </div>
      <button onClick={onClose} className="shrink-0 text-gray-300 hover:text-gray-500"><X size={14} /></button>
    </div>
  )
}

const ROLES = [
  { value: "integrante", label: "Integrante" },
  { value: "secretaria", label: "Secretaria" },
  { value: "tesorero", label: "Tesorero" },
  { value: "director", label: "Director" },
  { value: "admin", label: "Administrador" },
  { value: "parroco", label: "Parroco" },
]
const PASSWORD_GLOBAL = "Viveycanta2026@"
const DOMAIN = "viveycanta.app"

function ModalAgregarIntegrante({ onClose, onSuccess, members }) {
  const [nombre, setNombre] = useState("")
  const [usuario, setUsuario] = useState("")
  const [role, setRole] = useState("integrante")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Auto-generar usuario desde nombre
  const handleNombreChange = (e) => {
    const val = e.target.value
    setNombre(val)
    setErrors(p => ({ ...p, nombre: null }))
    // Sugerir usuario: "Juan Perez Lopez" → "juan.perez"
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
    if (role === "parroco" && members.some(m => m.role === "parroco")) e.role = "Ya existe un parroco registrado"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGuardar = async () => {
    if (!validate()) return
    setSaving(true)

    try {
      const emailInterno = `${usuario.trim()}@${DOMAIN}`

      // ✅ Usar Edge Function — NO toca la sesión activa del admin
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            usuario:  usuario.trim(),
            nombre:   nombre.trim(),
            email:    emailInterno,
            role:     role.toLowerCase(),
            password: PASSWORD_GLOBAL,
          }),
        }
      )

      let result = {}

try {
  result = await res.json()
} catch {
  result = {}
}

if (!res.ok) {
  throw new Error(
    result.error ||
    "Error en Edge Function create-user"
  )
}

      onSuccess({
        usuario: usuario.trim(),
        email:   emailInterno,
        password: PASSWORD_GLOBAL,
      })

    } catch (err) {
      setErrors({ global: err.message || "Error al crear usuario" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-[#D4AF37] via-[#C9A227] to-[#9A7209] px-6 pt-6 pb-7">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/35 rounded-full text-white transition">
            <X size={15} />
          </button>
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
              <UserPlus size={18} className="text-white" />
            </div>
            <div>
              <p className="text-yellow-200/70 text-[10px] font-black uppercase tracking-widest">Coro Vive y Canta</p>
              <h2 className="text-white font-black text-xl">Nuevo Integrante</h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {errors.global && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-medium">{errors.global}</p>
            </div>
          )}

          {/* NOMBRE */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={handleNombreChange}
              placeholder="Ej. Juan Perez Lopez"
              className={`w-full text-sm bg-gray-50 border rounded-xl px-4 py-3 outline-none transition placeholder-gray-300 text-gray-700 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white ${errors.nombre ? "border-red-300" : "border-gray-200"}`}
            />
            {errors.nombre && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.nombre}</p>}
          </div>

          {/* USUARIO (login) */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Usuario de acceso <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value.toLowerCase()); setErrors(p => ({ ...p, usuario: null })) }}
              placeholder="juan.perez"
              className={`w-full text-sm bg-gray-50 border rounded-xl px-4 py-3 outline-none transition placeholder-gray-300 text-gray-700 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white ${errors.usuario ? "border-red-300" : "border-gray-200"}`}
            />
            {errors.usuario
              ? <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.usuario}</p>
              : <p className="text-[10px] text-gray-400 mt-1">El integrante iniciará sesión con este usuario</p>
            }
          </div>

          {/* ROL */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Rol <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={e => { setRole(e.target.value); setErrors(p => ({ ...p, role: null })) }}
                className={`w-full text-sm bg-gray-50 border rounded-xl px-4 py-3 outline-none transition text-gray-700 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:bg-white appearance-none ${errors.role ? "border-red-300" : "border-gray-200"}`}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.role && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.role}</p>}
          </div>

          {/* CONTRASEÑA INICIAL */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-center gap-2.5">
            <span className="text-base shrink-0">🔑</span>
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Contraseña inicial</p>
              <p className="text-[11px] text-amber-700 font-mono tracking-wide mt-0.5">{PASSWORD_GLOBAL}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="flex-[2] bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
          >
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
              : <><UserPlus size={15} /> Agregar</>
            }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className={`bg-white w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 px-6 pt-8 pb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h3 className="text-white font-black text-xl">¡Listo!</h3>
          <p className="text-emerald-100 text-xs mt-1">Integrante agregado correctamente</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2">
            {/* ✅ data.usuario y data.email (variables corregidas) */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Usuario</p>
              <p className="text-sm font-bold text-gray-700">{data.usuario}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email interno</p>
              <p className="text-sm font-bold text-gray-700 break-all">{data.email}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Contraseña inicial</p>
              <p className="text-sm font-mono font-bold text-[#9A7209]">{data.password}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 text-center">Comparte el usuario y contraseña con el nuevo integrante.</p>
          <button onClick={onClose} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition">
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
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadCurrentUser()
    loadMembers()
  }, [])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    setCurrentUser(data)
  }

  const isAdmin = currentUser?.role === "admin"

  const handleDeleteMember = async (member) => {
  const confirmar = window.confirm(
    `¿Eliminar a ${member.nombre_completo} permanentemente?\nEsto borra su cuenta y todos sus datos.`
  )

  if (!confirmar) return

  try {
    const { error } =
      await supabase.functions.invoke(
        "delete-user",
        {
          body: {
            userId:
              member.id,
          },
        }
      )

    if (error) {
      throw new Error(
        error.message
      )
    }

    setSelectedMember(null)

    setToast({
      type: "success",
      title:
        "Integrante eliminado correctamente",
    })

    await loadMembers()

  } catch (err) {
    console.error(
      "ERROR DELETE:",
      err
    )

    setToast({
      type: "error",
      title:
        "Error al eliminar",
      body:
        err.message,
    })
  }
}

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("nombre_completo", { ascending: true })
    if (error) { console.error(error); return }
    setMembers(data || [])
  }

  const getRoleName = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found ? found.label : "Integrante"
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":      return "bg-purple-100 text-purple-700 border-purple-200"
      case "director":   return "bg-blue-100 text-blue-700 border-blue-200"
      case "secretaria": return "bg-rose-100 text-rose-700 border-rose-200"
      case "tesorero":   return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "parroco":    return "bg-indigo-100 text-indigo-700 border-indigo-200"
      default:           return "bg-amber-50 text-[#B8860B] border-amber-100"
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
      .sort((a, b) => a.diaMes - b.diaMes)
  }, [members])

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const q = search.toLowerCase()
      return (
        member.nombre_completo?.toLowerCase().includes(q) ||
        member.telefono?.toLowerCase().includes(q) ||
        member.ministerio?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||    // ✅ email (no correo)
        member.usuario?.toLowerCase().includes(q)     // ✅ también busca por usuario
      )
    })
  }, [members, search])

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 antialiased text-gray-800">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="relative bg-gradient-to-br from-[#C9A227] via-[#D4AF37] to-[#9A7209] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-8 -right-4 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 left-8 w-36 h-36 rounded-full bg-black/5" />
        <div className="relative p-6 pb-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-yellow-200/80 text-xs font-semibold tracking-widest uppercase mb-1">Coro Vive y Canta</p>
              <h1 className="text-4xl font-black text-white tracking-tight">Integrantes</h1>
            </div>
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl px-4 py-3 text-white text-center">
              <p className="text-2xl font-black leading-none">{stats.total}</p>
              <p className="text-[10px] font-bold text-yellow-100 uppercase tracking-wider mt-0.5">Miembros</p>
            </div>
          </div>
          <div className="flex gap-2 mt-5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-bold">{stats.activos} activos</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
              <Star size={11} className="text-yellow-200" />
              <span className="text-white text-xs font-bold">{cumpleaniosMes.length} cumpleaños este mes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
            <Search className="text-[#D4AF37] shrink-0" size={17} />
            <input
              type="text"
              placeholder="Buscar miembro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none bg-transparent text-sm placeholder-gray-300 text-gray-700"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X size={15} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <div className="bg-gradient-to-r from-amber-400 to-[#D4AF37] px-4 py-3 flex items-center gap-2">
              <span className="text-lg">🎂</span>
              <h3 className="text-white text-xs font-black uppercase tracking-wider">Cumpleaños del mes</h3>
            </div>
            <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
              {cumpleaniosMes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 italic">Ningún miembro cumple años este mes.</p>
              ) : (
                cumpleaniosMes.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7209] flex items-center justify-center text-white">
                      <p className="text-[10px] font-black">{m.diaMes}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{m.nombre_completo}</p>
                      <p className="text-[10px] text-gray-700 font-bold">
                        {m.diasFaltantes === 0 ? "¡Hoy!" : `Faltan ${m.diasFaltantes} días`}
                      </p>
                    </div>
                    {m.diasFaltantes === 0 && (
                      <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse shrink-0">HOY</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {search && (
            <p className="text-xs text-gray-400 font-medium mb-3 px-1">
              {filteredMembers.length} resultado{filteredMembers.length !== 1 ? "s" : ""} para "{search}"
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMembers.map((member) => {
              const edad = calcularEdad(member.fecha_nacimiento)
              const antiguedad = calcularAntiguedad(member.fecha_ingreso)
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="bg-white rounded-[22px] p-4 border border-gray-100 hover:border-[#D4AF37]/50 hover:shadow-md transition-all duration-200 cursor-pointer group relative overflow-hidden active:scale-[0.985]"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3.5">
                    <div className="shrink-0 relative">
                      <div className="p-0.5 rounded-2xl bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37]">
                        <div className="rounded-[14px] overflow-hidden bg-white p-px">
                          {member.foto || member.foto_url ? (
                            <img
                              src={member.foto || member.foto_url}
                              alt={member.nombre_completo}
                              className="w-14 h-14 rounded-[13px] object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Avatar name={member.nombre_completo} size="56" round="13px" color="#F3EAC2" textColor="#8B6508" />
                          )}
                        </div>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-gray-900 text-sm leading-snug truncate group-hover:text-[#9A7209] transition-colors">
                        {member.nombre_completo}
                      </h2>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleColor(member.role)}`}>
                          {getRoleName(member.role)}
                        </span>
                        {member.ministerio && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-md font-medium text-gray-500">
                            {member.ministerio}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-200 group-hover:text-[#D4AF37] transition-colors shrink-0" />
                  </div>
                  {(edad || antiguedad) && (
                    <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{edad ? `${edad} años` : ""}</span>
                      {antiguedad && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{antiguedad} en el coro</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {filteredMembers.length === 0 && (
            <div className="bg-white rounded-3xl text-center py-20 border border-dashed border-gray-200">
              <Layers className="mx-auto text-gray-200 mb-3" size={36} />
              <p className="text-sm font-semibold text-gray-400">Sin resultados</p>
              <p className="text-xs text-gray-300 mt-1">Intenta con otro nombre o usuario</p>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2.5 bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-amber-300/40 hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 border border-[#B8860B]/30"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Plus size={14} className="text-white" strokeWidth={3} />
          </div>
          <span className="font-black text-sm">Agregar Integrante</span>
        </button>
      )}

      {/* MODAL DETALLE MIEMBRO */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMember(null) }}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
            style={{ maxHeight: "calc(100vh - 80px)" }}
          >
            <div className="relative bg-gradient-to-br from-[#D4AF37] to-[#9A7209] px-6 pt-6 pb-6 shrink-0">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/35 rounded-full text-white transition"
              >
                <X size={15} />
              </button>
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-0.5 rounded-2xl bg-white/25">
                  <div className="rounded-[14px] overflow-hidden bg-white p-px">
                    {selectedMember.foto || selectedMember.foto_url ? (
                      <img
                        src={selectedMember.foto || selectedMember.foto_url}
                        alt={selectedMember.nombre_completo}
                        className="w-[72px] h-[72px] rounded-[13px] object-cover"
                      />
                    ) : (
                      <Avatar name={selectedMember.nombre_completo} size="72" round="13px" color="#F3EAC2" textColor="#8B6508" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <span className="inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1.5 bg-black/20 text-white">
                    {getRoleName(selectedMember.role)}
                  </span>
                  <h3 className="font-black text-white text-lg leading-tight break-words">{selectedMember.nombre_completo}</h3>
                  {/* ✅ selectedMember.email (columna real) */}
                  {selectedMember.email && (
                    <p className="text-yellow-100/80 text-xs mt-0.5 truncate">{selectedMember.email}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Ministerio</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{selectedMember.ministerio || "General"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Ingreso</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5 flex items-center gap-1">
                    <Clock size={11} className="text-gray-400" />
                    {selectedMember.fecha_ingreso || "-"}
                  </p>
                </div>
              </div>
              <div className="bg-[#FDFAF2] rounded-xl p-3.5 border border-amber-100/60 space-y-2.5">
                {selectedMember.direccion && (
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <MapPin size={13} className="text-[#B8860B] shrink-0 mt-0.5" />
                    <span>{selectedMember.direccion}</span>
                  </div>
                )}
                {selectedMember.fecha_nacimiento && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <Calendar size={13} className="text-[#B8860B] shrink-0" />
                    <span>
                      {selectedMember.fecha_nacimiento}
                      {calcularEdad(selectedMember.fecha_nacimiento) !== null && (
                        <span className="ml-1.5 text-[#B8860B] font-bold">
                          ({calcularEdad(selectedMember.fecha_nacimiento)} años)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {selectedMember.tipo_sangre && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <span className="text-red-500 shrink-0">🩸</span>
                    <span>Tipo de sangre: <span className="font-black text-red-600">{selectedMember.tipo_sangre}</span></span>
                  </div>
                )}
                {selectedMember.contacto_emergencia && (
                  <div className="flex items-start gap-2.5 text-xs text-gray-600 border-t border-amber-100 pt-2.5">
                    <Heart size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{selectedMember.contacto_emergencia}</p>
                      {selectedMember.telefono_emergencia && (
                        <p className="text-gray-400 mt-0.5">{selectedMember.telefono_emergencia}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-5 pb-6 pt-2 shrink-0 border-t border-gray-50">
              <button
                onClick={() => navigate(`/member/${selectedMember.id}`)}
                className="flex-1 border-2 border-[#D4AF37] text-[#9A7209] py-3 rounded-xl font-bold text-sm hover:bg-amber-50 transition-colors"
              >
                Ver Perfil
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteMember(selectedMember)}
                  className="w-12 h-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-colors shrink-0 border border-red-100"
                  title="Eliminar integrante"
                >
                  <X size={16} />
                </button>
              )}
              {selectedMember.telefono && (
                <>
                  <a
                    href={`tel:${selectedMember.telefono}`}
                    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`https://wa.me/${
                      selectedMember.telefono.replace(/\D/g, "").startsWith("504")
                        ? selectedMember.telefono.replace(/\D/g, "")
                        : `504${selectedMember.telefono.replace(/\D/g, "")}`
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
                  >
                    <MessageCircle size={16} />
                  </a>
                </>
              )}
              <button
                onClick={() => navigate(`/carnet/${selectedMember.id}`)}
                className="px-4 h-12 bg-gradient-to-r from-[#D4AF37] to-[#9A7209] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                Carnet
              </button>
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