import BottomNav from "../components/BottomNav"

function Gallery() {
  return (
    <div className="min-h-screen bg-[#0E0C09] p-5 text-[#F5E9C0] pb-32">
      <div className="max-w-2xl mx-auto mt-4">
        <div className="page-header-gold rounded-3xl px-5 py-4">
          <h1 className="title-professional title-gold-black text-3xl tracking-tight">
            Galería
          </h1>
          <p className="header-text-secondary text-sm mt-1">
            Fotos y recuerdos del coro
          </p>
        </div>

        <div className="card-premium mt-6 text-center py-16">
          <span className="text-4xl block mb-4">📸</span>
          <h2 className="font-bold text-lg text-[#F5E9C0]">
            No hay imágenes todavía
          </h2>
          <p className="text-[#a89060]/60 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
            Las fotos de presentaciones, ensayos y convivios del coro aparecerán aquí próximamente.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default Gallery