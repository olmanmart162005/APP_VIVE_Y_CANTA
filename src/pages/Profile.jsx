import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "react-avatar"

import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  Pencil,
  LogOut,
  Heart,
  ShieldAlert,
} from "lucide-react"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const profile = await getCurrentUser()
    setUser(profile)
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

  const handleLogout = async () => {
    const confirmLogout = confirm("¿Cerrar sesión?")
    if (!confirmLogout) return

    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-32 font-sans antialiased text-gray-800">
      
      {/* HEADER ELEGANTE CON CURVATURA SUAVE */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] h-48 rounded-b-[45px] shadow-lg" />

      <div className="px-4 max-w-4xl mx-auto -mt-24">

        {/* TARJETA DE IDENTIFICACIÓN PRINCIPAL */}
        <div className="bg-white rounded-[32px] shadow-xl p-6 text-center relative border border-gray-100/80 overflow-hidden">
          
          {/* ANILLO DE AVATAR PREMIUM CON DEGRADADO METÁLICO */}
          <div className="w-32 h-32 mx-auto relative p-1 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
              {user?.foto ? (
                <img
                  src={user.foto}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Avatar
                  name={user?.nombre_completo}
                  size="120"
                  round={true}
                  color="#F3EAC2"
                  textColor="#8B6508"
                  className="font-black"
                />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-black mt-4 text-gray-800 tracking-tight break-words">
            {user?.nombre_completo}
          </h1>

          <span className="inline-block text-xs bg-amber-50 text-[#B8860B] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-100/70 mt-2">
            {getRoleName(user?.role)}
          </span>

          <button
            onClick={() => navigate("/profile/edit")}
            className="bg-[#B8860B] hover:bg-[#D4AF37] text-white px-5 py-2.5 rounded-xl mt-5 text-xs font-black tracking-wider uppercase flex items-center gap-2 mx-auto shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Pencil size={14} />
            Editar Perfil
          </button>
        </div>

        {/* BLOQUE DE INFORMACIÓN: EN MÓVIL 1 COLUMNA, EN ESCRITORIO 2 COLUMNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5">
          
          <InfoCard
            icon={<Mail size={18} />}
            title="Correo Electrónico"
            value={user?.email}
          />

          <InfoCard
            icon={<Phone size={18} />}
            title="Teléfono de Contacto"
            value={user?.telefono}
          />

          <InfoCard
            icon={<MapPin size={18} />}
            title="Dirección Residencial"
            value={user?.direccion}
          />

          <InfoCard
            icon={<IdCard size={18} />}
            title="Documento Nacional de Identidad (DNI)"
            value={user?.dni}
          />

          <InfoCard
            icon={<Calendar size={18} />}
            title="Fecha de Nacimiento"
            value={user?.fecha_nacimiento}
          />

          <InfoCard
            icon={<Heart size={18} />}
            title="Tipo de Sangre"
            value={user?.tipo_sangre}
            isCritical={!!user?.tipo_sangre}
          />

          <InfoCard
            icon={<ShieldAlert size={18} />}
            title="Contacto de Emergencia"
            value={user?.contacto_emergencia}
          />

          <InfoCard
            icon={<Phone size={18} />}
            title="Teléfono de Emergencia"
            value={user?.telefono_emergencia}
          />
        </div>

        {/* BOTÓN DE CIERRE DE SESIÓN LIMPIO Y REFINADO */}
        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 py-4 rounded-[22px] font-black uppercase text-xs tracking-wider shadow-xs mt-6 flex justify-center items-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>

      </div>

      <BottomNav />
    </div>
  )
}

/* COMPONENTE INTERNO REFACTORIZADO Y ESTILIZADO DE TARJETA */
function InfoCard({ icon, title, value, isCritical }) {
  return (
    <div className="bg-white rounded-[22px] shadow-2xs p-4 flex items-center gap-4 border border-gray-100/80 overflow-hidden">
      
      {/* ÍCONO ENMARCADO */}
      <div className="bg-[#F8F4E9] min-w-[46px] min-h-[46px] rounded-xl flex items-center justify-center text-[#B8860B] shrink-0">
        {icon}
      </div>

      {/* TEXTO INFORMATIVO */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
          {title}
        </p>
        <p className={`text-sm font-bold mt-0.5 break-words whitespace-normal ${isCritical ? "text-red-600 font-black" : "text-gray-700"}`}>
          {value || "No registrado"}
        </p>
      </div>

    </div>
  )
}

export default Profile