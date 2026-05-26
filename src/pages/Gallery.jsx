import BottomNav from "../components/BottomNav"
function Gallery() {
  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5">

      <h1 className="text-2xl font-bold text-[#B8860B]">
        Galería
      </h1>

      <p className="text-gray-500 mt-1">
        Fotos y recuerdos del coro
      </p>

      <div className="bg-white rounded-[30px] p-5 mt-6 shadow-card">

        <h2 className="font-bold">
          No hay imágenes
        </h2>

        <p className="text-gray-500 mt-2">
          Las fotos aparecerán aquí.
        </p>

      </div>
      <BottomNav />

    </div>
  )
}

export default Gallery