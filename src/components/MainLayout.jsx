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

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative z-50 h-full animate-in slide-in-from-left duration-200">
            <Sidebar
              isCollapsed={false}
              isMobile={true}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

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
    </div>
  )
}

export default MainLayout
