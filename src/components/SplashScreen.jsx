import { motion } from "framer-motion"
import logo from "../assets/logo.png"

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#D4AF37] via-[#B8860B] to-[#8B7500] flex flex-col items-center justify-center z-50 overflow-hidden">

      {/* brillo fondo */}
      <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl top-[-50px] left-[-50px]" />

      <div className="absolute w-[250px] h-[250px] bg-white/10 rounded-full blur-3xl bottom-[-50px] right-[-50px]" />

      {/* logo */}
      <motion.img
        src={logo}
        alt="logo"
        className="w-44 object-contain drop-shadow-2xl"
        initial={{
          scale: 0.8,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          duration: 1,
        }}
      />

      {/* título */}
      <motion.h1
        className="text-white text-3xl font-bold mt-6 tracking-wide"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
        }}
      >
        Coro Vive y Canta
      </motion.h1>

      <motion.p
        className="text-white/80 mt-2"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.8,
        }}
      >
        Sistema Administrativo
      </motion.p>

      {/* loading */}
      <div className="mt-10 flex gap-2">

        {[1, 2, 3].map((item) => (
          <motion.div
            key={item}
            className="w-3 h-3 rounded-full bg-white"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: item * 0.2,
            }}
          />
        ))}

      </div>

    </div>
  )
}

export default SplashScreen