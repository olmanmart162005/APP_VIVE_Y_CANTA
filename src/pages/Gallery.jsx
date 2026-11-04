import BottomNav from "../components/BottomNav"
import { Image as ImageIcon } from "lucide-react"

function Gallery() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-5 text-[var(--text-primary)] pb-32 transition-colors duration-200">
      <div className="max-w-2xl mx-auto mt-4 space-y-6">
        <div className="page-header-gold rounded-3xl px-5 py-5">
          <div className="flex items-center gap-2">
            <ImageIcon size={24} className="header-text-primary" />
            <h1 className="title-professional title-gold-black text-3xl tracking-tight">
              Galería Oficial
            </h1>
          </div>
          <p className="header-text-secondary text-sm mt-1">
            Memorias fotográficas de presentaciones, convivios y ensayos
          </p>
        </div>

        <div className="card-premium text-center py-16 px-4">
          <span className="text-4xl block mb-4">📸</span>
          <h2 className="font-bold text-lg text-[var(--text-primary)]">
            Galería en preparación
          </h2>
          <p className="text-[var(--text-secondary)] text-xs mt-2 max-w-xs mx-auto leading-relaxed">
            Las fotografías y grabaciones de presentaciones, ensayos y convivios del Coro Vive y Canta se exhibirán aquí.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default Gallery
