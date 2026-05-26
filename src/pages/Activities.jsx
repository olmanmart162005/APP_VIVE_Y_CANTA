import { useEffect, useState } from "react"
import {
  Calendar,
  Clock,
  MapPin,
  User,
} from "lucide-react"

import { format } from "date-fns"
import { es } from "date-fns/locale"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageActivities } from "../services/permissions"
import { supabase } from "../lib/supabase"

function Activities() {
  const [user, setUser] =
    useState(null)

  const [records,
    setRecords] =
    useState([])

  const [editingId,
    setEditingId] =
    useState(null)

  const [titulo,
    setTitulo] =
    useState("")

  const [descripcion,
    setDescripcion] =
    useState("")

  const [tipo, setTipo] =
    useState("Ensayo")

  const [lugar,
    setLugar] =
    useState("")

  const [fecha,
    setFecha] =
    useState("")

  const [hora,
    setHora] =
    useState("")

  const [responsable,
    setResponsable] =
    useState("")

  const [estado,
    setEstado] =
    useState("pendiente")

  useEffect(() => {
    loadUser()
    loadActivities()
  }, [])

  const loadUser =
    async () => {
      const profile =
        await getCurrentUser()

      setUser(profile)
    }

  const loadActivities =
    async () => {

      const { data } =
        await supabase
          .from(
            "activities"
          )
          .select("*")
          .order(
            "fecha",
            {
              ascending:
                true,
            }
          )

      setRecords(
        data || []
      )
    }

  const clearForm =
    () => {
      setTitulo("")
      setDescripcion("")
      setTipo(
        "Ensayo"
      )
      setLugar("")
      setFecha("")
      setHora("")
      setResponsable("")
      setEstado(
        "pendiente"
      )
      setEditingId(
        null
      )
    }

  const handleSave =
    async () => {

      if (
        !titulo ||
        !fecha ||
        !hora ||
        !lugar
      ) {
        return alert(
          "Complete todos los campos"
        )
      }

      const payload = {
        titulo,
        descripcion,
        tipo,
        lugar,
        fecha,
        hora,
        responsable,
        estado,
      }

      let error =
        null

      if (editingId) {

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "activities"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingId
            )

        error =
          updateError

      } else {

        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "activities"
            )
            .insert([
              {
                ...payload,
                created_by:
                  user?.id,
              },
            ])

        error =
          insertError
      }

      if (error) {
        console.log(
          error
        )

        return alert(
          "Error al guardar"
        )
      }

      alert(
        editingId
          ? "Actividad actualizada"
          : "Actividad creada"
      )

      clearForm()

      loadActivities()
    }

  const handleDelete =
    async (id) => {

      const confirmDelete =
        confirm(
          "¿Eliminar actividad?"
        )

      if (!confirmDelete)
        return

      await supabase
        .from(
          "activities"
        )
        .delete()
        .eq("id", id)

      loadActivities()
    }

  const handleEdit =
    (item) => {

      setEditingId(
        item.id
      )

      setTitulo(
        item.titulo
      )

      setDescripcion(
        item.descripcion
      )

      setTipo(
        item.tipo
      )

      setLugar(
        item.lugar
      )

      setFecha(
        item.fecha
      )

      setHora(
        item.hora
      )

      setResponsable(
        item.responsable
      )

      setEstado(
        item.estado
      )

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      })
    }

  const getColor =
    (
      estado
    ) => {
      switch (
        estado
      ) {
        case "pendiente":
          return "bg-yellow-100 text-yellow-700"

        case "finalizada":
          return "bg-green-100 text-green-700"

        case "cancelada":
          return "bg-red-100 text-red-700"

        default:
          return ""
      }
    }

  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5 pb-32">

      <h1 className="text-3xl font-bold text-[#B8860B]">
        Actividades
      </h1>

      <p className="text-gray-500 mt-1">
        Gestión de actividades del coro
      </p>

      {canManageActivities(
        user?.role
      ) && (
        <div className="bg-white rounded-[35px] p-5 mt-5 shadow-card">

          <h2 className="font-bold text-lg mb-4">
            {editingId
              ? "Editar Actividad"
              : "Nueva Actividad"}
          </h2>

          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={(e) =>
              setTitulo(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9]"
          />

          <textarea
            placeholder="Descripción"
            value={
              descripcion
            }
            onChange={(e) =>
              setDescripcion(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          >
            <option>
              Ensayo
            </option>
            <option>
              Misa
            </option>
            <option>
              Concierto
            </option>
            <option>
              Retiro
            </option>
            <option>
              Hora Santa
            </option>
            <option>
              Vigilia
            </option>
            <option>
              Actividad económica
            </option>
            <option>
              Reunión
            </option>
            <option>
              Otro
            </option>
          </select>

          <input
            type="text"
            placeholder="Lugar"
            value={lugar}
            onChange={(e) =>
              setLugar(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <input
            type="date"
            value={fecha}
            onChange={(e) =>
              setFecha(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <input
            type="time"
            value={hora}
            onChange={(e) =>
              setHora(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <input
            type="text"
            placeholder="Responsable"
            value={
              responsable
            }
            onChange={(e) =>
              setResponsable(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <select
            value={estado}
            onChange={(e) =>
              setEstado(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          >
            <option value="pendiente">
              Pendiente
            </option>

            <option value="finalizada">
              Finalizada
            </option>

            <option value="cancelada">
              Cancelada
            </option>
          </select>

          <button
            onClick={
              handleSave
            }
            className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl mt-4 font-semibold"
          >
            {editingId
              ? "Actualizar"
              : "Guardar Actividad"}
          </button>

        </div>
      )}

      <div className="mt-5 space-y-4">

        {records.map(
          (
            item
          ) => (
            <div
              key={
                item.id
              }
              className="bg-white rounded-[35px] p-5 shadow-card"
            >

              <div className="flex justify-between items-start">

                <div>

                  <h2 className="font-bold text-lg">
                    {
                      item.titulo
                    }
                  </h2>

                  <span
                    className={`px-3 py-1 rounded-full text-sm mt-2 inline-block ${getColor(
                      item.estado
                    )}`}
                  >
                    {
                      item.estado
                    }
                  </span>

                </div>

              </div>

              <div className="space-y-2 mt-4 text-gray-600">

                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  <span>
                    {format(
                      new Date(
                        item.fecha
                      ),
                      "dd MMMM yyyy",
                      {
                        locale:
                          es,
                      }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  <span>
                    {
                      item.hora
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={18} />
                  <span>
                    {
                      item.lugar
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <User size={18} />
                  <span>
                    {
                      item.responsable
                    }
                  </span>
                </div>

              </div>

              <p className="mt-4 text-gray-500">
                {
                  item.descripcion
                }
              </p>

              {canManageActivities(
                user?.role
              ) && (
                <div className="flex gap-3 mt-4">

                  <button
                    onClick={() =>
                      handleEdit(
                        item
                      )
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded-2xl"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(
                        item.id
                      )
                    }
                    className="bg-red-500 text-white px-4 py-2 rounded-2xl"
                  >
                    Eliminar
                  </button>

                </div>
              )}

            </div>
          )
        )}

      </div>

      <BottomNav />

    </div>
  )
}

export default Activities