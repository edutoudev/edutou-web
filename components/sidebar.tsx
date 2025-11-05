"use client"

import { useState, useEffect } from "react"
import {
  ChevronDown,
  Settings,
  X,
  Home,
  BarChart2,
  Trophy,
  FolderOpen,
  Library,
  ClipboardList,
  CreditCard,
  Users2,
  Shield,
  MessagesSquare,
  Video,
  BookOpen,
  FileText,
  UserPlus,
  GraduationCap,
  BarChart3,
  PlusCircle,
  Award,
  Bell,
  Code2,
  MessageCircle,
  ClipboardCheck
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"

interface SidebarProps {
  isOpen: boolean
  isMobile?: boolean
  onClose?: () => void
  sidebarWidth?: number
  onWidthChange?: (width: number) => void
}

interface NavigationItem {
  title: string
  icon: React.ReactElement
  url: string
  badge?: string
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

// Admin Navigation
// const adminNavigationSections: NavigationSection[] = [
//   {
//     title: "Overview",
//     items: [
//       { title: "Dashboard", icon: <BarChart3 className="h-5 w-5" />, url: "/admin" },
//       { title: "Analytics", icon: <BarChart2 className="h-5 w-5" />, url: "/admin/analytics" },
//     ]
//   },
//   {
//     title: "Management",
//     items: [
//       { title: "Users", icon: <Users2 className="h-5 w-5" />, url: "/admin/users" },
//       { title: "Courses", icon: <BookOpen className="h-5 w-5" />, url: "/admin/courses" },
//       { title: "Quizzes", icon: <FileText className="h-5 w-5" />, url: "/admin/quizzes" },
//     ]
//   },
//   {
//     title: "System",
//     items: [
//       { title: "Settings", icon: <Settings className="h-5 w-5" />, url: "/admin/settings" },
//       { title: "Reports", icon: <ClipboardList className="h-5 w-5" />, url: "/admin/reports" },
//     ]
//   },
// ]
const adminNavigationSections: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Home", icon: <GraduationCap className="h-5 w-5" />, url: "/admin" },
      { title: "All Students", icon: <Users2 className="h-5 w-5" />, url: "/admin/students" },
      { title: "Manage Mentors", icon: <UserPlus className="h-5 w-5" />, url: "/admin/managementor" },
      { title: "Course Master", icon: <ClipboardCheck className="h-5 w-5" />, url: "/coursemaster" },
      { title: "Manage Points", icon: <Award className="h-5 w-5" />, url: "/admin/managepoints" },
    ]
  },
  {
    title: "Teaching",
    items: [
      { title: "Quizzes", icon: <FileText className="h-5 w-5" />, url: "/mentor/makequiz" },
      { title: "Manage Tasks", icon: <ClipboardList className="h-5 w-5" />, url: "/admin/managetask" },
      { title: "Manage Resources", icon: <FolderOpen className="h-5 w-5" />, url: "/mentor/resourcesmanager" },
      { title: "Manage Hackathon", icon: <Trophy className="h-5 w-5" />, url: "/mentor/hackathonmanager" },
    ]
  },
  {
    title: "Communication",
    items: [
      { title: "Discussion", icon: <MessagesSquare className="h-5 w-5" />, url: "/discussion" },
      { title: "Notifications", icon: <Bell className="h-5 w-5" />, url: "/admin/managenotifications" },
      { title: "Manage Feedback", icon: <MessageCircle className="h-5 w-5" />, url: "/admin/managefeedback" },
    ]
  },
]
// Mentor Navigation
const mentorNavigationSections: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Home", icon: <GraduationCap className="h-5 w-5" />, url: "/mentor" },
      { title: "My Students", icon: <Users2 className="h-5 w-5" />, url: "/mentor/students" },
    ]
  },
  {
    title: "Teaching",
    items: [
      { title: "Quizzes", icon: <FileText className="h-5 w-5" />, url: "/mentor/makequiz" },
      { title: "Manage Tasks", icon: <ClipboardList className="h-5 w-5" />, url: "/mentor/managetask" },
      { title: "Manage Resources", icon: <FolderOpen className="h-5 w-5" />, url: "/mentor/resourcesmanager" },
      { title: "Manage Hackathon", icon: <Trophy className="h-5 w-5" />, url: "/mentor/hackathonmanager" },
    ]
  },
  {
    title: "Communication",
    items: [
      { title: "Discussion", icon: <MessagesSquare className="h-5 w-5" />, url: "/discussion" },
      { title: "Notifications", icon: <Bell className="h-5 w-5" />, url: "/mentor/managenotifications" },
    ]
  },
]

// Course Master Navigation
const coursemasterNavigationSections: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", icon: <GraduationCap className="h-5 w-5" />, url: "/coursemaster" },
    ]
  },
]

