import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Camera, ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "react-hot-toast"
import { supabase } from "../lib/supabase"

function EditProfile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState("")

  const [form, setForm] = useState({
    foto: "",
    nombre_completo: "",
    telefono: "",
    direccion: "",
    dni: "",
    fecha_nacimiento: "",
    dia: "",
    mes: "",
    anio: "",
    tipo_sangre: "",
    contacto_emergencia: "",
    telefono_emergencia: "",
  })

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) {
        toast.error("Error al cargar la información del perfil")
        return
      }

      if (data) {
        let dia = ""
        let mes = ""
        let anio = ""
        if (data.fecha_nacimiento) {
          const parts = data.fecha_nacimiento.split("T")[0].split("-")
          if (parts.length === 3) {
            anio = parts[0]
            mes = parts[1]
            dia = String(parseInt(parts[2], 10))
          }
        }

        setForm({
          foto: data.foto || "",
          nombre_completo: data.nombre_completo || "",
          telefono: data.telefono || "",
          direccion: data.direccion || "",
          dni: data.dni || "",
          fecha_nacimiento: data.fecha_nacimiento || "",
          dia,
          mes,
          anio,
          tipo_sangre: data.tipo_sangre || "",
          contacto_emergencia: data.contacto_emergencia || "",
          telefono_emergencia: data.telefono_emergencia || "",
        })
        setPreview(data.foto || "")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar el perfil")
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const formatPhone = (value) => {
    if (!value) return ""
    const numbers = value.replace(/\D/g, "").slice(0, 8)
    if (numbers.length <= 4) return numbers
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
  }

  const formatIdentity = (value) => {
    if (!value) return ""
    const numbers = value.replace(/\D/g, "").slice(0, 13)
    let result = ""
    if (numbers.length > 0) result += numbers.slice(0, 4)
    if (numbers.length > 4) result += "-" + numbers.slice(4, 8)
    if (numbers.length > 8) result += "-" + numbers.slice(8, 13)
    return result
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let formatted = value
    if (name === "telefono" || name === "telefono_emergencia") formatted = formatPhone(value)
    if (name === "dni") formatted = formatIdentity(value)
    setForm(prev => ({ ...prev, [name]: formatted }))
  }

  const uploadPhoto = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("No se encontró sesión de usuario activa")
        return
      }

      const fileName = `${user.id}-${Date.now()}`

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("profiles").getPublicUrl(fileName)
      const imageUrl = data.publicUrl
      setPreview(imageUrl)
      setForm(prev => ({ ...prev, foto: imageUrl }))
      toast.success("Foto subida correctamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al subir la foto")
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Usuario no encontrado")
        return
      }

      let fechaNacimiento = null
      if (form.dia && form.mes && form.anio) {
        const dia = String(form.dia).padStart(2, "0")
        const mes = String(form.mes).padStart(2, "0")
        fechaNacimiento = `${form.anio}-${mes}-${dia}`
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          foto: form.foto || null,
          nombre_completo: form.nombre_completo || "",
          telefono: form.telefono || "",
          direccion: form.direccion || "",
          dni: form.dni || "",
          fecha_nacimiento: fechaNacimiento,
          tipo_sangre: form.tipo_sangre || "",
          contacto_emergencia: form.contacto_emergencia || "",
          telefono_emergencia: form.telefono_emergencia || "",
        })
        .eq("id", user.id)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Perfil actualizado correctamente")
      setTimeout(() => navigate("/profile"), 1000)
    } catch (err) {
      console.error(err)
      toast.error("Error al guardar cambios")
    } finally {
      setLoading(false)
    }
  }

  const selectCls = "input-premium"

  return (
    <div className="min-h-screen bg-[var(--bg-app)] pb-32 font-sans antialiased text-[var(--text-primary)] transition-colors duration-200">
      {/* HEADER LIMPIO */}
      <div className="page-header-gold rounded-b-[36px] px-5 sm:px-8 pt-6 pb-12 shadow-lg relative overflow-hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/profile")}
              className="inline-flex items-center gap-2 header-chip px-3 py-1.5 rounded-full hover:opacity-85 transition font-bold text-xs mb-3 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Volver a Mi Perfil</span>
            </button>
            <p className="header-text-secondary text-[11px] uppercase font-bold tracking-widest">
              Coro Vive y Canta
            </p>
            <h1 className="title-professional title-gold-black text-2xl sm:text-3xl mt-0.5 tracking-tight">
              Modificar Mis Datos
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6">
        {/* FOTO DE PERFIL */}
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 relative p-1 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-xl transition-transform group-hover:scale-[1.02]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-card)] p-0.5 relative">
                <img
                  src={preview || `https://ui-avatars.com/api/?name=${form.nombre_completo || "Usuario"}&background=1A1710&color=D4AF37`}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                    <Loader2 className="text-white animate-spin" size={24} />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#B8860B] text-black p-2.5 rounded-full shadow-md border-2 border-[var(--bg-card)] transition-colors group-hover:bg-[#D4AF37]">
              <Camera size={14} />
            </div>
            <input type="file" hidden accept="image/*" disabled={uploading} onChange={uploadPhoto} />
          </label>
        </div>

        {/* FORMULARIO */}
        <div className="bg-[var(--bg-card)] rounded-[32px] shadow-xl p-5 sm:p-7 border border-[var(--border-color)] space-y-4">
          <Input label="Nombre Completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput label="Teléfono de Contacto" name="telefono" value={form.telefono} onChange={handleChange} />
            <Input label="Número de Identidad (DNI)" name="dni" placeholder="0000-0000-00000" value={form.dni} onChange={handleChange} />
          </div>

          <Input label="Dirección Residencial" name="direccion" value={form.direccion} onChange={handleChange} />

          {/* FECHA DE NACIMIENTO */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider block ml-1 mb-1.5">
              Fecha de Nacimiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select name="dia" value={form.dia} onChange={handleChange} className={selectCls}>
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select name="mes" value={form.mes} onChange={handleChange} className={selectCls}>
                <option value="">Mes</option>
                {[
                  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"],
                  ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
                  ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"],
                  ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
                ].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              <select name="anio" value={form.anio} onChange={handleChange} className={selectCls}>
                <option value="">Año</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TIPO DE SANGRE */}
          <div>
            <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider block ml-1 mb-1.5">
              Tipo de Sangre
            </label>
            <select name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange} className={selectCls}>
              <option value="">Selecciona tipo de sangre</option>
              {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* CONTACTO DE EMERGENCIA */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3">
              Información de Emergencia
            </p>
            <div className="space-y-4">
              <Input
                label="Nombre de Contacto de Emergencia"
                name="contacto_emergencia"
                placeholder="Nombre de familiar o tutor"
                value={form.contacto_emergencia}
                onChange={handleChange}
              />
              <PhoneInput
                label="Teléfono de Emergencia"
                name="telefono_emergencia"
                value={form.telefono_emergencia}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <button
            onClick={saveProfile}
            disabled={loading}
            className="btn-primary w-full !py-3.5 mt-2 flex justify-center items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider block ml-1 mb-1.5">{label}</label>
      <input
        {...props}
        value={props.value || ""}
        className="input-premium"
      />
    </div>
  )
}

function PhoneInput({ label, ...props }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider block ml-1 mb-1.5">{label}</label>
      <div className="flex border border-[var(--border-color)] rounded-xl overflow-hidden focus-within:border-[var(--gold)] transition bg-[var(--bg-input)]">
        <div className="bg-[var(--bg-muted)] px-4 flex items-center font-bold text-xs text-[var(--text-secondary)] select-none border-r border-[var(--border-color)]">
          +504
        </div>
        <input
          {...props}
          value={props.value || ""}
          className="w-full h-12 px-3.5 outline-none font-bold text-sm text-[var(--text-primary)] bg-transparent"
        />
      </div>
    </div>
  )
}

export default EditProfile
