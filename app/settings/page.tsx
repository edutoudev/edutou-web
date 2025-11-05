"use client"

import { useState, useEffect } from "react"
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User, Bell, Lock, CreditCard, Settings as SettingsIcon, Sparkles } from "lucide-react"

import { Sidebar } from "@/components/sidebar"
import { cn } from "@/lib/utils"
import { Header } from "@/components/platform/Header"
import { createClient } from "@/utils/supabase/client"

import { ProfileTab } from "./ProfileTab"
import { NotificationsTab } from "./NotificationsTab"

import { PreferencesTab } from "./PreferencesTab"
import { SecurityTab } from "./SecurityTab"

const settingsSections = [
  { id: "profile", label: "Profile", icon: User, description: "Manage your personal information" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Configure notification preferences" },
  { id: "security", label: "Security", icon: Lock, description: "Password and authentication" },
  { id: "preferences", label: "Preferences", icon: SettingsIcon, description: "Application settings" },
]

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    workflowSuccess: true,
    workflowFailure: true,
    weeklyReport: true,
    securityAlerts: true,
  })

  const supabase = createClient()

  // Fetch user data
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const validTabs = ["profile", "notifications", "security", "billing", "preferences"]
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash)
      }
    }

    handleHashChange()
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    window.history.pushState(null, "", `#${value}`)
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab />
      case "notifications":
        return <NotificationsTab notifications={notifications} handleNotificationChange={handleNotificationChange} />
      case "security":
        return <SecurityTab />
      case "preferences":
        return <PreferencesTab />
      default:
        return <ProfileTab />
    }
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 transition-colors duration-300">
      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} />
      <div className={cn("min-h-screen transition-all duration-300 ease-in-out", sidebarOpen ? "md:pl-64" : "md:pl-0")}>
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 reading:from-amber-600 reading:to-orange-600 flex items-center justify-center shadow-lg">
                  <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 reading:from-amber-600 reading:via-orange-600 reading:to-yellow-600 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1">Manage your account preferences and configuration</p>
                </div>
              </div>
            </div>

            {/* Settings Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              {/* Settings Navigation - Desktop Sidebar */}
              <div className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24 space-y-2">
                  {settingsSections.map((section) => {
                    const Icon = section.icon
                    const isActive = activeTab === section.id
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleTabChange(section.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl transition-all duration-200 group",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 reading:from-amber-600 reading:to-orange-600 text-white shadow-lg scale-[1.02]"
                            : "bg-white/70 dark:bg-slate-800/70 reading:bg-amber-100/70 hover:bg-white dark:hover:bg-slate-800 reading:hover:bg-amber-100 border border-gray-100 dark:border-slate-700 reading:border-amber-200 hover:shadow-md hover:scale-[1.01]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            isActive
                              ? "bg-white/20"
                              : "bg-blue-100 dark:bg-blue-900/30 reading:bg-amber-200 group-hover:scale-110"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isActive
                                ? "text-white"
                                : "text-blue-600 dark:text-blue-400 reading:text-amber-600"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-semibold text-sm truncate",
                              isActive
                                ? "text-white"
                                : "text-gray-900 dark:text-gray-100 reading:text-amber-900"
                            )}>
                              {section.label}
                            </div>
                            <div className={cn(
                              "text-xs truncate",
                              isActive
                                ? "text-white/80"
                                : "text-gray-500 dark:text-gray-400 reading:text-amber-700"
                            )}>
                              {section.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Navigation - Horizontal Scroll */}
              <div className="lg:hidden col-span-1">
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <div className="flex gap-2 min-w-max">
                    {settingsSections.map((section) => {
                      const Icon = section.icon
                      const isActive = activeTab === section.id
                      return (
                        <button
                          key={section.id}
                          onClick={() => handleTabChange(section.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap text-sm font-medium",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 reading:from-amber-600 reading:to-orange-600 text-white shadow-lg"
                              : "bg-white/70 dark:bg-slate-800/70 reading:bg-amber-100/70 text-gray-700 dark:text-gray-300 reading:text-amber-900 border border-gray-200 dark:border-slate-700 reading:border-amber-200"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {section.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="col-span-1 lg:col-span-9">
                <div className="animate-[fadeIn_0.3s_ease-in]">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  )
}
