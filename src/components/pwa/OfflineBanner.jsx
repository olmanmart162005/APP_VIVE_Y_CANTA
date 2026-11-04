import { WifiOff, RefreshCw } from "lucide-react"
import { usePwa } from "../../context/PwaContext"

export default function OfflineBanner() {
  const { isOnline } = usePwa()

  if (isOnline) return null

  return (
    <aside
      aria-label="Estado de conexión"
      className="fixed top-0 left-0 right-0 z-50 bg-[#111111] text-amber-200 border-b border-amber-500/40 px-4 py-2.5 shadow-xl animate-in slide-in-from-top duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff size={16} className="text-amber-400 shrink-0" />
          <p className="truncate">
            <strong className="text-amber-300">Sin conexión:</strong> Estás navegando sin internet. Conéctate para actualizar datos o sincronizar cambios.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
        >
          <RefreshCw size={12} />
          <span>Reintentar</span>
        </button>
      </div>
    </aside>
  )
}
