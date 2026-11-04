import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "react-hot-toast"

const PwaContext = createContext(null)

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  useEffect(() => {
    // 1. Detección de dispositivo iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase()
    const isApple =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
    setIsIOS(isApple)

    // Detección de Safari en iOS (excluyendo Chrome iOS 'crios', Firefox 'fxios', etc.)
    const isWebkit = /webkit/.test(ua)
    const isOtherBrowser = /crios|fxios|edgios|opios|opt/.test(ua)
    setIsIOSSafari(isApple && isWebkit && !isOtherBrowser)

    // 2. Detección de modo Standalone / Ya instalada
    const checkIsInstalled = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://")
      setIsInstalled(isStandaloneMode)
    }

    checkIsInstalled()

    const mediaMatcher = window.matchMedia("(display-mode: standalone)")
    const handleMediaChange = (e) => {
      setIsInstalled(e.matches)
    }
    try {
      mediaMatcher.addEventListener("change", handleMediaChange)
    } catch {
      mediaMatcher.addListener(handleMediaChange)
    }

    // 3. Captura del evento nativo beforeinstallprompt (Android / Chromium)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // 4. Captura del evento de instalación exitosa
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setShowInstallModal(false)
      toast.success("¡Coro Vive y Canta se ha instalado correctamente!", {
        icon: "✨",
        duration: 4000,
      })
    }

    // 5. Monitoreo de conectividad a internet
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      try {
        mediaMatcher.removeEventListener("change", handleMediaChange)
      } catch {
        mediaMatcher.removeListener(handleMediaChange)
      }
    }
  }, [])

  // Disparar la acción de instalación
  const promptInstall = async () => {
    if (isInstalled) {
      toast("La aplicación ya está instalada en tu dispositivo", {
        icon: "📱",
      })
      return
    }

    // En iOS siempre abrimos el modal de instrucciones ilustradas
    if (isIOS) {
      setShowInstallModal(true)
      return
    }

    // En Android / Chromium si tenemos el evento diferido:
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === "accepted") {
          toast.success("Iniciando instalación de Coro Vive y Canta…")
          setDeferredPrompt(null)
        } else {
          toast("Instalación cancelada", { icon: "ℹ️" })
        }
      } catch (err) {
        console.error("Error al invocar instalación:", err)
        setShowInstallModal(true)
      }
    } else {
      // Si no hay evento diferido (ej. Chrome en escritorio o instrucciones manuales):
      setShowInstallModal(true)
    }
  }

  return (
    <PwaContext.Provider
      value={{
        deferredPrompt,
        isInstalled,
        isIOS,
        isIOSSafari,
        showInstallModal,
        setShowInstallModal,
        promptInstall,
        isOnline,
        canInstall: !isInstalled,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error("usePwa debe ser utilizado dentro de un PwaProvider")
  }
  return context
}
