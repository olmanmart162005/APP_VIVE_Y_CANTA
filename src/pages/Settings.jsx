import BottomNav from "../components/BottomNav"
function Settings() {
  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5">

      <h1 className="text-2xl font-bold text-[#B8860B]">
        Configuración
      </h1>

      <p className="text-gray-500 mt-1">
        Opciones del sistema
      </p>

      <div className="bg-white rounded-[30px] p-5 mt-6 shadow-card">

        <button className="w-full bg-red-500 text-white rounded-2xl py-4">
          Cerrar Sesión
        </button>

      </div>
      <BottomNav />

    </div>
  )
}

export default Settings