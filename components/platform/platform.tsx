'use client'

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "../sidebar"
import { Header } from "./Header"
import { HomeTab } from "./tabs/HomeTab"

export function Platform() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isMounted, setIsMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Handle hydration and check if desktop
  useEffect(() => {
    setIsMounted(true)
    setIsDesktop(window.innerWidth >= 768)

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load sidebar width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('sidebarWidth')
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10))
    }
  }, [])

  // Save sidebar width to localStorage when it changes
  const handleWidthChange = (width: number) => {
    setSidebarWidth(width)
    localStorage.setItem('sidebarWidth', width.toString())
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />

      {/* Desktop Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        sidebarWidth={sidebarWidth}
        onWidthChange={handleWidthChange}
      />

      {/* Main Content */}
      <div
        className={cn("min-h-screen transition-all duration-300 ease-in-out")}
        style={{
          marginLeft: isMounted && isDesktop && sidebarOpen ? `${sidebarWidth}px` : '0px'
        }}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <main className="flex-1 p-4 md:p-6">
          <HomeTab />
        </main>
      </div>
    </div>
  )
}