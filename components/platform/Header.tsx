'use client'

import { useState, useEffect } from "react"
import { Dispatch, SetStateAction } from "react"
import { Bell, Cloud, Menu, MessageSquare, PanelLeft, User, LogOut, Sun, Moon, BookOpen } from "lucide-react"
import { User as SupabaseUser } from '@supabase/supabase-js'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useTheme } from "@/contexts/ThemeContext"

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  created_by: string
  created_by_role: string
}

export function Header({ sidebarOpen, setSidebarOpen, setMobileMenuOpen }: {
  sidebarOpen: boolean
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch user role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          setUserRole(profile?.role?.toLowerCase() || 'student')

          // Only fetch notifications for students
          if (profile?.role?.toLowerCase() === 'student') {
            await fetchNotifications(user.id)
          }
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

  // Separate useEffect for real-time notifications subscription
  useEffect(() => {
    if (!user || userRole !== 'student') return

    console.log('Setting up real-time notifications for student:', user.id)

    // Get mentor_id for filtering from mentor_assignments table
    const getMentorId = async () => {
      const { data: assignment } = await supabase
        .from('mentor_assignments')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

      const mentorId = assignment?.mentor_id

      // Set up real-time subscription
      const channel = supabase
        .channel('notifications-realtime', {
          config: {
            broadcast: { self: true },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            console.log('Received notification:', payload)
            const newNotification = payload.new as Notification

            // Check if this notification is for the current student
            const shouldReceive =
              (newNotification.created_by_role === 'admin' &&
                newNotification.target_audience === 'all_students') ||
              (newNotification.created_by_role === 'mentor' &&
                newNotification.target_audience === 'mentor_students' &&
                newNotification.mentor_id === mentorId)

            if (shouldReceive) {
              console.log('Adding notification to list')
              // Add to bell list
              setNotifications((prev) => [newNotification, ...prev.slice(0, 9)])
              // Increment unread count
              setUnreadCount((prev) => prev + 1)
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
        })

      // Clean up subscription
      return () => {
        console.log('Unsubscribing from notifications')
        supabase.removeChannel(channel)
      }
    }

    const cleanup = getMentorId()
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.())
    }
  }, [user, userRole])

  const fetchNotifications = async (userId: string) => {
    try {
      setLoadingNotifications(true)

      // Fetch notifications
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (notifError) {
        console.error('Error fetching notifications:', notifError)
        return
      }

      setNotifications(notificationsData || [])

      // Fetch read notifications
      const { data: readData, error: readError } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)

      if (!readError) {
        const readIds = new Set(readData?.map(r => r.notification_id) || [])
        const unread = notificationsData?.filter(n => !readIds.has(n.id)).length || 0
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: user.id,
        })

      if (!error) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error logging out:', error.message)
      return
    }

    router.push('/login')
  }

  const handleProfile = () => {
    router.push('/settings/#profile')
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

  // Get user email
  const getUserEmail = () => {
    if (!user || !user.email) return "No email"
    return user.email
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <PanelLeft className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-xl font-semibold">Edutou</h1>
        <div className="flex items-center gap-3">
          {userRole === 'student' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-2xl relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {unreadCount} unread
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="cursor-pointer p-4 flex-col items-start"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-2 w-full">
                          <Bell className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">{notification.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleDateString()} at{' '}
                              {new Date(notification.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-2xl">
                {theme === 'light' && <Sun className="h-5 w-5" />}
                {theme === 'dark' && <Moon className="h-5 w-5" />}
                {theme === 'reading' && <BookOpen className="h-5 w-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme('light')}
                className="cursor-pointer"
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
                {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme('dark')}
                className="cursor-pointer"
              >
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
                {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme('reading')}
                className="cursor-pointer"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Reading Mode</span>
                {theme === 'reading' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9 border-2 border-primary">
                  <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {loading ? "Loading..." : getDisplayName()}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {loading ? "Loading..." : getUserEmail()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}