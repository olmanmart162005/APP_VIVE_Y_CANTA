import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  Heart,
  ShieldAlert,
  Save,
  CreditCard,
  Shield,
  Loader2,
} from "lucide-react"
import { toast } from "react-hot-toast"
import Avatar from "react-avatar"

import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"

function MemberDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [member, setMember] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState(false)

  const loadMember = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      if (data) {
        setMember(data)
        setRole(data.role || "integrante")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar detalles del integrante")
    } finally {
      setLoading(false)
    }
  }

  const initialize = async () => {
    const user = await getCurrentUser()
    setCurrentUser(user)
    await loadMember()
  }

  useEffect(() => {
    initialize()
  }, [id])

  const saveRole = async () => {
    try {
      setSavingRole(true)
      const { error } = await supabase
        .from("profiles")
        .update({ role: role })
        .eq("id", member.id)

      if (error) throw error

      setMember((prev) => ({ ...prev, role: role }))
      toast.success("Rol actualizado correctamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al intentar actualizar el rol")
    } finally {
      setSavingRole(false)
    }
  }

  const getRoleName = (r) => {
    switch (r) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] pb-32 flex items-center justify-center">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center gap-3 px-6 py-4 shadow-xl">
          <Loader2 className="animate-spin text-[#D4AF37]" size={22} />
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Cargando datos del integrante…
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER ELEGANTE CON ESPACIADO CUIDADO - SIN SUPERPOSICIONES */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-6 pb-12 shadow-lg relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 header-chip px-3 py-1.5 rounded-full hover:opacity-85 transition font-bold text-xs mb-3 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Volver a Integrantes</span>
          </button>
          <p className="header-text-secondary text-[11px] uppercase font-bold tracking-widest">
            Coro Vive y Canta · Esquipulas
          </p>
          <h1 className="title-professional title-gold-black text-2xl sm:text-3xl mt-0.5 tracking-tight">
            Ficha de Integrante
          </h1>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL CON MARGEN SUPERIOR LIMPIO */}
      <div className="px-4 max-w-3xl mx-auto mt-6">
        {/* TARJETA DE IDENTIFICACIÓN */}
        <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-color)] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
          {/* FOTO CON ANILLO METÁLICO DORADO */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto relative p-1 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-card)] p-0.5">
              {member?.foto || member?.foto_url ? (
                <img
                  src={member.foto || member.foto_url}
                  alt={member?.nombre_completo || "Integrante"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Avatar
                  name={member?.nombre_completo || "Usuario"}
                  size="120"
                  round={true}
                  color="#252525"
                  textColor="#D4AF37"
                  className="font-bold"
                />
              )}
            </div>
          </div>

          {/* NOMBRE COMPLETO CON ESPACIADO PROPIO */}
          <h2 className="title-professional text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-4 tracking-tight break-words">
            {member?.nombre_completo || "Integrante sin nombre"}
          </h2>

          {/* BADGES DE ROL Y ESTADO */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#D4AF37]/15 text-[#D4AF37] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border border-[#D4AF37]/30">
              <Shield size={12} />
              {getRoleName(member?.role)}
            </span>
            <span className="inline-flex items-center text-xs bg-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/30">
              Activo
            </span>
            {member?.ministerio && (
              <span className="inline-flex items-center text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] font-bold px-3 py-1 rounded-full border border-[var(--border-color)]">
                {member.ministerio}
              </span>
            )}
          </div>

          {/* BOTÓN VER CARNET OFICIAL */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => navigate(`/carnet/${member.id}`)}
              className="btn-secondary !py-2.5 inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <CreditCard size={15} />
              <span>Ver Carnet Oficial</span>
            </button>
          </div>
        </div>

        {/* ADMINISTRACIÓN DE ROL DE USUARIO (SOLO ADMINS) */}
        {currentUser?.role === "admin" && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[28px] p-5 sm:p-6 mt-5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                Gestión de Rol de Usuario (Administrador)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-premium w-full text-sm font-semibold"
                >
                  <option value="admin">Administrador</option>
                  <option value="director">Director</option>
                  <option value="tesorero">Tesorero</option>
                  <option value="secretaria">Secretaria</option>
                  <option value="integrante">Integrante</option>
                </select>
              </div>

              <button
                onClick={saveRole}
                disabled={savingRole}
                className="btn-primary w-full !py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingRole ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>Guardar Rol</span>
              </button>
            </div>
          </div>
        )}

        {/* DATOS DETALLADOS DEL INTEGRANTE */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
            Información de Contacto y Registro
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCard icon={<Phone size={18} />} title="Teléfono" value={member?.telefono} />
            <InfoCard icon={<MapPin size={18} />} title="Dirección" value={member?.direccion} />
            <InfoCard icon={<IdCard size={18} />} title="Identidad (DNI)" value={member?.dni} />
            <InfoCard icon={<Calendar size={18} />} title="Fecha de Nacimiento" value={member?.fecha_nacimiento} />
            <InfoCard icon={<Heart size={18} />} title="Tipo de Sangre" value={member?.tipo_sangre} />
            <InfoCard icon={<ShieldAlert size={18} />} title="Contacto de Emergencia" value={member?.contacto_emergencia} />
            <InfoCard icon={<Phone size={18} />} title="Teléfono de Emergencia" value={member?.telefono_emergencia} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition-all hover:border-[#D4AF37]/30">
      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0 border border-[#D4AF37]/20">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {title}
        </p>
        <p className="font-semibold text-sm text-[var(--text-primary)] mt-0.5 break-words">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  )
}

export default MemberDetails
