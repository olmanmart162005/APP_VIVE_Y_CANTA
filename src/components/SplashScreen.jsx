import { motion } from "framer-motion"
import logo from "../assets/logo.png"

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#111111] text-[#F5F0E6] select-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Resplandor ambiental dorado de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,rgba(17,17,17,0)_70%)] blur-2xl" />
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#D4AF37]/5 to-transparent" />
      </div>

      {/* Contenedor Central */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-md w-full">
        {/* LOGO OFICIAL CON ANIMACIÓN SUAVE Y AURA DORADA */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Anillo de pulso sutil */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#D4AF37]/25"
          />

          {/* Halo luminoso detrás del logo */}
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#D4AF37]/10 blur-xl" />

          {/* Círculo contenedor del logo */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-[#252525] to-[#161616] border-2 border-[#D4AF37]/40 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.2)] p-2.5 flex items-center justify-center"
          >
            <img
              src={logo}
              alt="Logotipo Oficial Coro Vive y Canta"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            />
          </motion.div>
        </div>

        {/* SECUENCIA TIPOGRÁFICA INSTITUCIONAL */}
        {/* 1. Nombre Institucional: CORO DE ALABANZA */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
          className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase text-[#BFA15A] mb-1 font-sans"
        >
          Coro de Alabanza
        </motion.p>

        {/* 2. Nombre Principal: VIVE Y CANTA */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7, ease: "easeOut" }}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          className="text-4xl sm:text-5xl font-bold tracking-[0.03em] text-[#F5F0E6] drop-shadow-[0_2px_15px_rgba(0,0,0,0.7)]"
        >
          Vive y Canta
        </motion.h1>

        {/* 3. Línea Decorativa Dorada */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-center gap-2 my-3 w-48 mx-auto"
        >
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-[#D4AF37]/80" />
          <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/40 to-[#D4AF37]/80" />
        </motion.div>

        {/* 4. Identificación Parroquial */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase text-[#A69F93] font-sans"
        >
          Parroquia Nuestro Señor de Esquipulas
        </motion.p>

        {/* 5. Barra de Carga Minimalista Dorada */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.25, duration: 0.5 }}
          className="mt-10 w-32 flex flex-col items-center"
        >
          <div className="w-full h-[2px] bg-[#252525] rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut",
              }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            />
          </div>
          <span className="text-[9px] tracking-[0.22em] text-[#BFA15A]/70 uppercase mt-2.5 font-sans">
            Iniciando sistema…
          </span>
        </motion.div>
      </div>

      {/* Pie de página sutil */}
      <div className="absolute bottom-4 text-center">
        <p className="text-[9px] text-[#736C61] tracking-wider font-sans">
          El Triunfo, Choluteca, Honduras
        </p>
      </div>
    </motion.div>
  )
}
