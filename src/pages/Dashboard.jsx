import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  Bell,
  CalendarDays,
  DollarSign,
  Users,
  BookOpen,
  Music,
} from "lucide-react"

import BottomNav from "../components/BottomNav"
import { getCurrentUser } from "../services/authService"
import { supabase } from "../lib/supabase"

function Dashboard() {
  const navigate =
    useNavigate()

  const [user, setUser] =
    useState(null)

  const [balance,
    setBalance] =
    useState(0)

  const [nextActivity,
    setNextActivity] =
    useState(null)

  const [noticesCount,
    setNoticesCount] =
    useState(0)

  const verses = [
    {
      text:
        "Quien canta, ora dos veces.",
      ref:
        "San Agustín",
    },
    {
      text:
        "Canten al Señor un cántico nuevo.",
      ref:
        "Salmo 96:1",
    },
    {
      text:
        "Todo lo puedo en Cristo que me fortalece.",
      ref:
        "Filipenses 4:13",
    },
    {
      text:
        "Ámense unos a otros.",
      ref:
        "Juan 13:34",
    },
  ]

  const todayVerse =
    verses[
      new Date().getDate() %
        verses.length
    ]

  useEffect(() => {
    loadUser()
    loadFinance()
    loadActivity()
    loadNotices()
  }, [])

  const loadUser =
    async () => {

      const profile =
        await getCurrentUser()

      setUser(profile)
    }

  const loadFinance =
    async () => {

      const { data } =
        await supabase
          .from(
            "financial_records"
          )
          .select("*")

      if (!data) return

      const ingresos =
        data
          .filter(
            (r) =>
              r.tipo ===
              "ingreso"
          )
          .reduce(
            (
              acc,
              curr
            ) =>
              acc +
              Number(
                curr.monto
              ),
            0
          )

      const gastos =
        data
          .filter(
            (r) =>
              r.tipo ===
              "gasto"
          )
          .reduce(
            (
              acc,
              curr
            ) =>
              acc +
              Number(
                curr.monto
              ),
            0
          )

      setBalance(
        ingresos -
          gastos
      )
    }

  const loadActivity =
    async () => {

      const { data } =
        await supabase
          .from(
            "activities"
          )
          .select("*")
          .eq(
            "estado",
            "pendiente"
          )
          .order(
            "fecha",
            {
              ascending:
                true,
            }
          )
          .limit(1)

      if (
        data &&
        data.length > 0
      ) {
        setNextActivity(
          data[0]
        )
      }
    }

  const loadNotices =
    async () => {

      const {
        count,
      } =
        await supabase
          .from(
            "notices"
          )
          .select(
            "*",
            {
              count:
                "exact",
              head: true,
            }
          )

      setNoticesCount(
        count || 0
      )
    }

  const getRoleName =
    () => {

      switch (
        user?.role
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

  const currentDate =
    new Date()
      .toLocaleDateString(
        "es-HN",
        {
          weekday:
            "long",
          day: "numeric",
          month:
            "long",
          year:
            "numeric",
        }
      )

  return (
    <div className="min-h-screen bg-[#F8F4E9] pb-28">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-b-[40px] p-6 text-white shadow-lg">

        <div className="flex justify-between items-start">

          <div>

            <p className="opacity-90 text-sm capitalize">
              {currentDate}
            </p>

            <h1 className="font-bold text-2xl mt-2">
              {user?.nombre_completo}
            </h1>

            <p className="opacity-90">
              {getRoleName()}
            </p>

            <p className="text-sm mt-1">
              {noticesCount} avisos
            </p>

          </div>

          <button
            onClick={() =>
              navigate(
                "/notices"
              )
            }
            className="bg-white/20 p-3 rounded-2xl"
          >
            <Bell size={22} />
          </button>

        </div>

      </div>

      <div className="p-5">

        {/* CARDS */}
        <div className="grid grid-cols-2 gap-4">

          <div className="bg-white rounded-[30px] p-5 shadow-card">

            <div className="bg-[#F8F4E9] p-3 rounded-2xl w-fit">
              <DollarSign
                className="text-[#B8860B]"
              />
            </div>

            <h3 className="text-gray-500 mt-4">
              Caja General
            </h3>

            <p className="text-3xl font-bold text-[#B8860B] mt-2">
              L {balance}
            </p>

          </div>

          <div className="bg-white rounded-[30px] p-5 shadow-card">

            <div className="bg-[#F8F4E9] p-3 rounded-2xl w-fit">
              <Users
                className="text-[#B8860B]"
              />
            </div>

            <h3 className="text-gray-500 mt-4">
              Integrantes
            </h3>

            <p className="text-3xl font-bold text-[#B8860B] mt-2">
              32
            </p>

          </div>

        </div>

        {/* VERSICULO */}
        <div className="bg-white rounded-[30px] p-5 mt-5 shadow-card">

          <div className="flex items-center gap-3">

            <BookOpen
              className="text-[#B8860B]"
            />

            <h2 className="font-bold">
              Versículo del día
            </h2>

          </div>

          <p className="mt-4 italic text-gray-700">
            "{todayVerse.text}"
          </p>

          <p className="text-sm text-[#B8860B] mt-2">
            {todayVerse.ref}
          </p>

        </div>

        {/* FRASE */}
        <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] rounded-[30px] p-5 mt-5 text-white shadow-card">

          <div className="flex items-center gap-3">
            <Music />
            <h2 className="font-bold">
              Mensaje espiritual
            </h2>
          </div>

          <p className="mt-3">
            El que canta con fe,
            evangeliza con alegría 🎶
          </p>

        </div>

        {/* ACTIVIDAD */}
        <div className="bg-white rounded-[30px] shadow-card p-5 mt-5">

          <div className="flex gap-4 items-center">

            <div className="bg-[#F8F4E9] p-3 rounded-2xl">
              <CalendarDays
                className="text-[#B8860B]"
              />
            </div>

            <div>

              <h2 className="font-bold">
                Próxima actividad
              </h2>

              {nextActivity ? (
                <>
                  <p className="font-semibold text-[#B8860B]">
                    {
                      nextActivity.titulo
                    }
                  </p>

                  <p className="text-gray-500 text-sm">
                    {
                      nextActivity.fecha
                    }{" "}
                    •{" "}
                    {
                      nextActivity.hora
                    }
                  </p>

                  <p className="text-gray-500 text-sm">
                    📍{" "}
                    {
                      nextActivity.lugar
                    }
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">
                  No hay actividades
                </p>
              )}

            </div>

          </div>

        </div>

      </div>

      <BottomNav />
    </div>
  )
}

export default Dashboard