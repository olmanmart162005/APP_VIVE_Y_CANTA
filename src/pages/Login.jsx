import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Lock, User } from "lucide-react"

import logo from "../assets/logo.png"
import { supabase } from "../lib/supabase"

function Login() {
  const [usuario,
    setUsuario] =
    useState("")

  const [password,
    setPassword] =
    useState("")

  const [loading,
    setLoading] =
    useState(false)

  const navigate =
    useNavigate()

  const handleLogin =
    async (
      e
    ) => {

      e.preventDefault()

      try {

        setLoading(
          true
        )

        const email =
          `${usuario}@viveycanta.app`

        const {
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email,
              password,
            }
          )

        if (error) {

          alert(
            "Usuario o contraseña incorrectos"
          )

          return
        }

        navigate(
          "/dashboard"
        )

      } catch (
        err
      ) {

        console.log(
          err
        )

        alert(
          "Error al iniciar sesión"
        )

      } finally {

        setLoading(
          false
        )
      }
    }

  return (
    <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center p-4">

      <div className="w-full max-w-sm bg-white rounded-[35px] shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-b from-[#D4AF37] to-[#B8860B] px-6 py-10 text-center">

          <div className="flex justify-center">

            <img
              src={logo}
              alt="Logo Coro"
              className="w-48 object-contain"
            />

          </div>

        </div>

        {/* BODY */}
        <div className="px-6 pb-8 bg-white">

          <div className="text-center pt-5">

            <h1 className="text-2xl font-bold text-gray-800">
              Bienvenido
            </h1>

            <p className="text-[#B8860B] mt-1 font-medium text-sm">
              Sistema Administrativo
            </p>

            <p className="text-gray-500 text-sm">
              Coro Vive y Canta
            </p>

          </div>

          <form
            onSubmit={
              handleLogin
            }
            className="mt-8 space-y-4"
          >

            {/* Usuario */}
            <div className="bg-[#F8F4E9] rounded-2xl flex items-center px-4 border">

              <User
                className="text-[#B8860B]"
                size={20}
              />

              <input
                type="text"
                placeholder="Usuario"
                value={
                  usuario
                }
                onChange={(
                  e
                ) =>
                  setUsuario(
                    e.target
                      .value
                  )
                }
                className="w-full bg-transparent p-4 outline-none"
              />

            </div>

            {/* Password */}
            <div className="bg-[#F8F4E9] rounded-2xl flex items-center px-4 border">

              <Lock
                className="text-[#B8860B]"
                size={20}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={
                  password
                }
                onChange={(
                  e
                ) =>
                  setPassword(
                    e.target
                      .value
                  )
                }
                className="w-full bg-transparent p-4 outline-none"
              />

            </div>

            <button
              type="submit"
              disabled={
                loading
              }
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-semibold py-4 rounded-2xl shadow-lg hover:opacity-90 transition"
            >
              {loading
                ? "Ingresando..."
                : "Iniciar Sesión"}
            </button>

          </form>

        </div>

      </div>

    </div>
  )
}

export default Login