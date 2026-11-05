import { useState, useEffect } from "react"
import TopNavbar from "./TopNavbar"
import Sidebar from "./Sidebar"

function MainLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("sidebar_collapsed") === "true"
    } catch {
      return false
    }
  })

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebar_collapsed", String(isCollapsed))
    } catch (e) {
      console.error(e)
    }
  }, [isCollapsed])

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <Sidebar
          isCollapsed={isCollapsed}
          isMobile={false}
          onCloseMobile={() => {}}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Backdrop and Sidebar (z-[100] para estar siempre por encima de TopNavbar y contenido) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          {/* Fondo oscuro semi-transparente para cerrar tocando afuera */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel lateral que se desliza desde la izquierda */}
          <div className="relative z-[101] h-full max-w-[85vw] animate-in slide-in-from-left duration-200">
            <Sidebar
              isCollapsed={false}
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default MainLayout
