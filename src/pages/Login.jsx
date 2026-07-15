import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Lock, User, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"

import logo from "../assets/logo.png"
import { supabase } from "../lib/supabase"

function Login({ user }) {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!usuario.trim() || !password) {
      toast.error("Por favor ingresa tu usuario y contraseña")
      return
    }

    const email = `${usuario.trim()}@viveycanta.app`
    console.log("[LOGIN START] Iniciando intento de inicio de sesión...")
    console.log("[LOGIN] Email a autenticar:", email)

    try {
      setLoading(true)

      // Promesa de timeout de 35 segundos para dar margen a conexiones lentas o resoluciones DNS demoradas
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 35000)
      )

      console.log("[LOGIN] Enviando credenciales a Supabase...")
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeoutPromise
      ])

      console.log("[LOGIN] Respuesta recibida de Supabase Auth:", { data, error })

      if (error) {
        console.error("[LOGIN] Error de inicio de sesión retornado por Supabase:", error)
        toast.error("Usuario o contraseña incorrectos")
        return
      }

      console.log("[LOGIN] Autenticación exitosa. Navegando al Dashboard...")
      toast.success("¡Sesión iniciada con éxito!")
      navigate("/dashboard")
    } catch (err) {
      console.error("[LOGIN] Error capturado en el bloque catch:", err)
      if (err.message === "TIMEOUT") {
        toast.error("Tiempo de espera agotado. No se pudo conectar al servidor.")
      } else {
        toast.error("Error de conexión al iniciar sesión. Verifica tu red.")
      }
    } finally {
      console.log("[LOGIN END] Finalizado proceso de login, desactivando loading spinner.")
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .login-root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: "Cormorant Garamond", Georgia, serif;
          position: relative;
          overflow: hidden;
          background-color: #0E0C09;
        }

        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: repeating-linear-gradient(
            0deg,
            transparent, transparent 38px,
            rgba(212,175,55,0.02) 38px,
            rgba(212,175,55,0.02) 39px
          );
        }

        .login-root::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          pointer-events: none;
          background: radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%);
        }

        /* CARD */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          border-radius: 28px;
          overflow: hidden;
          animation: cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
          background: linear-gradient(160deg, #1A1710 0%, #110F0A 100%);
          border: 1px solid rgba(212,175,55,0.15);
          box-shadow:
            0 0 0 1px rgba(212,175,55,0.03),
            0 25px 60px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(212,175,55,0.1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .card-topline {
          height: 3px;
          background: linear-gradient(90deg, transparent, #D4AF37, #F0D060, #D4AF37, transparent);
        }

        /* HEADER */
        .card-header {
          padding: 3rem 2rem 1.5rem;
          text-align: center;
          background: linear-gradient(135deg, var(--header-gold-from) 0%, var(--header-gold-to) 100%);
          color: var(--header-text-primary);
          border-bottom: 1px solid var(--header-border);
          animation: fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .logo-ring {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 105px; height: 105px;
          border-radius: 50%;
          margin-bottom: 1.5rem;
          background: radial-gradient(circle at 30% 30%, #2A2416, #0E0C09);
          border: 1.5px solid rgba(212,175,55,0.35);
          box-shadow: 0 0 30px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.2);
        }

        .logo-ring img {
          width: 64px; height: 64px;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(212,175,55,0.3));
        }

        .card-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2rem; /* 32px */
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1.1;
          margin: 0 0 0.4rem;
          color: var(--header-text-primary);
        }

        .card-subtitle {
          font-size: 0.875rem; /* 14px */
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--header-text-secondary);
          margin: 0 0 0.25rem;
        }

        .card-coro {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          color: var(--header-text-secondary);
        }

        /* DIVIDER */
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 2rem;
          animation: fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }

        .divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.2));
        }

        .divider-line:last-child {
          background: linear-gradient(270deg, transparent, rgba(212,175,55,0.2));
        }

        .divider-diamond {
          width: 5px; height: 5px;
          background: #D4AF37;
          transform: rotate(45deg);
          opacity: 0.5;
        }

        /* BODY */
        .card-body {
          padding: 1.5rem 2rem 2.5rem;
          animation: fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .field-label {
          display: block;
          font-size: 0.8125rem; /* 13px */
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 0.45rem;
          color: rgba(212,175,55,0.75);
        }

        .field-inner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-radius: 12px;
          padding: 0 1rem;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,175,55,0.15);
        }

        .field-inner.focused {
          border-color: rgba(212,175,55,0.6);
          box-shadow: 0 0 0 3px rgba(212,175,55,0.08);
          background: rgba(212,175,55,0.04);
        }

        .field-icon {
          color: rgba(212,175,55,0.4);
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .field-inner.focused .field-icon {
          color: #D4AF37;
        }

        .field-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 0.875rem 0;
          font-size: 1rem; /* 16px */
          font-family: "Cormorant Garamond", Georgia, serif;
          font-weight: 400;
          letter-spacing: 0.03em;
          color: #F5E9C0;
        }

        .field-input::placeholder {
          color: rgba(245,233,192,0.2);
        }

        /* BOTÓN */
        .btn-login {
          width: 100%;
          position: relative;
          background: linear-gradient(135deg, #C9A227 0%, #D4AF37 40%, #E8C84A 70%, #B8860B 100%);
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 1rem; /* 16px */
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #0E0C09;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.3);
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .btn-login::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
          border-radius: inherit;
        }

        .btn-login:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(212,175,55,0.45);
        }

        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        /* FOOTER */
        .card-footer {
          padding: 0 2rem 2rem;
          text-align: center;
          animation: fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }

        .footer-note {
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          color: rgba(245,233,192,0.2);
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">
          <div className="card-topline" />

          <div className="card-header">
            <div className="logo-ring">
              <img src={logo} alt="Logo Coro Vive y Canta" />
            </div>
            <p className="card-subtitle">Sistema Administrativo</p>
            <h1 className="card-title title-professional title-gold-black">Vive y Canta</h1>
            <p className="card-coro">Coro Oficial</p>
          </div>

          <div className="divider">
            <div className="divider-line" />
            <div className="divider-diamond" />
            <div className="divider-line" />
          </div>

          <div className="card-body">
            <form onSubmit={handleLogin}>
              <div className="field-group">
                <div>
                  <label className="field-label">Usuario</label>
                  <div className={`field-inner ${focusedField === "usuario" ? "focused" : ""}`}>
                    <User className="field-icon" size={16} />
                    <input
                      type="text"
                      placeholder="Ingresa tu usuario"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      onFocus={() => setFocusedField("usuario")}
                      onBlur={() => setFocusedField(null)}
                      className="field-input"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Contraseña</label>
                  <div className={`field-inner ${focusedField === "password" ? "focused" : ""}`}>
                    <Lock className="field-icon" size={16} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      className="field-input"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? (
                  <Loader2 className="animate-spin text-[#0E0C09]" size={16} />
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </form>
          </div>

          <div className="card-footer">
            <p className="footer-note">© Coro Vive y Canta · Acceso restringido</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login