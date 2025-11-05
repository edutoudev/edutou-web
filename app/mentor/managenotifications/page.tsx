'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Send,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  created_by: string
  created_by_role: string
  target_audience: string
  mentor_id: string
  created_at: string
}

export default function MentorManageNotifications() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
    fetchNotifications()
    fetchStudentCount()
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'mentor') {
      router.push('/')
    }
  }

  const fetchStudentCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Query mentor_assignments table to get assigned students
      const { count, error } = await supabase
        .from('mentor_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .eq('status', 'active')

      if (error) {
        console.error('Error fetching student count:', error)
        setStudentCount(0)
        return
      }

      setStudentCount(count || 0)
    } catch (error) {
      console.error('Error fetching student count:', error)
      setStudentCount(0)
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notifications:', error)
        setNotifications([])
      } else {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      alert('Please fill in both title and message')
      return
    }

    try {
      setSending(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .insert({
          title: newNotification.title.trim(),
          message: newNotification.message.trim(),
          created_by: user.id,
          created_by_role: 'mentor',
          target_audience: 'mentor_students',
          mentor_id: user.id,
        })

      if (error) {
        console.error('Error sending notification:', error)
        alert('Failed to send notification')
        return
      }

      alert(`Notification sent successfully to ${studentCount} student(s)!`)
      setNewNotification({ title: '', message: '' })
      await fetchNotifications()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this notification?')
    if (!confirmed) return

    try {
      setDeletingId(id)

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting notification:', error)
        alert('Failed to delete notification')
        return
      }

      await fetchNotifications()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete notification')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
              Manage Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1 flex items-center gap-2">
              Send notifications to your students
              <Badge variant="outline" className="ml-2">
                <Users className="h-3 w-3 mr-1" />
                {studentCount} student{studentCount !== 1 ? 's' : ''}
              </Badge>
            </p>
          </div>

          {/* Create Notification */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Send New Notification
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                This will be sent to all your students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  Title
                </label>
                <Input
                  type="text"
                  placeholder="Enter notification title..."
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  Message
                </label>
                <Textarea
                  placeholder="Enter notification message..."
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  className="rounded-xl min-h-[120px]"
                />
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={sending || !newNotification.title.trim() || !newNotification.message.trim() || studentCount === 0}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to {studentCount} Student{studentCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              {studentCount === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  You don't have any students assigned yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sent Notifications */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Sent Notifications ({notifications.length})
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                View all notifications you've sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    No notifications sent yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 reading:border-amber-300 bg-white dark:bg-slate-800 reading:bg-amber-50 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                              {notification.title}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 reading:bg-blue-200">
                              My Students
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 text-sm mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 reading:text-amber-600">
                            <Calendar className="h-3 w-3" />
                            {new Date(notification.created_at).toLocaleDateString()} at{' '}
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={deletingId === notification.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          {deletingId === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
