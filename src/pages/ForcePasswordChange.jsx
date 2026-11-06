import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { motion } from "framer-motion"

import logo from "../assets/logo.png"
import { supabase } from "../lib/supabase"
import { useTheme } from "../context/ThemeContext"
import { SHARED_LEGACY_PASSWORD, AUTH_DOMAIN } from "../services/memberService"

function ForcePasswordChange({ user, onPasswordUpdated }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Evaluación en tiempo real de los requisitos de seguridad (Sección 2.C)
  const checks = useMemo(() => {
    const minLength = newPassword.length >= 8
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword)
    const notEqualShared =
      newPassword.length > 0 &&
      newPassword !== SHARED_LEGACY_PASSWORD &&
      newPassword.toLowerCase() !== SHARED_LEGACY_PASSWORD.toLowerCase()
    const notEqualCurrent =
      newPassword.length > 0 &&
      (!currentPassword || newPassword !== currentPassword)
    const matchesConfirm =
      confirmPassword.length > 0 && newPassword === confirmPassword

    const mandatoryPassed =
      minLength && hasUpper && hasLower && hasNumber && notEqualShared && notEqualCurrent

    let score = 0
    if (minLength) score++
    if (hasUpper && hasLower) score++
    if (hasNumber) score++
    if (hasSymbol || newPassword.length >= 11) score++

    let strengthLabel = "Muy débil"
    let strengthColor = "bg-red-500"
    if (score === 2) {
      strengthLabel = "Aceptable"
      strengthColor = "bg-amber-500"
    } else if (score === 3) {
      strengthLabel = "Segura"
      strengthColor = "bg-[#D4AF37]"
    } else if (score >= 4) {
      strengthLabel = "Alta seguridad"
      strengthColor = "bg-emerald-500"
    }

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      notEqualShared,
      notEqualCurrent,
      matchesConfirm,
      mandatoryPassed,
      score,
      strengthLabel,
      strengthColor,
    }
  }, [newPassword, confirmPassword, currentPassword])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg("")

    if (!currentPassword) {
      setErrorMsg("Por favor escribe tu contraseña actual.")
      return
    }

    if (!checks.minLength || !checks.hasUpper || !checks.hasLower || !checks.hasNumber) {
      setErrorMsg(
        "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número."
      )
      return
    }

    if (!checks.notEqualShared || !checks.notEqualCurrent) {
      setErrorMsg(
        "La nueva contraseña debe ser personal y diferente a la contraseña compartida o actual."
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("La nueva contraseña y su confirmación no coinciden.")
      return
    }

    try {
      setSubmitting(true)

      // 1. Obtener usuario autenticado actual y verificar la contraseña actual
      const { data: authData } = await supabase.auth.getUser()
      const activeAuthUser = authData?.user

      if (!activeAuthUser) {
        throw new Error("Tu sesión ha expirado. Por favor vuelve a iniciar sesión.")
      }

      const loginEmail =
        activeAuthUser.email ||
        (user?.usuario ? `${user.usuario}@${AUTH_DOMAIN}` : user?.email)

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: currentPassword,
      })

      if (verifyErr) {
        setErrorMsg("La contraseña actual que ingresaste es incorrecta.")
        return
      }

      // 2. Actualizar contraseña en Supabase Auth (nunca se guarda en texto plano)
      const { error: updateAuthErr } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateAuthErr) {
        throw new Error(
          updateAuthErr.message || "No se pudo actualizar la contraseña en el servidor."
        )
      }

      // 3. Solamente cuando Supabase Auth confirma el cambio, actualizar debe_cambiar_password = false
      const { error: rpcErr } = await supabase.rpc("complete_mandatory_password_change")

      if (rpcErr) {
        const { error: directUpdateErr } = await supabase
          .from("profiles")
          .update({
            debe_cambiar_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeAuthUser.id)

        if (directUpdateErr) {
          throw new Error(
            "La contraseña se actualizó, pero hubo un problema al confirmar el estado de tu perfil."
          )
        }
      }

      toast.success("¡Contraseña personal actualizada con éxito!")

      // 4. Actualizar estado en memoria y entrar al Dashboard manteniendo la sesión activa
      if (onPasswordUpdated) {
        await onPasswordUpdated()
      }
      navigate("/dashboard", { replace: true })
    } catch (err) {
      console.error("[FORCE_PASSWORD] Error al actualizar contraseña:", err.message)
      setErrorMsg(err.message || "Error al procesar el cambio de contraseña.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate("/", { replace: true })
    } catch {
      navigate("/", { replace: true })
    }
  }

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-3 sm:p-6 transition-colors duration-300 relative select-none ${
        isDark ? "bg-[#111111]" : "bg-[#F5F0E6]"
      }`}
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Barra superior flotante: Tema y Cerrar Sesión */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all shadow-md border cursor-pointer ${
            isDark
              ? "bg-[#252525] hover:bg-[#2e2e2e] text-[#F5F0E6] border-[#383838]"
              : "bg-[#FFFFFF] hover:bg-[#F0EBE0] text-[#111111] border-[#DDD6CA]"
          }`}
        >
          {isDark ? (
            <Sun size={15} className="text-[#D4AF37]" />
          ) : (
            <Moon size={15} className="text-[#BFA15A]" />
          )}
          <span className="hidden sm:inline">{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={submitting}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all shadow-md border cursor-pointer ${
            isDark
              ? "bg-[#252525] hover:bg-red-950/60 text-red-400 border-red-500/30"
              : "bg-[#FFFFFF] hover:bg-red-50 text-red-600 border-red-300"
          }`}
        >
          <LogOut size={15} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Tarjeta Principal de Cambio Obligatorio */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`w-full max-w-[460px] rounded-[32px] overflow-hidden shadow-2xl border my-10 ${
          isDark
            ? "bg-[#252525] border-[#D4AF37]/30 shadow-[0_20px_55px_rgba(0,0,0,0.85)]"
            : "bg-[#FFFFFF] border-[#DDD6CA] shadow-[0_20px_40px_rgba(17,17,17,0.1)]"
        }`}
      >
        {/* Encabezado Dorado Institucional */}
        <div className="relative pt-7 pb-6 px-6 text-center bg-gradient-to-b from-[#E2BE53] via-[#D4AF37] to-[#C49E2E] text-[#111111]">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center p-2 shadow-xl border-2 ${
                isDark ? "bg-[#181818] border-[#111111]" : "bg-[#FFFFFF] border-[#BFA15A]"
              }`}
            >
              <img
                src={logo}
                alt="Coro Vive y Canta"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#111111] text-[#D4AF37] border border-[#D4AF37] flex items-center justify-center shadow-md">
              <ShieldCheck size={15} />
            </div>
          </div>

          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111]/80">
            Seguridad de Cuenta Individual
          </p>

          <h1
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-2xl sm:text-3xl font-bold tracking-wide text-[#111111] mt-0.5 uppercase"
          >
            Actualiza tu Contraseña
          </h1>

          <p className="text-xs font-medium text-[#111111]/85 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Por seguridad, necesitamos que establezcas una contraseña personal para continuar utilizando el sistema.
          </p>

          {user?.nombre_completo && (
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/15 text-[#111111] text-[11px] font-bold">
              <span>{user.nombre_completo}</span>
              {user.usuario && <span className="opacity-75">• @{user.usuario}</span>}
            </div>
          )}
        </div>

        {/* Cuerpo del Formulario */}
        <div className={`p-6 sm:p-7 ${isDark ? "bg-[#252525]" : "bg-[#FFFFFF]"}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Contraseña Actual */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5 text-[#D4AF37]">
                Contraseña Actual <span className="text-red-400">*</span>
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
                  isDark
                    ? "bg-[#1A1A1A] border-[#383838] focus-within:border-[#D4AF37]"
                    : "bg-[#FAF8F5] border-[#DDD6CA] focus-within:border-[#D4AF37]"
                }`}
              >
                <Lock size={17} className="text-[#D4AF37] shrink-0" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setErrorMsg("")
                  }}
                  placeholder="Ingresa tu contraseña actual o temporal"
                  required
                  disabled={submitting}
                  autoComplete="current-password"
                  className={`w-full bg-transparent border-none outline-none text-sm font-medium ${
                    isDark ? "text-white placeholder-[#736C61]" : "text-[#111111] placeholder-[#8C8477]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((p) => !p)}
                  tabIndex={-1}
                  className="p-1 text-[#A69F93] hover:text-[#D4AF37] cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 2. Nueva Contraseña Personal */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5 text-[#D4AF37]">
                Nueva Contraseña Personal <span className="text-red-400">*</span>
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
                  isDark
                    ? "bg-[#1A1A1A] border-[#383838] focus-within:border-[#D4AF37]"
                    : "bg-[#FAF8F5] border-[#DDD6CA] focus-within:border-[#D4AF37]"
                }`}
              >
                <Lock size={17} className="text-[#D4AF37] shrink-0" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setErrorMsg("")
                  }}
                  placeholder="Crea tu nueva contraseña privada"
                  required
                  disabled={submitting}
                  autoComplete="new-password"
                  className={`w-full bg-transparent border-none outline-none text-sm font-medium ${
                    isDark ? "text-white placeholder-[#736C61]" : "text-[#111111] placeholder-[#8C8477]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  tabIndex={-1}
                  className="p-1 text-[#A69F93] hover:text-[#D4AF37] cursor-pointer"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Indicador de nivel de seguridad */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={isDark ? "text-[#A69F93]" : "text-[#6E675F]"}>
                      Nivel de seguridad:
                    </span>
                    <span className="text-[#D4AF37] uppercase tracking-wider">
                      {checks.strengthLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          checks.score >= step
                            ? checks.strengthColor
                            : isDark
                            ? "bg-[#181818]"
                            : "bg-[#E5DEC9]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase mb-1.5 text-[#D4AF37]">
                Confirmar Nueva Contraseña <span className="text-red-400">*</span>
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
                  isDark
                    ? "bg-[#1A1A1A] border-[#383838] focus-within:border-[#D4AF37]"
                    : "bg-[#FAF8F5] border-[#DDD6CA] focus-within:border-[#D4AF37]"
                }`}
              >
                <Lock size={17} className="text-[#D4AF37] shrink-0" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrorMsg("")
                  }}
                  placeholder="Repite tu nueva contraseña"
                  required
                  disabled={submitting}
                  autoComplete="new-password"
                  className={`w-full bg-transparent border-none outline-none text-sm font-medium ${
                    isDark ? "text-white placeholder-[#736C61]" : "text-[#111111] placeholder-[#8C8477]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  tabIndex={-1}
                  className="p-1 text-[#A69F93] hover:text-[#D4AF37] cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lista de Requisitos Obligatorios */}
            <div
              className={`p-3.5 rounded-2xl border space-y-1.5 ${
                isDark
                  ? "bg-[#1A1A1A] border-[#353535]"
                  : "bg-[#FAF8F5] border-[#E5DEC9]"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] mb-1">
                Requisitos de seguridad obligatorios:
              </p>
              <RequirementItem ok={checks.minLength} label="Mínimo 8 caracteres" isDark={isDark} />
              <RequirementItem ok={checks.hasUpper} label="Al menos una letra mayúscula (A-Z)" isDark={isDark} />
              <RequirementItem ok={checks.hasLower} label="Al menos una letra minúscula (a-z)" isDark={isDark} />
              <RequirementItem ok={checks.hasNumber} label="Al menos un número (0-9)" isDark={isDark} />
              <RequirementItem
                ok={checks.notEqualShared && checks.notEqualCurrent}
                label="Diferente a la contraseña compartida o actual"
                isDark={isDark}
              />
              <RequirementItem
                ok={checks.matchesConfirm}
                label="Las dos contraseñas nuevas coinciden exactamente"
                isDark={isDark}
              />
            </div>

            {/* Botón de Confirmación */}
            <button
              type="submit"
              disabled={submitting || !checks.mandatoryPassed || !checks.matchesConfirm || !currentPassword}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm tracking-[0.12em] uppercase transition-all duration-200 flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#D4AF37] via-[#E0BD48] to-[#BFA15A] text-[#111111] shadow-[0_6px_20px_rgba(212,175,55,0.35)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin text-[#111111]" />
                  <span>Actualizando Contraseña Segura…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Guardar Mi Contraseña y Continuar</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function RequirementItem({ ok, label, isDark }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
      ) : (
        <XCircle size={14} className={isDark ? "text-[#555555] shrink-0" : "text-[#C4BDB0] shrink-0"} />
      )}
      <span
        className={
          ok
            ? isDark
              ? "text-[#F5F0E6] font-semibold"
              : "text-[#111111] font-semibold"
            : isDark
            ? "text-[#8E877D]"
            : "text-[#7A7267]"
        }
      >
        {label}
      </span>
    </div>
  )
}

export default ForcePasswordChange
