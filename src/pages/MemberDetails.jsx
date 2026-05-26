import { useEffect, useState } from "react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  Heart,
  ShieldAlert,
  Save,
} from "lucide-react"

import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"

function MemberDetails() {

  const navigate =
    useNavigate()

  const { id } =
    useParams()

  const [member,
    setMember] =
    useState(null)

  const [currentUser,
    setCurrentUser] =
    useState(null)

  const [role,
    setRole] =
    useState("")

  useEffect(() => {
    initialize()
  }, [])

  const initialize =
    async () => {

      const user =
        await getCurrentUser()

      setCurrentUser(
        user
      )

      loadMember()
    }

  const loadMember =
    async () => {

      const {
        data,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select("*")
          .eq(
            "id",
            id
          )
          .single()

      if (data) {

        setMember(
          data
        )

        setRole(
          data.role ||
          "integrante"
        )
      }
    }

  const saveRole =
  async () => {

    try {

      console.log(
        "ID usuario:",
        member.id
      )

      console.log(
        "Nuevo rol:",
        role
      )

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            role:
              role,
          })
          .eq(
            "id",
            member.id
          )
          .select()

      console.log(
        data
      )

      if (error) {

        console.log(
          error
        )

        return alert(
          error.message
        )
      }

      setMember({
        ...member,
        role:
          role,
      })

      alert(
        "Rol actualizado correctamente"
      )

    } catch (
      err
    ) {

      console.log(
        err
      )

      alert(
        "Error guardando rol"
      )
    }
  }

  const getRoleName =
    (
      role
    ) => {

      switch (
        role
      ) {

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
    <div className="min-h-screen bg-[#F8F4E9] p-5 pb-24">

      {/* REGRESAR */}
      <button
        onClick={() =>
          navigate(-1)
        }
        className="flex items-center gap-2 text-[#B8860B] font-semibold mb-5"
      >
        <ArrowLeft size={22} />
        Regresar
      </button>

      <div className="bg-white rounded-[35px] shadow-xl p-6 overflow-hidden">

        {/* FOTO */}
        <div className="flex flex-col items-center text-center">

          <img
            src={
              member?.foto ||
              `https://ui-avatars.com/api/?name=${member?.nombre_completo}`
            }
            alt=""
            className="w-32 h-32 rounded-full object-cover border-4 border-[#D4AF37]"
          />

          <h1 className="text-3xl font-bold mt-4 break-words">
            {
              member?.nombre_completo
            }
          </h1>

          <p className="text-[#B8860B] text-lg">
            {
              getRoleName(
                member?.role
              )
            }
          </p>

        </div>

        {/* ADMIN */}
        {currentUser?.role ===
          "admin" && (

          <div className="bg-[#F8F4E9] rounded-[28px] p-5 mt-6">

            <h2 className="font-bold text-lg mb-3">
              Cambiar rol
            </h2>

            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value
                )
              }
              className="w-full bg-white rounded-2xl p-4 outline-none"
            >
              <option value="admin">
                Administrador
              </option>

              <option value="secretaria">
                Secretaria
              </option>

              <option value="director">
                Director
              </option>

              <option value="tesorero">
                Tesorero
              </option>

              <option value="integrante">
                Integrante
              </option>
            </select>

            <button
              onClick={
                saveRole
              }
              className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl mt-4 flex justify-center items-center gap-2"
            >
              <Save size={18} />
              Guardar Rol
            </button>

          </div>
        )}

        {/* DATOS */}
        <div className="space-y-4 mt-8">

          <InfoCard
            icon={<Phone />}
            title="Teléfono"
            value={
              member?.telefono
            }
          />

          <InfoCard
            icon={<MapPin />}
            title="Dirección"
            value={
              member?.direccion
            }
          />

          <InfoCard
            icon={<IdCard />}
            title="Identidad"
            value={
              member?.dni
            }
          />

          <InfoCard
            icon={<Calendar />}
            title="Fecha nacimiento"
            value={
              member?.fecha_nacimiento
            }
          />

          <InfoCard
            icon={<Heart />}
            title="Tipo sangre"
            value={
              member?.tipo_sangre
            }
          />

          <InfoCard
            icon={
              <ShieldAlert />
            }
            title="Contacto emergencia"
            value={
              member?.contacto_emergencia
            }
          />

          <InfoCard
            icon={<Phone />}
            title="Teléfono emergencia"
            value={
              member?.telefono_emergencia
            }
          />

        </div>

      </div>

    </div>
  )
}

function InfoCard({
  icon,
  title,
  value,
}) {
  return (
    <div className="bg-[#F8F4E9] rounded-2xl p-4 flex items-center gap-4">

      <div className="text-[#B8860B] shrink-0">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-gray-400 text-sm">
          {title}
        </p>

        <p className="font-medium break-words">
          {value ||
            "No agregado"}
        </p>

      </div>

    </div>
  )
}

export default MemberDetails