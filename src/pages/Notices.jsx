import { useEffect, useState } from "react"
import { Pin } from "lucide-react"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageNotices } from "../services/permissions"
import { supabase } from "../lib/supabase"

function Notices() {
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

  const [mensaje,
    setMensaje] =
    useState("")

  const [prioridad,
    setPrioridad] =
    useState("media")

  const [fijado,
    setFijado] =
    useState(false)

  useEffect(() => {
    loadUser()
    loadNotices()
  }, [])

  const loadUser =
    async () => {
      const profile =
        await getCurrentUser()

      setUser(profile)
    }

  const loadNotices =
    async () => {

      const { data } =
        await supabase
          .from(
            "notices"
          )
          .select("*")
          .order(
            "fijado",
            {
              ascending:
                false,
            }
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )

      setRecords(
        data || []
      )
    }

  const clearForm =
    () => {
      setTitulo("")
      setMensaje("")
      setPrioridad(
        "media"
      )
      setFijado(false)
      setEditingId(
        null
      )
    }

  const handleSave =
    async () => {

      if (
        !titulo ||
        !mensaje
      ) {
        return alert(
          "Complete los campos"
        )
      }

      const payload = {
        titulo,
        mensaje,
        prioridad,
        fijado,
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
              "notices"
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
              "notices"
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
          ? "Aviso actualizado"
          : "Aviso creado"
      )

      clearForm()

      loadNotices()
    }

  const handleDelete =
    async (id) => {

      const confirmDelete =
        confirm(
          "¿Eliminar aviso?"
        )

      if (!confirmDelete)
        return

      await supabase
        .from(
          "notices"
        )
        .delete()
        .eq("id", id)

      loadNotices()
    }

  const handleEdit =
    (item) => {

      setEditingId(
        item.id
      )

      setTitulo(
        item.titulo
      )

      setMensaje(
        item.mensaje
      )

      setPrioridad(
        item.prioridad
      )

      setFijado(
        item.fijado
      )

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      })
    }

  const getColor =
    (
      prioridad
    ) => {
      switch (
        prioridad
      ) {
        case "alta":
          return "bg-red-100 text-red-600"

        case "media":
          return "bg-yellow-100 text-yellow-700"

        case "baja":
          return "bg-green-100 text-green-700"

        default:
          return ""
      }
    }

  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5 pb-32">

      <h1 className="text-3xl font-bold text-[#B8860B]">
        Avisos
      </h1>

      <p className="text-gray-500 mt-1">
        Comunicados del coro
      </p>

      {canManageNotices(
        user?.role
      ) && (
        <div className="bg-white rounded-[35px] p-5 mt-5 shadow-card">

          <h2 className="font-bold text-lg mb-4">
            {editingId
              ? "Editar Aviso"
              : "Nuevo Aviso"}
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
            placeholder="Mensaje"
            value={
              mensaje
            }
            onChange={(e) =>
              setMensaje(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <select
            value={
              prioridad
            }
            onChange={(e) =>
              setPrioridad(
                e.target
                  .value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          >
            <option value="alta">
              Alta
            </option>

            <option value="media">
              Media
            </option>

            <option value="baja">
              Baja
            </option>
          </select>

          <label className="flex items-center gap-3 mt-4">

            <input
              type="checkbox"
              checked={
                fijado
              }
              onChange={(
                e
              ) =>
                setFijado(
                  e.target
                    .checked
                )
              }
            />

            Aviso importante
          </label>

          <button
            onClick={
              handleSave
            }
            className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl mt-4 font-semibold"
          >
            {editingId
              ? "Actualizar"
              : "Guardar Aviso"}
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

                  <div className="flex items-center gap-2">

                    <h2 className="font-bold text-lg">
                      {
                        item.titulo
                      }
                    </h2>

                    {item.fijado && (
                      <Pin
                        size={
                          18
                        }
                        className="text-[#B8860B]"
                      />
                    )}

                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-sm inline-block mt-2 ${getColor(
                      item.prioridad
                    )}`}
                  >
                    {
                      item.prioridad
                    }
                  </span>

                </div>

              </div>

              <p className="mt-4 text-gray-600">
                {
                  item.mensaje
                }
              </p>

              {canManageNotices(
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

export default Notices