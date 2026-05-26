import BottomNav from "../components/BottomNav"
function Members() {
  return (
    <div className="min-h-screen bg-[#F8F4E9] p-5">

      <h1 className="text-2xl font-bold text-[#B8860B]">
        Integrantes
      </h1>

      <p className="text-gray-500 mt-1">
        Miembros del coro
      </p>

      <div className="bg-white rounded-[30px] p-5 mt-6 shadow-card">

        <h2 className="font-bold">
          32 integrantes
        </h2>

        <p className="text-gray-500 mt-2">
          Lista de miembros del coro.
        </p>

      </div>
      <BottomNav />

    </div>
  )
}

export default Members