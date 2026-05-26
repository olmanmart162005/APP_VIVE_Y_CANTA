import BottomNav from "../components/BottomNav"
function Profile() {
  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5">

      <h1 className="text-2xl font-bold text-[#B8860B]">
        Mi Perfil
      </h1>

      <div className="bg-white rounded-[30px] p-6 mt-6 shadow-card text-center">

        <div className="w-28 h-28 bg-[#F8F4E9] rounded-full mx-auto"></div>

        <h2 className="text-xl font-bold mt-5">
          Nombre del integrante
        </h2>

        <p className="text-gray-500">
          Rol del sistema
        </p>

      </div>
      <BottomNav />

    </div>
  )
}

export default Profile