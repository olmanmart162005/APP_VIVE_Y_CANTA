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
  Mail,
  User,
} from "lucide-react"
import { toast } from "react-hot-toast"
import Avatar from "react-avatar"

import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import { calculateAgeFromBirthdate, SYSTEM_ROLES, ACCOUNT_STATES } from "../services/memberService"

function MemberDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [member, setMember] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [role, setRole] = useState("integrante")
  const [estado, setEstado] = useState("activo")
  const [loading, setLoading] = useState(true)
  const [savingAdminChanges, setSavingAdminChanges] = useState(false)

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
        setEstado(data.estado || "activo")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar detalles del integrante")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
      await loadMember()
    }
    initialize()
  }, [id])

  const saveAdminSettings = async () => {
    if (!member) return
    if (currentUser?.id === member.id && (role !== "admin" || estado !== "activo")) {
      toast.error("Por seguridad, no puedes degradar tu propio rol ni desactivar tu cuenta.")
      return
    }

    try {
      setSavingAdminChanges(true)
      const { error } = await supabase
        .from("profiles")
        .update({
          role,
          estado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id)

      if (error) throw error

      setMember((prev) => ({ ...prev, role, estado }))
      toast.success("Configuración administrativa del integrante actualizada")
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Error al actualizar el rol y estado")
    } finally {
      setSavingAdminChanges(false)
    }
  }

  const getRoleName = (r) => {
    const found = SYSTEM_ROLES.find((item) => item.value === r)
    return found ? found.label : "Integrante"
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

  const computedAge =
    member?.edad ?? calculateAgeFromBirthdate(member?.fecha_nacimiento)

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER ELEGANTE */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-6 pb-12 shadow-lg relative overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/members")}
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

      {/* CONTENEDOR PRINCIPAL */}
      <div className="px-4 max-w-3xl mx-auto mt-6">
        <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-color)] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
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

          <h2 className="title-professional text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mt-4 tracking-tight break-words">
            {member?.nombre_completo || "Integrante sin nombre"}
          </h2>

          {member?.usuario && (
            <p className="text-xs font-mono font-bold text-[var(--gold)] mt-1">
              @{member.usuario}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#D4AF37]/15 text-[#D4AF37] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border border-[#D4AF37]/30">
              <Shield size={12} />
              {getRoleName(member?.role)}
            </span>

            <span
              className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                member?.estado === "retirado"
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : member?.estado === "permiso"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {member?.estado === "retirado"
                ? "Desactivado"
                : member?.estado === "permiso"
                ? "En Permiso"
                : "Activo"}
            </span>

            {member?.ministerio && (
              <span className="inline-flex items-center text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] font-bold px-3 py-1 rounded-full border border-[var(--border-color)]">
                {member.ministerio}
              </span>
            )}
          </div>

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

        {/* ADMINISTRACIÓN DE ROL Y ESTADO DE CUENTA (SOLO ADMINISTRADOR) */}
        {currentUser?.role === "admin" && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[28px] p-5 sm:p-6 mt-5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                Gestión de Rol y Estado de Cuenta (Administrador)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">
                  Rol del Sistema
                </label>
                <select
                  value={role}
                  disabled={currentUser?.id === member?.id}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-premium w-full text-xs sm:text-sm font-semibold"
                >
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">
                  Estado de Cuenta
                </label>
                <select
                  value={estado}
                  disabled={currentUser?.id === member?.id}
                  onChange={(e) => setEstado(e.target.value)}
                  className="input-premium w-full text-xs sm:text-sm font-semibold"
                >
                  {ACCOUNT_STATES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:pt-5">
                <button
                  onClick={saveAdminSettings}
                  disabled={savingAdminChanges}
                  className="btn-primary w-full !py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingAdminChanges ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DATOS DETALLADOS DEL INTEGRANTE */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
            Información de Contacto y Registro
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCard icon={<User size={18} />} title="Nombre de Usuario" value={member?.usuario ? `@${member.usuario}` : null} />
            <InfoCard icon={<Mail size={18} />} title="Correo Electrónico" value={member?.email} />
            <InfoCard icon={<Phone size={18} />} title="Teléfono" value={member?.telefono} />
            <InfoCard icon={<IdCard size={18} />} title="Identidad (DNI)" value={member?.dni} />
            <InfoCard
              icon={<Calendar size={18} />}
              title="Fecha de Nacimiento y Edad"
              value={
                member?.fecha_nacimiento
                  ? `${member.fecha_nacimiento}${computedAge !== null ? ` (${computedAge} años)` : ""}`
                  : computedAge !== null
                  ? `${computedAge} años`
                  : null
              }
            />
            <InfoCard icon={<Heart size={18} />} title="Tipo de Sangre" value={member?.tipo_sangre} />
            <InfoCard icon={<MapPin size={18} />} title="Dirección" value={member?.direccion} />
            <InfoCard
              icon={<ShieldAlert size={18} />}
              title="Contacto de Emergencia"
              value={
                member?.contacto_emergencia || member?.contacto_emergencia_nombre
                  ? `${member.contacto_emergencia || member.contacto_emergencia_nombre}${
                      member.telefono_emergencia || member.contacto_emergencia_telefono
                        ? ` (${member.telefono_emergencia || member.contacto_emergencia_telefono})`
                        : ""
                    }`
                  : null
              }
            />
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
