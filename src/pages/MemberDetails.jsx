import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Phone, MapPin, Calendar, IdCard, Heart, ShieldAlert, Save } from "lucide-react"
import { toast } from "react-hot-toast"

import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"

function MemberDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [member, setMember] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [role, setRole] = useState("")

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    const user = await getCurrentUser()
    setCurrentUser(user)
    loadMember()
  }

  const loadMember = async () => {
    try {
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
    }
  }

  const saveRole = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: role })
        .eq("id", member.id)

      if (error) throw error

      setMember(prev => ({ ...prev, role: role }))
      toast.success("Rol actualizado correctamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al intentar actualizar el rol")
    }
  }

  const getRoleName = (role) => {
    switch (role) {
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

  return (
    <div className="min-h-screen bg-[#0E0C09] pb-32 text-[#F5E9C0]">
      <div className="page-header-gold rounded-b-[45px] px-5 pt-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 header-text-primary hover:opacity-75 transition-opacity font-bold mb-4 cursor-pointer"
          >
            <ArrowLeft size={20} />
            Regresar
          </button>
          <p className="header-text-secondary text-[10px] uppercase font-bold tracking-widest">Coro Vive y Canta</p>
          <h1 className="title-professional title-gold-black text-3xl mt-1 break-words">
            {member?.nombre_completo || "Integrante"}
          </h1>
        </div>
      </div>

      <div className="px-5 mt-5">
      <div className="bg-[#1A1710] rounded-[35px] border border-[#D4AF37]/15 shadow-2xl p-6 overflow-hidden max-w-2xl mx-auto">
        {/* FOTO */}
        <div className="flex flex-col items-center text-center">
          <div className="p-1 rounded-full bg-gradient-to-tr from-[#9A7209] via-[#EEDC82] to-[#D4AF37] shadow-xl">
            <img
              src={member?.foto || `https://ui-avatars.com/api/?name=${member?.nombre_completo || "Usuario"}&background=1A1710&color=D4AF37`}
              alt=""
              className="w-32 h-32 rounded-full object-cover border-2 border-[#1A1710]"
            />
          </div>

          <p className="text-[#D4AF37] text-base font-bold mt-1">
            {getRoleName(member?.role)}
          </p>
        </div>

        {/* ADMIN ROLE SELECT */}
        {currentUser?.role === "admin" && (
          <div className="bg-[#221F18] border border-[#D4AF37]/15 rounded-[24px] p-5 mt-6">
            <h2 className="font-bold text-sm mb-3 uppercase tracking-wider text-[#a89060]">
              Cambiar rol de usuario
            </h2>

            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-premium"
              >
                <option value="admin">Administrador</option>
                <option value="secretaria">Secretaria</option>
                <option value="director">Director</option>
                <option value="tesorero">Tesorero</option>
                <option value="integrante">Integrante</option>
              </select>
            </div>

            <button
              onClick={saveRole}
              className="btn-primary w-full mt-4"
            >
              <Save size={16} />
              Guardar Rol
            </button>
          </div>
        )}

        {/* DATOS DE INTEGRANTE */}
        <div className="space-y-4 mt-8">
          <InfoCard icon={<Phone size={18} />} title="Teléfono" value={member?.telefono} />
          <InfoCard icon={<MapPin size={18} />} title="Dirección" value={member?.direccion} />
          <InfoCard icon={<IdCard size={18} />} title="Identidad (DNI)" value={member?.dni} />
          <InfoCard icon={<Calendar size={18} />} title="Fecha nacimiento" value={member?.fecha_nacimiento} />
          <InfoCard icon={<Heart size={18} />} title="Tipo sangre" value={member?.tipo_sangre} />
          <InfoCard icon={<ShieldAlert size={18} />} title="Contacto emergencia" value={member?.contacto_emergencia} />
          <InfoCard icon={<Phone size={18} />} title="Teléfono emergencia" value={member?.telefono_emergencia} />
        </div>
      </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="bg-[#221F18]/50 border border-[#D4AF37]/10 rounded-2xl p-4 flex items-center gap-4">
      <div className="text-[#D4AF37] shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[#a89060] text-xs font-bold uppercase tracking-wider">
          {title}
        </p>
        <p className="font-medium text-[#F5E9C0] mt-0.5 break-words">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  )
}

export default MemberDetails