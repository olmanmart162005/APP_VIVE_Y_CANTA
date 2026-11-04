import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import logo from "../assets/logo-splash.png"

/* Partículas doradas flotantes */
const PARTICLES = [
  { x: 12, y: 18, size: 5, delay: 0, duration: 3.5 },
  { x: 85, y: 15, size: 8, delay: 0.4, duration: 4.2 },
  { x: 78, y: 78, size: 6, delay: 0.8, duration: 3.8 },
  { x: 18, y: 72, size: 5, delay: 1.1, duration: 4.5 },
  { x: 90, y: 48, size: 7, delay: 0.5, duration: 5.0 },
  { x: 8, y: 46, size: 4, delay: 1.4, duration: 3.2 },
  { x: 50, y: 8, size: 6, delay: 0.2, duration: 4.8 },
  { x: 46, y: 88, size: 7, delay: 0.9, duration: 4.0 },
]

export default function SplashScreen({ onFinish }) {
  const shouldReduceMotion = useReducedMotion()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Incrementar barra de progreso de 0% a 100% de manera fluida
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 4
      })
    }, 80)

    // Finalizar splash tras completar carga (aprox 2.4s)
    const timer = setTimeout(() => {
      if (onFinish) onFinish()
    }, 2450)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onFinish])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "radial-gradient(circle at center, #241E11 0%, #14120D 55%, #0D0C09 100%)",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Resplandor superior e inferior en tonos dorados */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.16) 0%, transparent 70%), radial-gradient(ellipse 65% 40% at 50% 110%, rgba(212,175,55,0.1) 0%, transparent 70%)",
        }}
      />

      {/* Partículas de polvo dorado flotando */}
      {!shouldReduceMotion &&
        PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "radial-gradient(circle, #F5E9C0 0%, #D4AF37 100%)",
              boxShadow: "0 0 10px rgba(212, 175, 55, 0.6)",
            }}
            animate={{
              y: [-12, 12, -12],
              opacity: [0.2, 0.75, 0.2],
              scale: [0.9, 1.3, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

      {/* =====================================================================
          SECCIÓN CENTRAL: ANILLOS DORADOS + LOGOTIPO OFICIAL
         ===================================================================== */}
      <div className="relative flex items-center justify-center">
        {/* Ondas expansivas doradas */}
        {!shouldReduceMotion &&
          [0, 0.7, 1.4].map((delay, idx) => (
            <motion.div
              key={idx}
              className="absolute rounded-full border border-[#D4AF37]/25"
              style={{ width: 170, height: 170 }}
              animate={{
                scale: [1, 1.85],
                opacity: [0.55, 0],
              }}
              transition={{
                duration: 2.4,
                delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

        {/* Anillo orbital giratorio dorado */}
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-dashed border-[#D4AF37]/35"
        />

        {/* Halo dorado central intenso */}
        <div
          className="absolute w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.24) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />

        {/* Contenedor del Logotipo Oficial */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center justify-center"
        >
          {/* Pedestal circular oscuro con borde de oro brillante */}
          <div
            className="w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center p-4 relative"
            style={{
              background: "radial-gradient(circle at 30% 30%, #2B2416 0%, #14110B 100%)",
              border: "2px solid rgba(212, 175, 55, 0.55)",
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.85), 0 0 35px rgba(212,175,55,0.28), inset 0 1px 12px rgba(212,175,55,0.22)",
            }}
          >
            <motion.img
              src={logo}
              alt="Coro Vive y Canta"
              animate={shouldReduceMotion ? {} : { y: [0, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full object-contain"
              style={{
                filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.7)) drop-shadow(0 0 18px rgba(212,175,55,0.35))",
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* =====================================================================
          TÍTULOS EN DORADO IMPERIAL
         ===================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.65, ease: "easeOut" }}
        className="text-center mt-8 px-6 z-10"
      >
        {/* Ornamento superior */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/70" />
          <div className="w-2 h-2 rotate-45 bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/70" />
        </div>

        {/* Nombre Principal en Degradado de Oro */}
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-[0.05em] leading-none"
          style={{
            background: "linear-gradient(135deg, #FFF5D6 0%, #D4AF37 50%, #F5E9C0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 18px rgba(212,175,55,0.25))",
          }}
        >
          Vive y Canta
        </h1>

        {/* Subtítulo */}
        <p className="text-xs sm:text-sm font-bold tracking-[0.28em] uppercase text-[#D4AF37] mt-2.5 font-sans">
          Coro de Alabanza
        </p>

        <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-[#BFA15A]/75 mt-1 font-sans">
          Parroquia Nuestro Señor de Esquipulas
        </p>
      </motion.div>

      {/* =====================================================================
          INDICADOR DE CARGA DORADO ("CARGANDO…")
         ===================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-10 w-56 sm:w-64 z-10 flex flex-col items-center"
      >
        {/* Barra de progreso con brillo dorado */}
        <div
          className="w-full h-2 rounded-full overflow-hidden p-[1px]"
          style={{
            background: "rgba(212, 175, 55, 0.14)",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            boxShadow: "0 0 15px rgba(212, 175, 55, 0.15)",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #BFA15A 0%, #D4AF37 50%, #FFF3C4 100%)",
              boxShadow: "0 0 12px rgba(212, 175, 55, 0.9)",
              transition: "width 0.08s linear",
            }}
          />
        </div>

        {/* Texto de estado "CARGANDO..." y porcentaje en dorado */}
        <div className="w-full flex items-center justify-between mt-2.5 px-1">
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[10px] font-bold tracking-[0.24em] uppercase text-[#D4AF37] font-sans"
          >
            Cargando…
          </motion.span>
          <span className="text-[11px] font-bold tracking-wider text-[#F5E9C0] font-sans">
            {progress}%
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
