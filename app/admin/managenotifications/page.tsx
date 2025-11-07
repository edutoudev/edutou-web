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
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BroadcastNotification {
  id: string
  title: string
  message: string
  created_by: string
  created_by_role: string
  target_audience: string
  created_at: string
}

export default function AdminManageNotifications() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
    fetchBroadcasts()
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

    if (profile?.role !== 'admin') {
      router.push('/')
    }
  }

  const fetchBroadcasts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching broadcasts:', error)
        setBroadcasts([])
      } else {
        setBroadcasts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setBroadcasts([])
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to send notifications')
        return
      }

      // Get user profile to verify role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'mentor', 'coursemaster'].includes(profile.role)) {
        alert('Only admins and mentors can send broadcasts')
        return
      }

      console.log('Creating broadcast notification...')

      // Insert into broadcast_notifications table
      // The database trigger will automatically send to all students
      const { data, error } = await supabase
        .from('broadcast_notifications')
        .insert({
          title: newNotification.title.trim(),
          message: newNotification.message.trim(),
          target_audience: 'all_students',
          created_by: user.id,
          created_by_role: profile.role,
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        alert(`Failed to send broadcast: ${error.message}`)
        return
      }

      console.log('Broadcast created:', data)

      // Count how many students will receive it
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      alert(`✅ Broadcast sent successfully to ${count || 0} student(s)!`)
      setNewNotification({ title: '', message: '' })
      await fetchBroadcasts()
    } catch (error) {
      console.error('Error sending broadcast:', error)
      alert('Failed to send broadcast: ' + String(error))
    } finally {
      setSending(false)
    }
  }

  const handleDeleteBroadcast = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this broadcast? This will also delete all user notifications associated with it.')
    if (!confirmed) return

    try {
      setDeletingId(id)

      const { error } = await supabase
        .from('broadcast_notifications')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting broadcast:', error)
        alert('Failed to delete broadcast')
        return
      }

      await fetchBroadcasts()
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete broadcast')
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
            <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1">
              Send notifications to all students
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
                This will be sent to all students
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
                disabled={sending || !newNotification.title.trim() || !newNotification.message.trim()}
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
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sent Broadcasts */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Sent Broadcasts ({broadcasts.length})
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                View all broadcasts you've sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    No broadcasts sent yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 reading:border-amber-300 bg-white dark:bg-slate-800 reading:bg-amber-50 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                              {broadcast.title}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 reading:bg-blue-200">
                              {broadcast.target_audience === 'all_students' ? 'All Students' :
                               broadcast.target_audience === 'all_mentors' ? 'All Mentors' : 'All Users'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 text-sm mb-2">
                            {broadcast.message}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 reading:text-amber-600">
                            <Calendar className="h-3 w-3" />
                            {new Date(broadcast.created_at).toLocaleDateString()} at{' '}
                            {new Date(broadcast.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                          disabled={deletingId === broadcast.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          {deletingId === broadcast.id ? (
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
