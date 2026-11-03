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
import { toast } from "react-hot-toast"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  const loadUser = async () => {
    try {
      const profile = await getCurrentUser()
      setUser(profile)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

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
    const confirmLogout = window.confirm("¿Cerrar sesión?")
    if (!confirmLogout) return

    try {
      await supabase.auth.signOut()
      toast.success("Sesión cerrada correctamente")
      navigate("/", { replace: true })
    } catch (err) {
      console.error(err)
      toast.error("Error al cerrar sesión")
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0C09] pb-32 font-sans antialiased text-[#F5E9C0]">
      {/* HEADER UNIFICADO */}
      <div className="page-header-gold rounded-b-[36px] px-5 pt-8 pb-16 relative overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <p className="header-text-secondary text-[11px] uppercase font-bold tracking-widest">Coro Vive y Canta</p>
          <h1 className="title-professional title-gold-black text-3xl sm:text-4xl mt-1 tracking-tight">
            Mi Perfil Oficial
          </h1>
        </div>
      </div>

      <div className="px-4 max-w-4xl mx-auto -mt-8 relative z-10">
        {/* TARJETA DE IDENTIFICACIÓN PRINCIPAL */}
        <div className="bg-[#1A1710] rounded-[32px] shadow-2xl p-6 sm:p-8 text-center relative border border-[#D4AF37]/15 overflow-hidden">
          {/* ANILLO DE AVATAR PREMIUM CON DEGRADADO METÁLICO */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto relative p-1 rounded-full bg-gradient-to-tr from-[#B8860B] via-[#EEDC82] to-[#D4AF37] shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0E0C09] p-0.5">
              {user?.foto ? (
                <img
                  src={user.foto}
                  alt={user?.nombre_completo || "Foto de perfil"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Avatar
                  name={user?.nombre_completo || "Usuario"}
                  size="120"
                  round={true}
                  color="#221F18"
                  textColor="#D4AF37"
                  className="font-bold"
                />
              )}
            </div>
          </div>

          {/* NOMBRE COMPLETO DESTACADO EN LA CREDENCIAL */}
          <h2 className="title-professional text-2xl sm:text-3xl font-extrabold text-[#F5E9C0] mt-4 tracking-tight break-words">
            {user?.nombre_completo || "Usuario del Sistema"}
          </h2>

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center text-xs bg-[#D4AF37]/15 text-[#D4AF37] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border border-[#D4AF37]/30">
              {getRoleName(user?.role)}
            </span>
            {user?.activo !== false && (
              <span className="inline-flex items-center text-xs bg-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/30">
                Activo
              </span>
            )}
          </div>

          <button
            onClick={() => navigate("/profile/edit")}
            className="btn-primary mt-5 inline-flex items-center gap-2 mx-auto shadow-md cursor-pointer"
          >
            <Pencil size={15} />
            Editar Perfil
          </button>
        </div>

        {/* BLOQUE DE INFORMACIÓN */}
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

        {/* BOTÓN DE CIERRE DE SESIÓN */}
        <button
          onClick={handleLogout}
          className="btn-danger w-full mt-6 py-4 flex justify-center items-center gap-2"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

function InfoCard({ icon, title, value, isCritical }) {
  return (
    <div className="bg-[#1A1710] rounded-[22px] shadow-lg p-4 flex items-center gap-4 border border-[#D4AF37]/10 overflow-hidden">
      <div className="bg-[#221F18] min-w-[46px] min-h-[46px] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/10 shrink-0">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase text-[#a89060] tracking-wider">
          {title}
        </p>
        <p className={`text-sm font-bold mt-0.5 break-words whitespace-normal ${isCritical && value ? "text-red-400 font-extrabold" : "text-[#F5E9C0]"}`}>
          {value || "No registrado"}
        </p>
      </div>
    </div>
  )
}

export default Profile