// Student Navigation
const studentNavigationSections: NavigationSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Home", icon: <Home className="h-5 w-5" />, url: "/" },
      { title: "My Mentor", icon: <UserPlus className="h-5 w-5" />, url: "/student/mentor" },
      { title: "Leaderboard", icon: <Trophy className="h-5 w-5" />, url: "/leaderboard" },
      { title: "Feedback", icon: <MessagesSquare className="h-5 w-5" />, url: "/feedback" },
    ]
  },
  {
    title: "Learn",
    items: [
      { title: "Tasks", icon: <ClipboardList className="h-5 w-5" />, url: "/task" },
      { title: "Resources", icon: <Library className="h-5 w-5" />, url: "/resources"},
      { title: "Hackathon", icon: <Code2 className="h-5 w-5" />, url: "/hackathon" },
    ]
  },
  {
    title: "Forum",
    items: [
      { title: "Discussion", icon: <MessageCircle className="h-5 w-5" />, url: "/discussion" },
    ]
  },
]

export function Sidebar({ isOpen, isMobile = false, onClose, sidebarWidth = 256, onWidthChange }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Overview: true,
    Learn: true,
    Forum: true,
    Management: true,
    System: true,
    Teaching: true,
    Communication: true
  })
  const [currentPath, setCurrentPath] = useState('/')
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isResizing, setIsResizing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        // Fetch user role from profiles table
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          setUserRole(profile?.role?.toLowerCase() || 'student')
        }
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

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isResizing || isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX
      // Constrain width between 200px and 400px
      if (newWidth >= 200 && newWidth <= 400 && onWidthChange) {
        onWidthChange(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, isMobile, onWidthChange])

  // Get navigation sections based on user role
  const getNavigationSections = () => {
    switch (userRole) {
      case 'admin':
        return adminNavigationSections
      case 'mentor':
        return mentorNavigationSections
      case 'coursemaster':
        return coursemasterNavigationSections
      case 'student':
      default:
        return studentNavigationSections
    }
  }

  // Get display name with fallback
  const getDisplayName = () => {
    if (!user) return "Anonymous"
    
    // Check for full_name in user_metadata
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    
    // Check for name in user_metadata
    if (user.user_metadata?.name) {
      return user.user_metadata.name
    }
    
    // Fallback to email username
    if (user.email) {
      return user.email.split('@')[0]
    }
    
    return "Anonymous"
  }

  // Get avatar initials
  const getInitials = () => {
    const displayName = getDisplayName()
    
    if (displayName === "Anonymous") {
      return "AN"
    }
    
    const names = displayName.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return displayName.slice(0, 2).toUpperCase()
  }

  // Get avatar URL
  const getAvatarUrl = () => {
    if (!user) return ""
    return user.user_metadata?.avatar_url || ""
  }

  const sidebarContent = (
    <div className="flex h-full flex-col border-r bg-background relative">
      <div className={cn("flex items-center p-4", isMobile && "justify-between")}>
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-2xl">
            <img
              src="/logo.jpg"
              alt="Edutou Skill Academy Logo"
              className="h-auto w-auto mr-3 rounded-lg shadow-lg"
            />
          </div>
          <div>
            <h2 className="font-semibold">Edutou</h2>
            <p className="text-xs text-muted-foreground">Skill Academy</p>
          </div>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-4">
          {getNavigationSections().map((section) => (
            <div key={section.title}>
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection(section.title)}
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    expandedSections[section.title] ? "rotate-180" : ""
                  )}
                />
              </button>
              
              {expandedSections[section.title] && (
                <div className="mt-1 space-y-1">
                  {section.items.map((item) => (
                    <a
                      key={item.title}
                      href={item.url}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted transition-colors",
                        currentPath === item.url ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="space-y-1">
          <a href="/settings" className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </a>
          <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted overflow-hidden">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
              <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
            </Avatar>
            <span className="truncate flex-1 min-w-0 text-left">
              {loading ? "Loading..." : getDisplayName()}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "capitalize flex-shrink-0 text-xs px-1.5",
                userRole === 'admin' && "bg-red-500/10 text-red-600 border-red-300 dark:bg-red-500/20 dark:text-red-400",
                userRole === 'mentor' && "bg-blue-500/10 text-blue-600 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400",
                userRole === 'coursemaster' && "bg-purple-500/10 text-purple-600 border-purple-300 dark:bg-purple-500/20 dark:text-purple-400",
                userRole === 'student' && "bg-green-500/10 text-green-600 border-green-300 dark:bg-green-500/20 dark:text-green-400"
              )}
            >
              {userRole === 'coursemaster' ? 'CM' : userRole || 'Student'}
            </Badge>
          </button>
        </div>
      </div>

      {/* Resize Handle - Desktop Only */}
      {!isMobile && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
            isResizing && "opacity-100 bg-blue-500"
          )} />
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden transform border-r bg-background transition-transform duration-300 ease-in-out md:block",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isResizing && "transition-none"
        )}
        style={{ width: `${sidebarWidth}px` }}
      >
        {sidebarContent}
      </div>
      {/* Resize cursor overlay */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ userSelect: 'none' }} />
      )}
    </>
  )
}