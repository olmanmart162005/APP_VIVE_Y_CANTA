import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Lock, User } from "lucide-react"

import logo from "../assets/logo.png"
import { supabase } from "../lib/supabase"

function Login() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const email = `${usuario}@viveycanta.app`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        alert("Usuario o contraseña incorrectos")
        return
      }
      navigate("/dashboard")
    } catch (err) {
      console.log(err)
      alert("Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Raleway:wght@300;400;500;600&display=swap');

        .login-root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'Raleway', sans-serif;
          position: relative;
          overflow: hidden;

          /* CLARO */
          background-color: #F8F4E9;
        }

        @media (prefers-color-scheme: dark) {
          .login-root {
            background-color: #0E0C09;
          }
          .login-root::before {
            background-image: repeating-linear-gradient(
              0deg,
              transparent, transparent 38px,
              rgba(212,175,55,0.04) 38px,
              rgba(212,175,55,0.04) 39px
            );
          }
          .login-root::after {
            background: radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%);
          }
        }

        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-root::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          pointer-events: none;
        }

        /* CARD */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          overflow: hidden;
          animation: cardIn 0.7s cubic-bezier(0.16,1,0.3,1) both;

          /* CLARO */
          background: #ffffff;
          border: 1px solid rgba(212,175,55,0.2);
          box-shadow: 0 8px 40px rgba(180,140,20,0.1), 0 2px 8px rgba(0,0,0,0.06);
        }

        @media (prefers-color-scheme: dark) {
          .login-card {
            background: linear-gradient(160deg, #1A1710 0%, #110F0A 100%);
            border: 1px solid rgba(212,175,55,0.2);
            box-shadow:
              0 0 0 1px rgba(212,175,55,0.05),
              0 25px 60px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(212,175,55,0.15);
          }
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .card-topline {
          height: 3px;
          background: linear-gradient(90deg, transparent, #D4AF37, #F0D060, #D4AF37, transparent);
        }

        /* HEADER */
        .card-header {
          padding: 2.5rem 2rem 2rem;
          text-align: center;
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
          width: 110px; height: 110px;
          border-radius: 50%;
          margin-bottom: 1.5rem;

          /* CLARO */
          background: radial-gradient(circle at 30% 30%, #FDF8ED, #F0E8C8);
          border: 1.5px solid rgba(212,175,55,0.4);
          box-shadow: 0 4px 20px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.8);
        }

        @media (prefers-color-scheme: dark) {
          .logo-ring {
            background: radial-gradient(circle at 30% 30%, #2A2416, #0E0C09);
            border: 1.5px solid rgba(212,175,55,0.35);
            box-shadow: 0 0 30px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.2);
          }
        }

        .logo-ring img {
          width: 72px; height: 72px;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(212,175,55,0.3));
        }

        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          line-height: 1.1;
          margin: 0 0 0.4rem;

          /* CLARO */
          color: #2C1F00;
        }

        @media (prefers-color-scheme: dark) {
          .card-title { color: #F5E9C0; }
        }

        .card-subtitle {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #D4AF37;
          margin: 0 0 0.25rem;
        }

        .card-coro {
          font-size: 0.75rem;
          letter-spacing: 0.08em;

          /* CLARO */
          color: rgba(44,31,0,0.4);
        }

        @media (prefers-color-scheme: dark) {
          .card-coro { color: rgba(245,233,192,0.4); }
        }

        /* DIVIDER */
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.5rem 2rem 0;
          animation: fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }

        .divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.3));
        }

        .divider-line:last-child {
          background: linear-gradient(270deg, transparent, rgba(212,175,55,0.3));
        }

        .divider-diamond {
          width: 6px; height: 6px;
          background: #D4AF37;
          transform: rotate(45deg);
          opacity: 0.6;
        }

        /* BODY */
        .card-body {
          padding: 1.5rem 2rem 2rem;
          animation: fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .field-label {
          display: block;
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 0.4rem;

          /* CLARO */
          color: rgba(184,134,11,0.8);
        }

        @media (prefers-color-scheme: dark) {
          .field-label { color: rgba(212,175,55,0.6); }
        }

        .field-inner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-radius: 12px;
          padding: 0 1rem;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

          /* CLARO */
          background: #F8F4E9;
          border: 1px solid rgba(212,175,55,0.25);
        }

        @media (prefers-color-scheme: dark) {
          .field-inner {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(212,175,55,0.15);
          }
        }

        .field-inner.focused {
          border-color: rgba(212,175,55,0.6);
          box-shadow: 0 0 0 3px rgba(212,175,55,0.08);

          /* CLARO */
          background: #FDF8ED;
        }

        @media (prefers-color-scheme: dark) {
          .field-inner.focused {
            background: rgba(212,175,55,0.04);
          }
        }

        .field-icon {
          color: rgba(184,134,11,0.5);
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
          font-size: 0.9rem;
          font-family: 'Raleway', sans-serif;
          font-weight: 400;
          letter-spacing: 0.03em;

          /* CLARO */
          color: #2C1F00;
        }

        @media (prefers-color-scheme: dark) {
          .field-input { color: #F5E9C0; }
        }

        .field-input::placeholder {
          /* CLARO */
          color: rgba(44,31,0,0.25);
        }

        @media (prefers-color-scheme: dark) {
          .field-input::placeholder { color: rgba(245,233,192,0.2); }
        }

        /* BOTÓN */
        .btn-login {
          width: 100%;
          position: relative;
          background: linear-gradient(135deg, #C9A227 0%, #D4AF37 40%, #E8C84A 70%, #B8860B 100%);
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-family: 'Raleway', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #0E0C09;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.3);
          overflow: hidden;
        }

        .btn-login::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
          border-radius: inherit;
        }

        .btn-login:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(212,175,55,0.4);
        }

        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }

        .btn-dots span {
          width: 5px; height: 5px;
          background: #0E0C09;
          border-radius: 50%;
          animation: dot 1.2s infinite;
        }

        .btn-dots span:nth-child(2) { animation-delay: 0.2s; }
        .btn-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* FOOTER */
        .card-footer {
          padding: 0 2rem 1.5rem;
          text-align: center;
          animation: fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }

        .footer-note {
          font-size: 0.65rem;
          letter-spacing: 0.08em;

          /* CLARO */
          color: rgba(44,31,0,0.25);
        }

        @media (prefers-color-scheme: dark) {
          .footer-note { color: rgba(245,233,192,0.2); }
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
            <h1 className="card-title">Vive y Canta</h1>
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
                    />
                  </div>
                </div>

              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? (
                  <span className="btn-dots">
                    <span /><span /><span />
                  </span>
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