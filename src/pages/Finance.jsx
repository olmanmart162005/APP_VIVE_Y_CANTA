import { useEffect, useMemo, useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { canManageFinance } from "../services/permissions"
import { supabase } from "../lib/supabase"

function Finance() {
  const [user, setUser] =
    useState(null)

  const [monto, setMonto] =
    useState("")

  const [descripcion,
    setDescripcion] =
    useState("")

  const [categoria,
    setCategoria] =
    useState("")

  const [tipo, setTipo] =
    useState("ingreso")

  const [records,
    setRecords] =
    useState([])

  const [filter,
    setFilter] =
    useState("todos")

  const [editingId,
    setEditingId] =
    useState(null)

  useEffect(() => {
    loadUser()
    loadRecords()
  }, [])

  const loadUser =
    async () => {
      const profile =
        await getCurrentUser()

      setUser(profile)
    }

  const loadRecords =
    async () => {
      const { data } =
        await supabase
          .from(
            "financial_records"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          )

      setRecords(data || [])
    }

  const handleSave =
  async () => {

    if (!monto) {
      return alert(
        "Ingrese un monto"
      )
    }

    try {

      const payload = {
        tipo,
        categoria,
        monto:
          Number(monto),
        descripcion,
      }

      let error = null

      // ACTUALIZAR
      if (editingId) {

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "financial_records"
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

        // CREAR
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "financial_records"
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
        console.log(error)

        return alert(
          "Error al guardar"
        )
      }

      // limpiar form
      setMonto("")
      setDescripcion("")
      setCategoria("")
      setTipo(
        "ingreso"
      )

      // salir modo edición
      setEditingId(
        null
      )

      // recargar historial
      await loadRecords()

      alert(
        editingId
          ? "Registro actualizado"
          : "Registro guardado"
      )

    } catch (
      error
    ) {

      console.log(error)

      alert(
        "Error inesperado"
      )
    }
  }

  const handleDelete =
    async (id) => {

      const confirmDelete =
        confirm(
          "¿Eliminar movimiento?"
        )

      if (!confirmDelete)
        return

      await supabase
        .from(
          "financial_records"
        )
        .delete()
        .eq("id", id)

      loadRecords()
    }

  const handleEdit =
  (item) => {

    setEditingId(
      item.id
    )

    setTipo(
      item.tipo
    )

    setMonto(
      String(
        item.monto
      )
    )

    setDescripcion(
      item.descripcion || ""
    )

    setCategoria(
      item.categoria || ""
    )

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    })
  }

  const ingresos =
    records
      .filter(
        (r) =>
          r.tipo ===
          "ingreso"
      )
      .reduce(
        (acc, curr) =>
          acc +
          Number(
            curr.monto
          ),
        0
      )

  const gastos =
    records
      .filter(
        (r) =>
          r.tipo ===
          "gasto"
      )
      .reduce(
        (acc, curr) =>
          acc +
          Number(
            curr.monto
          ),
        0
      )

  const balance =
    ingresos -
    gastos

  const filteredRecords =
    useMemo(() => {
      if (
        filter ===
        "todos"
      )
        return records

      return records.filter(
        (r) =>
          r.tipo ===
          filter
      )
    }, [
      records,
      filter,
    ])

  const chartData = [
    {
      name:
        "Ingresos",
      value:
        ingresos,
    },
    {
      name:
        "Gastos",
      value:
        gastos,
    },
  ]

  const COLORS = [
    "#D4AF37",
    "#ef4444",
  ]

  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5 pb-32">

      <h1 className="text-3xl font-bold text-[#B8860B]">
        Finanzas
      </h1>

      <p className="text-gray-500 mt-1">
        Administración financiera del coro
      </p>

      {/* Balance */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-[35px] p-6 text-white mt-6 shadow-xl">

        <p className="opacity-90">
          Balance General
        </p>

        <h2 className="text-4xl font-bold mt-2">
          L{" "}
          {balance.toLocaleString()}
        </h2>

      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">

        <div className="bg-white rounded-[25px] p-4 shadow-card">
          <TrendingUp className="text-green-500" />

          <p className="text-xs text-gray-500 mt-2">
            Ingresos
          </p>

          <h2 className="font-bold text-green-600">
            L {ingresos.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white rounded-[25px] p-4 shadow-card">
          <TrendingDown className="text-red-500" />

          <p className="text-xs text-gray-500 mt-2">
            Gastos
          </p>

          <h2 className="font-bold text-red-500">
            L {gastos.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white rounded-[25px] p-4 shadow-card">
          <Wallet className="text-[#B8860B]" />

          <p className="text-xs text-gray-500 mt-2">
            Neto
          </p>

          <h2 className="font-bold text-[#B8860B]">
            L {balance.toLocaleString()}
          </h2>
        </div>

      </div>

      {/* Grafico */}
      <div className="bg-white rounded-[35px] p-5 mt-5 shadow-card">

        <ResponsiveContainer
          width="100%"
          height={250}
        >
          <PieChart>
            <Pie
              data={
                chartData
              }
              dataKey="value"
              outerRadius={80}
            >
              {chartData.map(
                (
                  entry,
                  index
                ) => (
                  <Cell
                    key={index}
                    fill={
                      COLORS[
                        index
                      ]
                    }
                  />
                )
              )}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

      </div>

      {/* Formulario */}
      {canManageFinance(
        user?.role
      ) && (
        <div className="bg-white rounded-[35px] p-5 mt-5 shadow-card">

          <h2 className="font-bold mb-4 text-lg">
            Nuevo Registro
          </h2>

          <select
            value={tipo}
            onChange={(e) =>
              setTipo(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9]"
          >
            <option value="ingreso">
              Ingreso
            </option>

            <option value="gasto">
              Gasto
            </option>
          </select>

          <select
            value={categoria}
            onChange={(e) =>
              setCategoria(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          >
            <option value="">
              Seleccionar categoría
            </option>

            {tipo ===
            "ingreso" ? (
              <>
                <option value="Misa">Misa</option>
                <option value="Concierto">Concierto</option>
                <option value="Donación">Donación</option>
                <option value="Actividad económica">
                  Actividad económica
                </option>
                <option value="Otro">
                  Otro
                </option>
              </>
            ) : (
              <>
                <option value="Transporte">
                  Transporte
                </option>
                <option value="Alimentación">
                  Alimentación
                </option>
                <option value="Sonido">
                  Sonido
                </option>
                <option value="Uniformes">
                  Uniformes
                </option>
                <option value="Instrumentos">
                  Instrumentos
                </option>
                <option value="Otro">
                  Otro
                </option>
              </>
            )}
          </select>

          <input
            type="number"
            placeholder="Monto"
            value={monto}
            onChange={(e) =>
              setMonto(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <input
            type="text"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) =>
              setDescripcion(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-[#F8F4E9] mt-3"
          />

          <button
            onClick={
              handleSave
            }
            className="w-full bg-[#D4AF37] text-white py-4 rounded-2xl mt-4 font-semibold"
          >
            {editingId
              ? "Actualizar"
              : "Guardar Registro"}
          </button>

        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mt-5">
        {[
          "todos",
          "ingreso",
          "gasto",
        ].map(
          (
            item
          ) => (
            <button
              key={item}
              onClick={() =>
                setFilter(
                  item
                )
              }
              className={`px-4 py-2 rounded-full ${
                filter ===
                item
                  ? "bg-[#B8860B] text-white"
                  : "bg-white"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      {/* Historial */}
      <div className="mt-5 space-y-3">

        {filteredRecords.map(
          (
            item
          ) => (
            <div
              key={
                item.id
              }
              className="bg-white rounded-[30px] p-5 shadow-card"
            >

              <div className="flex justify-between">

                <div>

                  <h2 className="font-bold capitalize">
                    {item.tipo}
                  </h2>

                  <p className="text-[#B8860B] text-sm">
                    {item.categoria}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {
                      item.descripcion
                    }
                  </p>

                </div>

                <div className="text-right">

                  <p
                    className={`font-bold text-lg ${
                      item.tipo ===
                      "ingreso"
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {item.tipo ===
                    "ingreso"
                      ? "+"
                      : "-"}
                    L{" "}
                    {Number(
                      item.monto
                    ).toLocaleString()}
                  </p>

                  {canManageFinance(
                    user?.role
                  ) && (
                    <div className="flex gap-2 mt-3">

                      <button
                        onClick={() =>
                          handleEdit(
                            item
                          )
                        }
                        className="bg-blue-500 text-white px-3 py-1 rounded-xl text-sm"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            item.id
                          )
                        }
                        className="bg-red-500 text-white px-3 py-1 rounded-xl text-sm"
                      >
                        Eliminar
                      </button>

                    </div>
                  )}

                </div>

              </div>

            </div>
          )
        )}

      </div>

      <BottomNav />
    </div>
  )
}

export default Finance