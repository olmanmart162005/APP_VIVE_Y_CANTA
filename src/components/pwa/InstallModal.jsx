import { X, Share, PlusSquare, CheckCircle2, Download, Smartphone, Sparkles, AlertCircle } from "lucide-react"
import { usePwa } from "../../context/PwaContext"
import logoImg from "../../assets/logo.png"

export default function InstallModal() {
  const {
    showInstallModal,
    setShowInstallModal,
    isIOS,
    isIOSSafari,
    deferredPrompt,
    promptInstall,
    isInstalled,
  } = usePwa()

  if (!showInstallModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setShowInstallModal(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-card)] border border-[var(--gold)]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Dorada Premium */}
        <div className="relative p-6 bg-gradient-to-r from-[#111111] via-[#1C1A14] to-[#111111] border-b border-[var(--gold)]/20 text-center">
          <button
            onClick={() => setShowInstallModal(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-2xl bg-[var(--gold)]/20 blur-md animate-pulse" />
            <img
              src={logoImg}
              alt="Coro Vive y Canta"
              className="relative w-16 h-16 rounded-2xl object-cover border border-[var(--gold)] shadow-lg"
            />
          </div>

          <h3 className="title-professional text-xl sm:text-2xl font-bold text-[var(--gold)] tracking-tight">
            Instalar Coro Vive y Canta
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
            Disfruta de una experiencia fluida, rápida y a pantalla completa en tu dispositivo.
          </p>
        </div>

        {/* Contenido según dispositivo */}
        <div className="p-6 overflow-y-auto space-y-5 text-left">
          {isInstalled ? (
            /* YA ESTÁ INSTALADA */
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-lg font-bold text-[var(--text-primary)]">
                ¡Aplicación ya instalada!
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                Ya tienes Coro Vive y Canta en tu pantalla de inicio como aplicación nativa.
              </p>
            </div>
          ) : isIOS ? (
            /* GUÍA EXCLUSIVA PARA IPHONE / IPAD */
            <div className="space-y-4">
              {!isIOSSafari && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    <strong>Aviso para iPhone:</strong> Apple requiere instalar desde el navegador <strong>Safari</strong>. Si abriste este enlace desde Chrome o WhatsApp, pulsa compartir y selecciona <em>Abrir en Safari</em>.
                  </p>
                </div>
              )}

              <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Pasos para instalar en tu iPhone:
              </p>

              {/* Paso 1 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                <div className="w-8 h-8 rounded-xl bg-[var(--gold)] text-[#111111] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Pulsa el botón Compartir
                    </p>
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--gold)]">
                      <Share size={13} />
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Se ubica en la barra de herramientas inferior de Safari.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                <div className="w-8 h-8 rounded-xl bg-[var(--gold)] text-[#111111] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Elige "Añadir a pantalla de inicio"
                    </p>
                    <span className="inline-flex items-center justify-center p-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--gold)]">
                      <PlusSquare size={13} />
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Desliza hacia abajo en el menú de opciones hasta encontrar el icono cuadrado con signo más (+).
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)]">
                <div className="w-8 h-8 rounded-xl bg-[var(--gold)] text-[#111111] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Confirma el nombre y pulsa "Añadir"
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    El sistema mostrará el icono oficial y el nombre <strong>Vive y Canta</strong>. Toca <strong>Añadir</strong> en la esquina superior derecha.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center gap-2 text-[11px] text-[var(--gold-soft)]">
                <Sparkles size={14} className="shrink-0 text-[var(--gold)]" />
                <span>¡Listo! El icono del coro aparecerá en tu pantalla de inicio junto a tus apps.</span>
              </div>
            </div>
          ) : (
            /* ANDROID / CHROME / ESCRITORIO */
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center mx-auto mb-2 border border-[var(--gold)]/30">
                  <Smartphone size={24} />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Instalación Rápida para Android
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Instala la aplicación oficial para acceder sin barras de navegación y con carga ultra rápida.
                </p>
              </div>

              {deferredPrompt ? (
                <button
                  onClick={promptInstall}
                  className="btn-primary w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download size={18} />
                  <span>Instalar Ahora</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-2 text-xs">
                  <p className="font-bold text-[var(--text-primary)]">
                    Instrucciones desde el navegador:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] text-[11px]">
                    <li>Abre el menú de opciones (los tres puntos verticales <strong>⋮</strong> arriba a la derecha).</li>
                    <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                    <li>Confirma la instalación.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-[var(--bg-muted)] border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={() => setShowInstallModal(false)}
            className="btn-secondary !py-2 !px-5 text-xs font-bold cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
