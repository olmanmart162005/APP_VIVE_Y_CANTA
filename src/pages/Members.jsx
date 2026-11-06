import { useEffect, useState, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"
import {
  Search,
  ChevronRight,
  X,
  Phone,
  MessageCircle,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Heart,
  Star,
  Plus,
  Loader2,
  UserPlus,
  Edit3,
  Trash2,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Camera,
  UserCheck,
  UserX,
  KeyRound,
  IdCard,
  Mail,
} from "lucide-react"
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { supabase } from "../lib/supabase"
import {
  SYSTEM_ROLES,
  ACCOUNT_STATES,
  BLOOD_TYPES,
  AUTH_DOMAIN,
  calculateAgeFromBirthdate,
  splitFullName,
  suggestUsername,
  formatHondurasPhone,
  formatHondurasDni,
  createMemberAccount,
  updateMemberProfile,
  inspectMemberHistory,
  deactivateMemberAccount,
  deleteMemberAccountSafely,
  countActiveAdmins,
} from "../services/memberService"

// =============================================================================
// MODAL 1: + AGREGAR INTEGRANTE (Sección 1.A y 1.B)
// =============================================================================
function ModalAgregarIntegrante({ onClose, onSuccess, members }) {
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    usuario: "",
    email: "",
    telefono: "",
    fecha_nacimiento: "",
    edad: "",
    tipo_sangre: "",
    dni: "",
    role: "integrante",
    estado: "activo",
  })
  const [usuarioEditedManually, setUsuarioEditedManually] = useState(false)
  const [emailEditedManually, setEmailEditedManually] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const updateNameAndAutoFields = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (!usuarioEditedManually) {
        const suggested = suggestUsername(next.nombres, next.apellidos, members)
        next.usuario = suggested
        if (!emailEditedManually) {
          next.email = suggested ? `${suggested}@${AUTH_DOMAIN}` : ""
        }
      }
      return next
    })
    setErrors((p) => ({ ...p, [field]: null, global: null }))
  }

  const handleUsuarioChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "")
    setUsuarioEditedManually(true)
    setForm((prev) => ({
      ...prev,
      usuario: val,
      email: !emailEditedManually ? (val ? `${val}@${AUTH_DOMAIN}` : "") : prev.email,
    }))
    setErrors((p) => ({ ...p, usuario: null, global: null }))
  }

  const handleBirthdateChange = (e) => {
    const fecha = e.target.value
    const calculated = calculateAgeFromBirthdate(fecha)
    setForm((prev) => ({
      ...prev,
      fecha_nacimiento: fecha,
      edad: calculated !== null ? String(calculated) : "",
    }))
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida (JPG, PNG o WEBP)")
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const validateForm = () => {
    const e = {}
    if (!form.nombres.trim()) e.nombres = "Ingresa los nombres"
    if (!form.apellidos.trim()) e.apellidos = "Ingresa los apellidos"

    const cleanUser = form.usuario.trim().toLowerCase()
    if (!cleanUser) {
      e.usuario = "El nombre de usuario es obligatorio"
    } else if (!/^[a-z0-9._-]+$/.test(cleanUser)) {
      e.usuario = "Usa solo letras minúsculas, números, puntos o guiones"
    } else if (members.some((m) => String(m.usuario || "").toLowerCase() === cleanUser)) {
      e.usuario = "Este nombre de usuario ya está registrado"
    }

    const cleanEmail = (form.email.trim() || `${cleanUser}@${AUTH_DOMAIN}`).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      e.email = "Formato de correo electrónico inválido"
    } else if (
      members.some((m) => m.email && String(m.email).trim().toLowerCase() === cleanEmail)
    ) {
      e.email = "Este correo electrónico ya pertenece a otro integrante"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      setErrors({})
      const created = await createMemberAccount({
        ...form,
        photoFile,
        existingMembers: members,
      })
      onSuccess(created)
    } catch (err) {
      setErrors({ global: err.message || "Error al registrar el integrante." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div className="bg-[var(--bg-card)] w-full max-w-2xl rounded-[28px] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera Dorada */}
        <div className="page-header-gold px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/15 flex items-center justify-center border border-black/20">
              <UserPlus size={19} className="header-text-primary" />
            </div>
            <div>
              <p className="header-text-secondary text-[10px] font-bold uppercase tracking-widest">
                Administración Oficial
              </p>
              <h2 className="title-professional title-gold-black text-lg sm:text-xl font-bold leading-tight">
                Agregar Nuevo Integrante
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-1.5 bg-black/15 hover:bg-black/25 rounded-full text-[var(--header-text-primary)] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario desplazable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errors.global && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errors.global}</span>
            </div>
          )}

          {/* Fotografía de Perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-[var(--bg-muted)]/60 border border-[var(--border-color)]">
            <div
              onClick={() => !saving && fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37] cursor-pointer shrink-0 group"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-card)] flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <Avatar
                    name={`${form.nombres} ${form.apellidos}`.trim() || "Nuevo Integrante"}
                    size="76"
                    round={true}
                    color="#252525"
                    textColor="#D4AF37"
                  />
                )}
              </div>
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#D4AF37] text-[#111111] shadow-md border border-black/20">
                <Camera size={12} />
              </span>
            </div>

            <div className="text-center sm:text-left flex-1">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Fotografía de Perfil del Integrante
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Opcional. Se mostrará en el directorio y en el carnet oficial del coro.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-3 py-1 rounded-xl bg-[#D4AF37]/15 text-[var(--gold)] border border-[#D4AF37]/30 text-[11px] font-bold cursor-pointer"
              >
                {photoFile ? "Cambiar fotografía" : "Seleccionar fotografía"}
              </button>
            </div>
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Nombres <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={saving}
                value={form.nombres}
                onChange={(e) => updateNameAndAutoFields("nombres", e.target.value)}
                placeholder="Ej. Carlos Eduardo"
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
              {errors.nombres && <p className="text-[10px] text-red-400 mt-1">{errors.nombres}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Apellidos <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={saving}
                value={form.apellidos}
                onChange={(e) => updateNameAndAutoFields("apellidos", e.target.value)}
                placeholder="Ej. Martínez Gómez"
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
              {errors.apellidos && (
                <p className="text-[10px] text-red-400 mt-1">{errors.apellidos}</p>
              )}
            </div>
          </div>

          {/* Nombre de Usuario y Correo Electrónico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Nombre de Usuario (Único) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={saving}
                value={form.usuario}
                onChange={handleUsuarioChange}
                placeholder="carlos.martinez"
                className="input-premium w-full text-xs sm:text-sm font-bold text-[var(--gold)]"
              />
              {errors.usuario ? (
                <p className="text-[10px] text-red-400 mt-1">{errors.usuario}</p>
              ) : (
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Iniciará sesión escribiendo solo: <strong>{form.usuario || "usuario"}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Correo Electrónico <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                disabled={saving}
                value={form.email}
                onChange={(e) => {
                  setEmailEditedManually(true)
                  setForm((p) => ({ ...p, email: e.target.value }))
                  setErrors((p) => ({ ...p, email: null }))
                }}
                placeholder="usuario@viveycanta.app"
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
              {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Teléfono y DNI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Número de Teléfono
              </label>
              <input
                type="tel"
                disabled={saving}
                value={form.telefono}
                onChange={(e) =>
                  setForm((p) => ({ ...p, telefono: formatHondurasPhone(e.target.value) }))
                }
                placeholder="9999-9999"
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                DNI / Identidad
              </label>
              <input
                type="text"
                disabled={saving}
                value={form.dni}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dni: formatHondurasDni(e.target.value) }))
                }
                placeholder="0601-2000-00000"
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          {/* Fecha de Nacimiento, Edad Automática y Tipo de Sangre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                disabled={saving}
                value={form.fecha_nacimiento}
                onChange={handleBirthdateChange}
                className="input-premium w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Edad (Automática)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                disabled={saving}
                value={form.edad}
                onChange={(e) => setForm((p) => ({ ...p, edad: e.target.value }))}
                placeholder="Se calcula al elegir fecha"
                className="input-premium w-full text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Tipo de Sangre
              </label>
              <select
                disabled={saving}
                value={form.tipo_sangre}
                onChange={(e) => setForm((p) => ({ ...p, tipo_sangre: e.target.value }))}
                className="input-premium w-full text-xs font-semibold"
              >
                <option value="">Seleccionar...</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rol dentro del sistema y Estado de la cuenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Rol dentro del Sistema <span className="text-red-400">*</span>
              </label>
              <select
                disabled={saving}
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-bold"
              >
                {SYSTEM_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 ml-1">
                Estado de la Cuenta
              </label>
              <select
                disabled={saving}
                value={form.estado}
                onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              >
                {ACCOUNT_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aviso de Contraseña Temporal Individual */}
          <div className="p-3.5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-start gap-3">
            <KeyRound size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)] block">
                Contraseña temporal única y cambio obligatorio activado
              </strong>
              Al registrar al integrante se generará una contraseña temporal exclusiva y se activará{" "}
              <code className="text-[var(--gold)] font-bold">debe_cambiar_password = true</code> para que cree su clave personal en su primer acceso.
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-[2] py-3 text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#111111]" />
                  <span>Creando Cuenta e Integrante…</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Registrar Integrante</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// MODAL 2: CREDENCIALES TEMPORALES ÚNICAS PARA ENTREGAR AL INTEGRANTE
