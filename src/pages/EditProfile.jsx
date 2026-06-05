import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Save, Camera, ArrowLeft, Loader2, CheckCircle, AlertCircle, X } from "lucide-react"
import { supabase } from "../lib/supabase"

function EditProfile() {
  const navigate = useNavigate()

  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState("")
  const [toast,     setToast]     = useState(null)

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

  useEffect(() => {
    loadProfile()
  }, [])

  // Auto-cierre del toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (data) {
      setForm({
        foto: data.foto || "",
        nombre_completo: data.nombre_completo || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
        dni: data.dni || "",
        fecha_nacimiento: data.fecha_nacimiento || "",
        dia: data.fecha_nacimiento ? String(parseInt(data.fecha_nacimiento.split("-")[2])) : "",
        mes: data.fecha_nacimiento ? data.fecha_nacimiento.split("-")[1] : "",
        anio: data.fecha_nacimiento ? data.fecha_nacimiento.split("-")[0] : "",
        tipo_sangre: data.tipo_sangre || "",
        contacto_emergencia: data.contacto_emergencia || "",
        telefono_emergencia: data.telefono_emergencia || "",
      })
      setPreview(data.foto || "")
    }
  }

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, "").slice(0, 8)
    if (numbers.length <= 4) return numbers
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
  }

  const formatIdentity = (value) => {
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
      const fileName = `${user.id}-${Date.now()}`

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("profiles").getPublicUrl(fileName)
      const imageUrl = data.publicUrl
      setPreview(imageUrl)
      setForm(prev => ({ ...prev, foto: imageUrl }))
    } catch (err) {
      console.error(err)
      setToast({ type: "error", msg: "Error subiendo la foto" })
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToast({ type: "error", msg: "Usuario no encontrado" })
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
        setToast({ type: "error", msg: error.message })
        return
      }

      setToast({ type: "success", msg: "Perfil actualizado correctamente" })
      setTimeout(() => navigate("/profile"), 1600)

    } catch (err) {
      console.error(err)
      setToast({ type: "error", msg: "Error al guardar" })
    } finally {
      setLoading(false)
    }
  }

  const selectCls = "w-full bg-[#F8F4E9]/40 border border-gray-100 rounded-xl p-3 outline-none font-bold text-sm text-gray-700"

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 font-sans antialiased text-gray-800">

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 200, display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 18,
            width: "calc(100vw - 2rem)", maxWidth: 380,
            background: toast.type === "success" ? "#f0fdf4" : "#fff1f2",
            border: `1px solid ${toast.type === "success" ? "#86efac" : "#fca5a5"}`,
            boxShadow: "0 8px 32px rgba(0,0,0,.14)",
          }}
        >
          {toast.type === "success"
            ? <CheckCircle size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
            : <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />
          }
          <p style={{
            fontSize: 13, fontWeight: 700, margin: 0, flex: 1,
            color: toast.type === "success" ? "#15803d" : "#dc2626",
          }}>
            {toast.msg}
          </p>
          <button onClick={() => setToast(null)} style={{ color: "#9ca3af", flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] h-48 rounded-b-[45px] shadow-lg relative p-4 flex items-start justify-between">
        <button
          onClick={() => navigate("/profile")}
          className="mt-2 p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition active:scale-95 cursor-pointer border border-white/10"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="mt-4 text-right">
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Modificar Datos</h1>
          <p className="text-[11px] text-yellow-100 opacity-90 font-medium">Mantén tu perfil del coro actualizado</p>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto -mt-20">

        {/* FOTO */}
        <div className="flex justify-center mb-6 z-10 relative">
          <label className="relative cursor-pointer group">
            <div className="w-32 h-32 relative p-1 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-xl transition-transform group-hover:scale-[1.02]">
              <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5 relative">
                <img
                  src={preview || "https://ui-avatars.com/api/?name=Usuario&background=F3EAC2&color=8B6508"}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Loader2 className="text-white animate-spin" size={24} />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#B8860B] text-white p-2.5 rounded-full shadow-md border-2 border-white transition-colors group-hover:bg-[#D4AF37]">
              <Camera size={14} />
            </div>
            <input type="file" hidden accept="image/*" disabled={uploading} onChange={uploadPhoto} />
          </label>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-[32px] shadow-xl p-5 sm:p-6 border border-gray-100/80 space-y-4">

          <Input label="Nombre Completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput label="Teléfono de Contacto" name="telefono" value={form.telefono} onChange={handleChange} />
            <Input label="Número de Identidad (DNI)" name="dni" placeholder="0000-0000-00000" value={form.dni} onChange={handleChange} />
          </div>

          <Input label="Dirección Residencial" name="direccion" value={form.direccion} onChange={handleChange} />

          {/* FECHA DE NACIMIENTO */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block ml-1 mb-1">
              Fecha de Nacimiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select name="dia" value={form.dia} onChange={handleChange} className={selectCls}>
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select name="mes" value={form.mes} onChange={handleChange} className={selectCls}>
                <option value="">Mes</option>
                {[
                  { value:"01", label:"Enero"      },
                  { value:"02", label:"Febrero"     },
                  { value:"03", label:"Marzo"       },
                  { value:"04", label:"Abril"       },
                  { value:"05", label:"Mayo"        },
                  { value:"06", label:"Junio"       },
                  { value:"07", label:"Julio"       },
                  { value:"08", label:"Agosto"      },
                  { value:"09", label:"Septiembre"  },
                  { value:"10", label:"Octubre"     },
                  { value:"11", label:"Noviembre"   },
                  { value:"12", label:"Diciembre"   },
                ].map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>

              <select name="anio" value={form.anio} onChange={handleChange} className={selectCls}>
                <option value="">Año</option>
                {Array.from({ length: 80 }, (_, i) => {
                  const year = new Date().getFullYear() - i
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>
          </div>

          {/* TIPO DE SANGRE */}
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block ml-1 mb-1">
              Tipo de Sangre
            </label>
            <select name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange} className={selectCls + " p-3.5"}>
              <option value="">Seleccionar</option>
              <option>O+</option><option>O-</option>
              <option>A+</option><option>A-</option>
              <option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option>
            </select>
          </div>

          {/* CONTACTO DE EMERGENCIA */}
          <div className="border-t border-dashed border-gray-100 pt-4 mt-2 space-y-4">
            <Input label="Contacto de Emergencia (Nombre)" name="contacto_emergencia" value={form.contacto_emergencia} onChange={handleChange} />
            <PhoneInput label="Teléfono de Emergencia" name="telefono_emergencia" value={form.telefono_emergencia} onChange={handleChange} />
          </div>

          {/* BOTÓN GUARDAR */}
          <button
            onClick={saveProfile}
            disabled={loading || uploading}
            className="w-full bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-gray-300 text-white py-4 rounded-xl flex justify-center items-center gap-2 font-black uppercase text-xs tracking-wider shadow-md mt-6 transition-all active:scale-[0.99] cursor-pointer"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Guardando Cambios...</>
              : <><Save size={16} /> Guardar Configuración</>
            }
          </button>

        </div>
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block ml-1 mb-1">{label}</label>
      <input
        {...props}
        value={props.value || ""}
        className="w-full bg-[#F8F4E9]/40 border border-gray-100 rounded-xl p-3.5 outline-none font-bold text-sm text-gray-700 transition focus:border-amber-400 focus:bg-white"
      />
    </div>
  )
}

function PhoneInput({ label, ...props }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block ml-1 mb-1">{label}</label>
      <div className="flex border border-gray-100 rounded-xl overflow-hidden focus-within:border-amber-400 transition bg-[#F8F4E9]/40 focus-within:bg-white">
        <div className="bg-gray-50 px-4 flex items-center font-black text-xs text-gray-400 select-none border-r border-gray-100">
          +504
        </div>
        <input
          {...props}
          value={props.value || ""}
          className="w-full p-3.5 outline-none font-bold text-sm text-gray-700 bg-transparent"
        />
      </div>
    </div>
  )
}

export default EditProfile