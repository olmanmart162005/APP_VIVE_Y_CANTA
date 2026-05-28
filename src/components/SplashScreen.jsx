import { motion } from "framer-motion"
import logo from "../assets/logo.png"

/* Partícula decorativa flotante */
function Particle({ x, y, size, delay, duration }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(2px)",
      }}
      animate={{
        y: [-10, 10, -10],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

/* Anillo pulsante */
function PulseRing({ delay, scale }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: 220,
        height: 220,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
      animate={{
        scale: [scale, scale + 0.8],
        opacity: [0.5, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  )
}

const particles = [
  { x: 8,  y: 15, size: 6,  delay: 0,    duration: 4   },
  { x: 88, y: 10, size: 10, delay: 0.5,  duration: 5   },
  { x: 75, y: 80, size: 7,  delay: 1,    duration: 3.5 },
  { x: 15, y: 75, size: 5,  delay: 1.5,  duration: 4.5 },
  { x: 92, y: 50, size: 8,  delay: 0.8,  duration: 6   },
  { x: 5,  y: 50, size: 4,  delay: 2,    duration: 3   },
  { x: 50, y: 5,  size: 6,  delay: 0.3,  duration: 5.5 },
  { x: 45, y: 92, size: 9,  delay: 1.2,  duration: 4   },
]

function SplashScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 50,
        background: "linear-gradient(160deg, #C8961A 0%, #D4AF37 30%, #9A7000 65%, #6B4E00 100%)",
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
      }}
    >
      {/* Malla de brillo superior */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,240,160,0.35) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Brillo inferior cálido */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(180,100,0,0.4) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Textura de grano sutil */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: "200px",
        pointerEvents: "none",
      }} />

      {/* Partículas flotantes */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* Anillos pulsantes detrás del logo */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PulseRing delay={0}   scale={1}   />
        <PulseRing delay={0.8} scale={1}   />
        <PulseRing delay={1.6} scale={1}   />

        {/* Halo dorado estático */}
        <div style={{
          position: "absolute",
          width: 180, height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,240,120,0.18) 0%, transparent 70%)",
        }} />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
          animate={{ scale: 1,   opacity: 1, rotate: 0  }}
          transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ position: "relative", zIndex: 1 }}
        >
          {/* Plato circular detrás del logo */}
          <div style={{
            position: "absolute", inset: -16,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(6px)",
          }} />
          <img
            src={logo}
            alt="Coro Vive y Canta"
            style={{
              width: 120, height: 120, objectFit: "contain",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35)) drop-shadow(0 0 40px rgba(255,220,80,0.3))",
              position: "relative", zIndex: 1,
            }}
          />
        </motion.div>
      </div>

      {/* Textos */}
      <motion.div
        style={{ textAlign: "center", marginTop: 36 }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
      >
        {/* Línea decorativa */}
        <motion.div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            justifyContent: "center", marginBottom: 14,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div style={{ height: 1, width: 40, background: "rgba(255,255,255,0.4)" }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.6)" }} />
          <div style={{ height: 1, width: 40, background: "rgba(255,255,255,0.4)" }} />
        </motion.div>

        <h1 style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.06em",
          lineHeight: 1.1,
          margin: 0,
          textShadow: "0 2px 20px rgba(0,0,0,0.3)",
        }}>
          Coro Vive y Canta
        </h1>

        <motion.p
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginTop: 8,
            fontWeight: 400,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Sistema Administrativo
        </motion.p>

        {/* Separador inferior */}
        <motion.div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            justifyContent: "center", marginTop: 14,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div style={{ height: 1, width: 30, background: "rgba(255,255,255,0.25)" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
          <div style={{ height: 1, width: 30, background: "rgba(255,255,255,0.25)" }} />
        </motion.div>
      </motion.div>

      {/* Barra de carga elegante */}
      <motion.div
        style={{ marginTop: 48, width: 140 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        {/* Track */}
        <div style={{
          height: 2, borderRadius: 99,
          background: "rgba(255,255,255,0.2)",
          overflow: "hidden",
        }}>
          <motion.div
            style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, rgba(255,255,255,0.4), #fff, rgba(255,255,255,0.4))",
              transformOrigin: "left",
            }}
            animate={{ scaleX: [0, 1] }}
            transition={{ duration: 2.2, delay: 1.2, ease: "easeInOut" }}
          />
        </div>

        {/* Texto de carga parpadeante */}
        <motion.p
          style={{
            textAlign: "center", marginTop: 12,
            color: "rgba(255,255,255,0.5)",
            fontSize: 9, letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Cargando…
        </motion.p>
      </motion.div>

    </div>
  )
}

export default SplashScreen