// =============================================================================
function ModalCredencialesTemporales({ data, onClose }) {
  const [copied, setCopied] = useState(false)

  const instructionsText = ` Coro de Alabanza Vive y Canta\nHola ${data.nombre_completo}, tu cuenta oficial ha sido creada:\n\n👤 Usuario: ${data.usuario}\n🔑 Contraseña temporal: ${data.temporaryPassword}\n\nAl iniciar sesión por primera vez, el sistema te pedirá crear tu propia contraseña personal privada.`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(instructionsText)
      setCopied(true)
      toast.success("Credenciales copiadas al portapapeles")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error("No se pudo copiar automáticamente")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[120] p-4">
      <div className="bg-[var(--bg-card)] border border-[#D4AF37]/40 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="page-header-gold px-6 py-5 text-center">
          <div className="w-14 h-14 rounded-full bg-black/15 border border-black/25 flex items-center justify-center mx-auto mb-2 text-[#111111]">
            <KeyRound size={26} />
          </div>
          <h3 className="title-professional title-gold-black text-xl font-bold">
            ¡Cuenta Creada con Éxito!
          </h3>
          <p className="header-text-secondary text-xs mt-0.5">
            Entrega estas credenciales temporales de forma privada al integrante
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-3">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Integrante
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{data.nombre_completo}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color)]">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Usuario de Acceso
                </p>
                <p className="text-base font-extrabold text-[var(--gold)] font-mono mt-0.5">
                  {data.usuario}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Contraseña Temporal Única
                </p>
                <p className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 select-all">
                  {data.temporaryPassword}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 leading-relaxed">
            <strong>Seguridad:</strong> Esta contraseña temporal es exclusiva para{" "}
            <strong>{data.usuario}</strong> y no queda guardada en registros. En su primer inicio de sesión deberá cambiarla obligatoriamente.
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary flex-1 py-3 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span>{copied ? "¡Copiado!" : "Copiar Instrucciones"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-primary flex-1 py-3 text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MODAL 3: EDITAR INTEGRANTE (Sección 1.C)
// =============================================================================
function ModalEditarIntegrante({ member, currentUser, members, onClose, onSaved }) {
  const initialNames = useMemo(
    () => splitFullName(member?.nombre_completo || ""),
    [member?.nombre_completo]
  )

  const [form, setForm] = useState({
    nombres: initialNames.nombres,
    apellidos: initialNames.apellidos,
    email: member?.email || "",
    telefono: member?.telefono || "",
    fecha_nacimiento: member?.fecha_nacimiento ? String(member.fecha_nacimiento).slice(0, 10) : "",
    edad:
      member?.edad ??
      (member?.fecha_nacimiento ? calculateAgeFromBirthdate(member.fecha_nacimiento) ?? "" : ""),
    tipo_sangre: member?.tipo_sangre || "",
    dni: member?.dni || "",
    direccion: member?.direccion || "",
    ministerio: member?.ministerio || "",
    contacto_emergencia:
      member?.contacto_emergencia || member?.contacto_emergencia_nombre || "",
    telefono_emergencia:
      member?.telefono_emergencia || member?.contacto_emergencia_telefono || "",
    role: member?.role || "integrante",
    estado: member?.estado || "activo",
    debe_cambiar_password: Boolean(member?.debe_cambiar_password),
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(member?.foto || member?.foto_url || "")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const fileInputRef = useRef(null)

  const handleBirthdateChange = (e) => {
    const fecha = e.target.value
    const calculated = calculateAgeFromBirthdate(fecha)
    setForm((prev) => ({
      ...prev,
      fecha_nacimiento: fecha,
      edad: calculated !== null ? String(calculated) : "",
    }))
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido")
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    try {
      setSaving(true)
      const updated = await updateMemberProfile({
        memberId: member.id,
        ...form,
        photoFile,
        currentPhotoUrl: member?.foto || member?.foto_url || null,
        currentUser,
        existingMembers: members,
      })
      toast.success("Datos del integrante actualizados correctamente")
      onSaved(updated)
    } catch (err) {
      setErrorMsg(err.message || "Error al actualizar el perfil del integrante")
    } finally {
      setSaving(false)
    }
  }

  const isEditingSelf = currentUser?.id === member?.id

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div className="bg-[var(--bg-card)] w-full max-w-2xl rounded-[28px] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="page-header-gold px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Edit3 size={19} className="header-text-primary" />
            <div>
              <h2 className="title-professional title-gold-black text-lg sm:text-xl font-bold leading-tight">
                Editar Integrante
              </h2>
              <p className="header-text-secondary text-[11px]">
                Usuario de acceso: @{member?.usuario}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-1.5 bg-black/15 hover:bg-black/25 rounded-full text-[var(--header-text-primary)] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Foto de perfil */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--bg-muted)]/60 border border-[var(--border-color)]">
            <div
              onClick={() => !saving && fileInputRef.current?.click()}
              className="relative w-18 h-18 rounded-full p-0.5 bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37] cursor-pointer shrink-0"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--bg-card)]">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Avatar
                    name={member?.nombre_completo || "Integrante"}
                    size="64"
                    round={true}
                    color="#252525"
                    textColor="#D4AF37"
                  />
                )}
              </div>
              <span className="absolute bottom-0 right-0 p-1 rounded-full bg-[#D4AF37] text-[#111111]">
                <Camera size={11} />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {member?.nombre_completo}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Cuenta Auth vinculada: <span className="font-mono">@{member?.usuario}</span> (intacta)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 text-[11px] font-bold text-[var(--gold)] hover:underline cursor-pointer"
              >
                Cambiar fotografía de perfil
              </button>
            </div>
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Nombres <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nombres}
                onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm((p) => ({ ...p, apellidos: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          {/* Correo, Teléfono y DNI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="input-premium w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) =>
                  setForm((p) => ({ ...p, telefono: formatHondurasPhone(e.target.value) }))
                }
                placeholder="9999-9999"
                className="input-premium w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                DNI
              </label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) =>
                  setForm((p) => ({ ...p, dni: formatHondurasDni(e.target.value) }))
                }
                placeholder="0601-2000-00000"
                className="input-premium w-full text-xs font-semibold"
              />
            </div>
          </div>

          {/* Fecha de nacimiento, Edad y Tipo de Sangre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={handleBirthdateChange}
                className="input-premium w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Edad
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={form.edad}
                onChange={(e) => setForm((p) => ({ ...p, edad: e.target.value }))}
                className="input-premium w-full text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Tipo de Sangre
              </label>
              <select
                value={form.tipo_sangre}
                onChange={(e) => setForm((p) => ({ ...p, tipo_sangre: e.target.value }))}
                className="input-premium w-full text-xs font-semibold"
              >
                <option value="">Sin especificar</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dirección y Ministerio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                placeholder="Barrio / Colonia..."
                className="input-premium w-full text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Ministerio / Función Coral
              </label>
              <input
                type="text"
                value={form.ministerio}
                onChange={(e) => setForm((p) => ({ ...p, ministerio: e.target.value }))}
                placeholder="Ej. Voces, Guitarra, Teclado..."
                className="input-premium w-full text-xs font-semibold"
              />
            </div>
          </div>

          {/* Rol y Estado de la Cuenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-[var(--border-color)]">
            <div>
              <label className="block text-[10px] font-bold text-[var(--gold)] uppercase tracking-wider mb-1">
                Rol dentro del Sistema
              </label>
              <select
                disabled={isEditingSelf}
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-bold"
              >
                {SYSTEM_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {isEditingSelf && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  No puedes degradar tu propio rol de administrador.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--gold)] uppercase tracking-wider mb-1">
                Estado de la Cuenta (Activar / Desactivar)
              </label>
              <select
                disabled={isEditingSelf}
                value={form.estado}
                onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                className="input-premium w-full text-xs sm:text-sm font-bold"
              >
                {ACCOUNT_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opción para exigir cambio de contraseña en el próximo inicio de sesión */}
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-muted)]/60 border border-[var(--border-color)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.debe_cambiar_password}
              onChange={(e) =>
                setForm((p) => ({ ...p, debe_cambiar_password: e.target.checked }))
              }
              className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-[var(--text-primary)] block">
                Solicitar cambio obligatorio de contraseña en su próximo inicio de sesión
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Si está activo, el sistema le pedirá actualizar su contraseña antes de entrar al Dashboard.
              </span>
            </div>
          </label>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-[2] py-3 text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[#111111]" />
                  <span>Guardando cambios…</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// MODAL 4: ELIMINAR O DESACTIVAR INTEGRANTE DE FORMA SEGURA (Sección 1.D)
// =============================================================================
function ModalConfirmarEliminacion({
  member,
  currentUser,
  members,
  onClose,
  onCompleted,
}) {
  const [history, setHistory] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const isSelf = currentUser?.id === member?.id
  const isLastActiveAdmin =
    member?.role === "admin" && countActiveAdmins(members, member.id) < 1

  useEffect(() => {
    let active = true
    inspectMemberHistory(member?.id)
      .then((res) => {
        if (active) setHistory(res)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingHistory(false)
      })
    return () => {
      active = false
    }
  }, [member?.id])

  const handleDeactivate = async () => {
    setErrorMsg("")
    try {
      setProcessing(true)
      await deactivateMemberAccount({
        member,
        currentUser,
        existingMembers: members,
      })
      toast.success(`La cuenta de ${member.nombre_completo} fue desactivada conservando su historial.`)
      onCompleted("deactivated")
    } catch (err) {
      setErrorMsg(err.message || "Error al desactivar la cuenta.")
    } finally {
      setProcessing(false)
    }
  }

  const handlePermanentDelete = async () => {
    setErrorMsg("")
    try {
      setProcessing(true)
      await deleteMemberAccountSafely({
        member,
        currentUser,
        existingMembers: members,
      })
      toast.success(`Cuenta de ${member.nombre_completo} eliminada correctamente.`)
      onCompleted("deleted")
    } catch (err) {
      setErrorMsg(err.message || "Error al eliminar la cuenta.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[120] p-4">
      <div className="bg-[var(--bg-card)] border border-red-500/35 w-full max-w-md rounded-[28px] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>

        <div className="text-center">
          <h3 className="title-professional text-xl font-bold text-[var(--text-primary)]">
            Administración de Baja / Eliminación
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Cuenta seleccionada:{" "}
            <strong className="text-[var(--text-primary)]">{member?.nombre_completo}</strong> (@
            {member?.usuario})
          </p>
        </div>

        {/* Bloqueo si es la propia cuenta o el último administrador */}
        {(isSelf || isLastActiveAdmin) ? (
          <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-semibold text-center leading-relaxed">
            {isSelf
              ? "Por seguridad, no puedes eliminar ni desactivar tu propia cuenta de administrador."
              : "Operación bloqueada: No se puede eliminar ni desactivar al último administrador activo del sistema."}
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Resumen de historial asociado */}
            <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2 text-xs">
              {loadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-2 text-[var(--text-secondary)]">
                  <Loader2 size={15} className="animate-spin text-[#D4AF37]" />
                  <span>Verificando historial de actividades y finanzas…</span>
                </div>
              ) : history?.has_history ? (
                <>
                  <p className="font-bold text-[#D4AF37]">
                    Registros históricos asociados a este integrante ({history.total}):
                  </p>
                  <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 pl-2">
                    {history.financial_records > 0 && (
                      <li>• {history.financial_records} movimientos financieros registrados</li>
                    )}
                    {history.activities > 0 && (
                      <li>• {history.activities} actividades del coro registradas</li>
                    )}
                    {history.notices > 0 && <li>• {history.notices} avisos publicados</li>}
                    {history.hojas_cantos > 0 && (
                      <li>• {history.hojas_cantos} hojas de cantos creadas</li>
                    )}
                    {history.gallery > 0 && <li>• {history.gallery} fotografías en galería</li>}
                  </ul>
                  <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                    ✓ Los movimientos financieros y actividades históricas del coro están protegidos y NUNCA se borrarán.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-[var(--text-secondary)] text-center">
                  Esta cuenta no registra movimientos financieros ni actividades creadas.
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {member?.estado !== "retirado" && (
                <button
                  type="button"
                  disabled={processing || loadingHistory}
                  onClick={handleDeactivate}
                  className="w-full py-3 px-4 rounded-2xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserX size={15} />
                  <span>Desactivar Cuenta y Conservar Ficha (Recomendado)</span>
                </button>
              )}

              <button
                type="button"
                disabled={processing || loadingHistory}
                onClick={handlePermanentDelete}
                className="btn-danger w-full py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {processing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Procesando…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Eliminar Cuenta Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          disabled={processing}
          onClick={onClose}
          className="btn-secondary w-full py-2.5 text-xs cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// COMPONENTE PRINCIPAL: INTEGRANTES (Members.jsx)
// =============================================================================
function Members() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterState, setFilterState] = useState("todos") // "todos" | "activos" | "inactivos" | "directiva"

  const [selectedMember, setSelectedMember] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [memberToEdit, setMemberToEdit] = useState(null)
  const [memberToDelete, setMemberToDelete] = useState(null)

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) return

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (data) {
        setCurrentUser(data)
      } else {
        setCurrentUser({ id: user.id, role: "integrante" })
      }
    } catch {
      setCurrentUser({ role: "integrante" })
    }
  }

  const loadMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nombre_completo", { ascending: true })
      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar la lista de integrantes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentUser()
    loadMembers()
  }, [])

  const isAdmin = currentUser?.role === "admin"

  const getRoleName = (role) => {
    const found = SYSTEM_ROLES.find((r) => r.value === role)
    return found ? found.label : "Integrante"
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/35"
      case "director":
        return "bg-[#BFA15A]/15 text-[#BFA15A] border-[#BFA15A]/35"
      case "secretaria":
        return "bg-amber-500/10 text-amber-300 border-amber-500/25"
      case "tesorero":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
      case "parroco":
        return "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40"
      default:
        return "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)]"
    }
  }

  const getStateBadge = (estado) => {
    if (estado === "retirado") {
      return {
        label: "Desactivado",
        cls: "bg-red-500/15 text-red-400 border-red-500/30",
        dot: "bg-red-500",
      }
    }
    if (estado === "permiso") {
      return {
        label: "En permiso",
        cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        dot: "bg-amber-400",
      }
    }
    return {
      label: "Activo",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400",
    }
  }

  const calcularAntiguedad = (fechaIngreso) => {
    if (!fechaIngreso) return null
    const hoy = new Date()
    const ingreso = new Date(String(fechaIngreso).slice(0, 10) + "T12:00:00")
    if (Number.isNaN(ingreso.getTime())) return null
    let anios = hoy.getFullYear() - ingreso.getFullYear()
    const m = hoy.getMonth() - ingreso.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) anios--
    return anios <= 0 ? "Nuevo ingreso" : `${anios} ${anios === 1 ? "año" : "años"}`
  }

  const stats = useMemo(() => {
    const total = members.length
    const activos = members.filter(
      (m) => m.estado === "activo" || m.estado === undefined || m.estado === null
    ).length
    const inactivos = members.filter((m) => m.estado === "retirado" || m.estado === "permiso").length
    return { total, activos, inactivos }
  }, [members])

  const cumpleaniosMes = useMemo(() => {
    const hoy = new Date()
    const mesActual = hoy.getMonth()
    return members
      .filter((m) => {
        if (!m.fecha_nacimiento) return false
        const cumple = new Date(String(m.fecha_nacimiento).slice(0, 10) + "T12:00:00")
        return !Number.isNaN(cumple.getTime()) && cumple.getMonth() === mesActual
      })
      .map((m) => {
        const cumpleOriginal = new Date(String(m.fecha_nacimiento).slice(0, 10) + "T12:00:00")
        const cumpleEsteAnio = new Date(
          hoy.getFullYear(),
          cumpleOriginal.getMonth(),
          cumpleOriginal.getDate()
        )
        const diffTime = cumpleEsteAnio - hoy
        let diasFaltantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diasFaltantes < 0) diasFaltantes = 0
        return { ...m, diasFaltantes, diaMes: cumpleOriginal.getDate() }
      })
      .sort((a, b) => a.diaMes - b.diaMes)
  }, [members])

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (filterState === "activos" && member.estado && member.estado !== "activo") return false
      if (filterState === "inactivos" && (!member.estado || member.estado === "activo")) {
        return false
      }
      if (
        filterState === "directiva" &&
        !["admin", "director", "tesorero", "secretaria", "parroco"].includes(member.role)
      ) {
        return false
      }

      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        member.nombre_completo?.toLowerCase().includes(q) ||
        member.telefono?.toLowerCase().includes(q) ||
        member.ministerio?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||
        member.usuario?.toLowerCase().includes(q) ||
        member.dni?.toLowerCase().includes(q)
      )
    })
  }, [members, search, filterState])

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* ENCABEZADO DORADO EJECUTIVO */}
      <div className="page-header-gold rounded-b-[36px] relative overflow-hidden shadow-xl">
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-6 pb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="header-text-primary">
              <p className="header-text-secondary text-xs font-semibold tracking-widest uppercase mb-1">
                Coro de Alabanza Vive y Canta
              </p>
              <h1 className="title-professional title-gold-black text-3xl sm:text-4xl tracking-tight">
                Directorio de Integrantes
              </h1>
              <div className="flex gap-2 mt-3.5 flex-wrap">
                <div className="header-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="header-text-primary text-xs font-bold">
                    {stats.activos} activos
                  </span>
                </div>
                {stats.inactivos > 0 && (
                  <div className="header-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5">
                    <span className="header-text-primary text-xs font-bold">
                      {stats.inactivos} en permiso / inactivos
                    </span>
                  </div>
                )}
                <div className="header-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5">
                  <Star size={12} />
                  <span className="header-text-primary text-xs font-bold">
                    {cumpleaniosMes.length} cumpleaños este mes
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="header-chip rounded-2xl px-4 py-2.5 text-center backdrop-blur-xs">
                <p className="text-2xl font-black leading-none">{stats.total}</p>
                <p className="header-text-secondary text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Miembros
                </p>
              </div>

              {/* BOTÓN DESTACADO: + AGREGAR INTEGRANTE (Sección 1.A) */}
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-3.5 rounded-2xl bg-[#111111] hover:bg-[#252525] text-[#D4AF37] border border-[#D4AF37]/40 font-extrabold text-xs sm:text-sm uppercase tracking-wider inline-flex items-center gap-2 shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={18} strokeWidth={2.8} />
                  <span>Agregar Integrante</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-5 mt-2">
        {/* Columna izquierda: Buscador, Filtros y Cumpleaños */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-[var(--bg-card)] rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-[var(--border-color)] shadow-sm focus-within:border-[var(--gold)]/60 transition-all">
            <Search className="text-[var(--gold)] shrink-0" size={17} />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario, DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="members-search-input w-full outline-none bg-transparent text-sm font-semibold placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filtros rápidos de estado / rol */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-3 border border-[var(--border-color)] grid grid-cols-2 gap-1.5">
            {[
              { id: "todos", label: "Todos" },
              { id: "activos", label: "Activos" },
              { id: "directiva", label: "Directiva" },
              { id: "inactivos", label: "Inactivos" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterState(tab.id)}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  filterState === tab.id
                    ? "bg-[#D4AF37] text-[#111111] shadow-sm"
                    : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Cumpleaños del mes */}
          <div className="bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-md">
            <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] px-4 py-3 flex items-center gap-2 text-black">
              <span className="text-lg">🎂</span>
              <h3 className="text-black text-xs font-black uppercase tracking-wider">
                Cumpleaños del mes
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
              {cumpleaniosMes.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-6 italic">
                  Ningún cumpleaños registrado este mes.
                </p>
              ) : (
                cumpleaniosMes.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)]"
                  >
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7209] flex items-center justify-center text-black">
                      <p className="text-[11px] font-black">{m.diaMes}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {m.nombre_completo}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                        {m.diasFaltantes === 0
                          ? "🎉 ¡Hoy cumple años!"
                          : `Faltan ${m.diasFaltantes} días`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Lista de tarjetas de integrantes */}
        <div className="space-y-4 lg:col-span-3">
          {loading ? (
            <div className="bg-[var(--bg-card)] rounded-3xl p-12 text-center border border-[var(--border-color)] flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#D4AF37]" size={28} />
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Cargando directorio de integrantes…
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map((member) => {
                  const edad =
                    member.edad ?? calculateAgeFromBirthdate(member.fecha_nacimiento)
                  const antiguedad = calcularAntiguedad(member.fecha_ingreso)
                  const stateBadge = getStateBadge(member.estado)

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={`bg-[var(--bg-card)] rounded-[22px] p-4 border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                        member.estado === "retirado"
                          ? "border-red-500/25 opacity-75 hover:opacity-100"
                          : "border-[var(--border-color)] hover:border-[var(--gold)]/50 hover:shadow-xl"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="shrink-0 relative">
                          <div className="p-0.5 rounded-2xl bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37]">
                            <div className="rounded-[14px] overflow-hidden bg-[var(--bg-card)] p-px">
                              {member.foto || member.foto_url ? (
                                <img
                                  src={member.foto || member.foto_url}
                                  alt={member.nombre_completo}
                                  className="w-14 h-14 rounded-[13px] object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <Avatar
                                  name={member.nombre_completo}
                                  size="56"
                                  round="13px"
                                  color="#252525"
                                  textColor="#D4AF37"
                                />
                              )}
                            </div>
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${stateBadge.dot} rounded-full border-2 border-[var(--bg-card)]`}
                            title={stateBadge.label}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="font-bold text-[var(--text-primary)] text-sm leading-snug truncate group-hover:text-[var(--gold)] transition-colors">
                            {member.nombre_completo}
                          </h2>
                          <p className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
                            @{member.usuario}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getRoleColor(
                                member.role
                              )}`}
                            >
                              {getRoleName(member.role)}
                            </span>
                            {member.estado && member.estado !== "activo" && (
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${stateBadge.cls}`}
                              >
                                {stateBadge.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones rápidas de Administrador en cada tarjeta */}
                        {isAdmin ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMemberToEdit(member)
                              }}
                              className="p-2 rounded-xl bg-[var(--bg-muted)] hover:bg-[#D4AF37]/20 text-[var(--text-secondary)] hover:text-[#D4AF37] border border-[var(--border-color)] transition-colors cursor-pointer"
                              title="Editar integrante"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMemberToDelete(member)
                              }}
                              className="p-2 rounded-xl bg-[var(--bg-muted)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 border border-[var(--border-color)] transition-colors cursor-pointer"
                              title="Eliminar o desactivar integrante"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <ChevronRight
                            size={16}
                            className="text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors shrink-0"
                          />
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                        <span>{edad !== null && edad !== "" ? `${edad} años` : "Edad no reg."}</span>
                        {antiguedad && (
                          <span className="text-[10px] font-semibold bg-[var(--bg-muted)] px-2 py-0.5 rounded-lg border border-[var(--border-color)]">
                            {antiguedad}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredMembers.length === 0 && (
                <div className="bg-[var(--bg-card)] rounded-3xl text-center py-16 border border-dashed border-[var(--border-color)]">
                  <Layers className="mx-auto text-[var(--text-muted)] mb-3" size={34} />
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">
                    No se encontraron integrantes con ese criterio
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL DETALLE RÁPIDO DEL INTEGRANTE */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[105]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMember(null)
          }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative page-header-gold px-6 pt-6 pb-6 shrink-0">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 p-1.5 bg-black/15 hover:bg-black/25 rounded-full text-[var(--header-text-primary)] cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-0.5 rounded-2xl bg-black/20">
                  <div className="rounded-[14px] overflow-hidden bg-[#181818] p-px">
                    {selectedMember.foto || selectedMember.foto_url ? (
                      <img
                        src={selectedMember.foto || selectedMember.foto_url}
                        alt={selectedMember.nombre_completo}
                        className="w-[72px] h-[72px] rounded-[13px] object-cover"
                      />
                    ) : (
                      <Avatar
                        name={selectedMember.nombre_completo}
                        size="72"
                        round="13px"
                        color="#252525"
                        textColor="#D4AF37"
                      />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-black/20 text-[var(--header-text-primary)]">
                      {getRoleName(selectedMember.role)}
                    </span>
                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-black/15 text-[var(--header-text-primary)]">
                      @{selectedMember.usuario}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-[var(--header-text-primary)] text-lg leading-tight break-words">
                    {selectedMember.nombre_completo}
                  </h3>
                  {selectedMember.email && (
                    <p className="header-text-secondary text-xs mt-0.5 truncate">
                      {selectedMember.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Estado de Cuenta
                  </p>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 capitalize">
                    {selectedMember.estado || "Activo"}
                  </p>
                </div>
                <div className="bg-[var(--bg-muted)] border border-[var(--border-color)] rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    DNI / Identidad
                  </p>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">
                    {selectedMember.dni || "No registrado"}
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-muted)] rounded-xl p-3.5 border border-[var(--border-color)] space-y-2 text-xs">
                {selectedMember.telefono && (
                  <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                    <Phone size={13} className="text-[var(--gold)] shrink-0" />
                    <span>{selectedMember.telefono}</span>
                  </div>
                )}
                {selectedMember.fecha_nacimiento && (
                  <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                    <Calendar size={13} className="text-[var(--gold)] shrink-0" />
                    <span>
                      {selectedMember.fecha_nacimiento}
                      {calculateAgeFromBirthdate(selectedMember.fecha_nacimiento) !== null && (
                        <strong className="ml-1.5 text-[var(--gold)]">
                          ({calculateAgeFromBirthdate(selectedMember.fecha_nacimiento)} años)
                        </strong>
                      )}
                    </span>
                  </div>
                )}
                {selectedMember.tipo_sangre && (
                  <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
                    <Heart size={13} className="text-red-400 shrink-0" />
                    <span>
                      Tipo de sangre:{" "}
                      <strong className="text-red-400">{selectedMember.tipo_sangre}</strong>
                    </span>
                  </div>
                )}
                {selectedMember.direccion && (
                  <div className="flex items-start gap-2.5 text-[var(--text-primary)]">
                    <MapPin size={13} className="text-[var(--gold)] shrink-0 mt-0.5" />
                    <span>{selectedMember.direccion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones del Modal de Detalle */}
            <div className="flex flex-col gap-2.5 px-5 pb-5 pt-3 shrink-0 border-t border-[var(--border-color)]">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => navigate(`/member/${selectedMember.id}`)}
                  className="btn-secondary flex-1 py-2.5 text-xs justify-center cursor-pointer"
                >
                  Ver Ficha Completa
                </button>
                <button
                  onClick={() => navigate(`/carnet/${selectedMember.id}`)}
                  className="btn-primary flex-1 py-2.5 text-xs justify-center cursor-pointer"
                >
                  Ver Carnet Oficial
                </button>
              </div>

              {isAdmin && (
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedMember
                      setSelectedMember(null)
                      setMemberToEdit(target)
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[var(--gold)] border border-[#D4AF37]/35 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>Editar Integrante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedMember
                      setSelectedMember(null)
                      setMemberToDelete(target)
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR INTEGRANTE */}
      {showAddModal && (
        <ModalAgregarIntegrante
          onClose={() => setShowAddModal(false)}
          members={members}
          onSuccess={(createdData) => {
            setShowAddModal(false)
            setCreatedCredentials(createdData)
            loadMembers()
          }}
        />
      )}

      {/* MODAL CREDENCIALES TEMPORALES ÚNICAS */}
      {createdCredentials && (
        <ModalCredencialesTemporales
          data={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />
      )}

      {/* MODAL EDITAR INTEGRANTE */}
      {memberToEdit && (
        <ModalEditarIntegrante
          member={memberToEdit}
          currentUser={currentUser}
          members={members}
          onClose={() => setMemberToEdit(null)}
          onSaved={() => {
            setMemberToEdit(null)
            loadMembers()
          }}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN / DESACTIVACIÓN */}
      {memberToDelete && (
        <ModalConfirmarEliminacion
          member={memberToDelete}
          currentUser={currentUser}
          members={members}
          onClose={() => setMemberToDelete(null)}
          onCompleted={() => {
            setMemberToDelete(null)
            loadMembers()
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default Members
