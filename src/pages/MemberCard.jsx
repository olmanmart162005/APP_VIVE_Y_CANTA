import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Download, FileImage, FileText } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { supabase } from "../lib/supabase"

import logo from "../assets/logo.png"
import hero from "../assets/hero.png"
import firmaPadre from "../assets/firmaPadre.png"
import selloCorosIglesia from "../assets/selloCorosIglesia.png"
import selloVYC from "../assets/selloVYC.jpg"

async function toBase64(url) {
  try {
    const res = await fetch(url, { mode: "cors" })
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function MemberCard() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [member, setMember] = useState(null)
  const [fotoBase64, setFotoBase64] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const cardRef = useRef(null)

  useEffect(() => { loadMember() }, [])

  const loadMember = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()

    if (data) {
      setMember(data)
      if (data.foto) {
        const b64 = await toBase64(data.foto)
        setFotoBase64(b64)
      }
    }
  }

  const carnetId = member
    ? (() => {
        const digits = String(member.id).replace(/[^0-9]/g, "")
        const num = digits ? String(parseInt(digits.slice(0, 8), 10) % 9000 + 1000) : "0001"
        return `CVC-${num}`
      })()
    : ""

  const fechaEmision = new Date().toLocaleDateString("es-HN", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const captureCard = async () => {
    return await html2canvas(cardRef.current, {
      scale: 4,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    })
  }

  const downloadPNG = async () => {
    setDownloading(true)
    try {
      const canvas = await captureCard()
      const link = document.createElement("a")
      link.download = `carnet-${member.nombre_completo}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } finally { setDownloading(false) }
  }

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const canvas = await captureCard()
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [55, 85] })
      pdf.addImage(imgData, "PNG", 0, 0, 55, 85)
      pdf.save(`carnet-${member.nombre_completo}.pdf`)
    } finally { setDownloading(false) }
  }

  if (!member)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6ED]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-[#B8860B] font-medium text-sm tracking-widest uppercase">
            Cargando carnet…
          </p>
        </div>
      </div>
    )

  const fotoSrc = fotoBase64 || member.foto || hero

  return (
    <div className="min-h-screen bg-[#FAF6ED] pb-16">

      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFB8]">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-[#E8DFB8] transition">
          <ArrowLeft size={20} className="text-[#B8860B]" />
        </button>
        <h1 className="font-bold tracking-[0.15em] text-[#B8860B] text-sm uppercase"
          style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif" }}>
          Carnet Oficial
        </h1>
        <div className="w-9" />
      </div>

      {/* Carnet */}
      <div className="flex justify-center mt-8 px-4">
        <div
          ref={cardRef}
          style={{
            width: "330px",
            minHeight: "510px",
            fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
            background: "#FFFDF6",
            position: "relative",
            overflow: "hidden",
          }}
          className="rounded-3xl shadow-2xl border-2 border-[#D4AF37]"
        >

          {/* Línea top */}
          <div style={{ height: "6px", background: "linear-gradient(90deg,#D4AF37,#F0D060,#B8860B)" }} />

          {/* Header dorado */}
          <div style={{
            background: "linear-gradient(135deg,#C8961A 0%,#E8C84A 50%,#B8780A 100%)",
            padding: "18px 20px",
            position: "relative",
            overflow: "hidden",
          }}>
            <img src={hero} alt="" style={{
              position: "absolute", right: "-20px", top: 0,
              height: "100%", opacity: 0.08, pointerEvents: "none",
            }} />
            <div className="flex items-center gap-3 relative z-10">
              <img src={logo} alt="Logo" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
              <div>
                <p style={{ color: "#fff", fontWeight: 900, fontSize: "15px", lineHeight: 1.1, letterSpacing: "0.05em" }}>
                  Vive y Canta
                </p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Pastoral de Coros
                </p>
              </div>
            </div>
          </div>

          {/* Foto */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
            <div style={{
              width: "96px", height: "96px", borderRadius: "50%",
              border: "5px solid #D4AF37", overflow: "hidden",
              background: "#f0e8d0", boxShadow: "0 4px 20px rgba(180,140,0,0.3)",
            }}>
              <img src={fotoSrc} alt={member.nombre_completo} crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ padding: "14px 22px 0", textAlign: "center" }}>

            {/* Nombre */}
            <p style={{ fontWeight: 900, fontSize: "17px", color: "#8B6300",
                        lineHeight: 1.2, letterSpacing: "0.03em", marginBottom: "4px" }}>
              {member.nombre_completo}
            </p>

            {/* ID */}
            <p style={{ fontSize: "9px", color: "#B8860B", letterSpacing: "0.2em",
                        fontWeight: 600, marginBottom: "12px" }}>
              {carnetId}
            </p>

            {/* Divisor */}
            <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#D4AF37,transparent)", marginBottom: "10px" }} />

            {/* Texto oficial */}
            <p style={{ fontSize: "8px", color: "#6B5520", lineHeight: 1.6, marginBottom: "10px" }}>
              El portador de este carnet es miembro activo de la Pastoral de Coros de la{" "}
              <strong>Parroquia Nuestro Señor de Esquipulas.</strong>
            </p>

            {/* Datos */}
            <div style={{
              background: "linear-gradient(135deg,#FDF8EC,#F5EDD0)",
              border: "1px solid #E8D080", borderRadius: "12px",
              padding: "10px 14px", textAlign: "left", marginBottom: "10px",
            }}>
              {[
                ["Identidad", member.dni || "Pendiente"],
                ["Teléfono",  member.telefono || "Pendiente"],
                ["Emisión",   fechaEmision],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "8px", color: "#9B7A30", fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: "8px", color: "#4A3800", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Versículo */}
            <p style={{ fontStyle: "italic", fontSize: "8px", color: "#9B7A30", lineHeight: 1.5, marginBottom: "4px" }}>
              "Canten al Señor un cántico nuevo, cante al Señor toda la tierra."
            </p>
            <p style={{ fontSize: "7px", color: "#B8860B", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "10px" }}>
              — SALMO 96:1
            </p>

            {/* Divisor */}
            <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,#D4AF37,transparent)", marginBottom: "10px" }} />

            {/* Sellos y firma */}
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", marginBottom: "12px" }}>

              <div style={{ textAlign: "center" }}>
                <img src={selloCorosIglesia} alt="Sello"
                  style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "50%", border: "2px solid #D4AF37" }} />
                <p style={{ fontSize: "6px", color: "#7A5C20", marginTop: "2px", lineHeight: 1.3 }}>
                  Sello Pastoral<br />de Coros
                </p>
              </div>

              <div style={{ textAlign: "center" }}>
                <img src={firmaPadre} alt="Firma"
                  style={{ width: "72px", objectFit: "contain", marginBottom: "2px" }} />
                <div style={{ height: "1px", background: "#D4AF37", width: "72px", margin: "0 auto 3px" }} />
                <p style={{ fontSize: "6px", color: "#4A3800", fontWeight: 700 }}>
                  P. Florentino Hernández
                </p>
                <p style={{ fontSize: "6px", color: "#9B7A30" }}>Firma autorizada</p>
              </div>

              <div style={{ textAlign: "center" }}>
                <img src={selloVYC} alt="Sello VYC"
                  style={{ width: "68px", height: "68px", borderRadius: "50%", objectFit: "cover", border: "2px solid #D4AF37" }} />
                <p style={{ fontSize: "6px", color: "#7A5C20", marginTop: "2px", lineHeight: 1.3 }}>
                  Sello<br />del Coro
                </p>
              </div>

            </div>

            {/* Bendición */}
            <div style={{
              background: "linear-gradient(135deg,#FDF8EC,#F5EDD0)",
              border: "1px solid #E8D080", borderRadius: "10px",
              padding: "8px 12px", marginBottom: "16px",
            }}>
              <p style={{ fontSize: "7px", color: "#6B5520", fontStyle: "italic", lineHeight: 1.6 }}>
                "Que tu voz continúe alabando a Dios y llevando esperanza a través del canto."
              </p>
            </div>

          </div>

          {/* Línea bottom */}
          <div style={{ height: "6px", background: "linear-gradient(90deg,#B8780A,#E8C84A,#C8961A)" }} />

        </div>
      </div>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 px-6">
        <button onClick={downloadPNG} disabled={downloading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm tracking-wider transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#D4AF37,#B8860B)", color: "#fff",
            boxShadow: "0 4px 18px rgba(180,140,0,0.35)",
            fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", letterSpacing: "0.1em",
          }}>
          <FileImage size={16} />
          {downloading ? "Generando…" : "Descargar Imagen"}
        </button>

        <button onClick={downloadPDF} disabled={downloading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm tracking-wider transition-all disabled:opacity-50"
          style={{
            background: "#fff", color: "#B8860B", border: "2px solid #D4AF37",
            boxShadow: "0 4px 18px rgba(180,140,0,0.15)",
            fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", letterSpacing: "0.1em",
          }}>
          <FileText size={16} />
          {downloading ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

    </div>
  )
}

export default MemberCard