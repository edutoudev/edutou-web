'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import {
  GripVertical,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SessionItem {
  id: string
  title: string
  completed: boolean
  order: number
  created_at?: string
  coursemaster_id?: string
  creator?: {
    full_name?: string
    email?: string
  }
}

export default function CourseMasterDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<SessionItem | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
    fetchSessions()
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

    // Allow both coursemaster and admin to access this page
    if (profile?.role !== 'coursemaster' && profile?.role !== 'admin') {
      router.push('/')
    }
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('session_tracker')
        .select('*')
        .order('order', { ascending: true })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        setSessions([])
        return
      }

      // Fetch creator profiles
      const coursemasterIds = [...new Set(sessionsData?.map(s => s.coursemaster_id) || [])]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', coursemasterIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      // Merge the data
      const sessionsWithCreators = sessionsData?.map(session => ({
        ...session,
        creator: profilesData?.find(p => p.id === session.coursemaster_id)
      })) || []

      setSessions(sessionsWithCreators)
    } catch (error) {
      console.error('Error:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddSession = async () => {
    if (!newSessionTitle.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newSession: SessionItem = {
      id: crypto.randomUUID(),
      title: newSessionTitle.trim(),
      completed: false,
      order: sessions.length,
    }

    setSessions([...sessions, newSession])
    setNewSessionTitle('')

    try {
      const { error } = await supabase
        .from('session_tracker')
        .insert({
          id: newSession.id,
          coursemaster_id: user.id,
          title: newSession.title,
          completed: newSession.completed,
          order: newSession.order,
        })

      if (error) {
        console.error('Error saving session:', error)
        setSessions(sessions)
      }
    } catch (error) {
      console.error('Error:', error)
      setSessions(sessions)
    }
  }

  const handleToggleComplete = async (id: string) => {
    const updatedSessions = sessions.map(session =>
      session.id === id ? { ...session, completed: !session.completed } : session
    )
    setSessions(updatedSessions)

    const session = updatedSessions.find(s => s.id === id)
    if (!session) return

    try {
      const { error } = await supabase
        .from('session_tracker')
        .update({ completed: session.completed })
        .eq('id', id)

      if (error) {
        console.error('Error updating session:', error)
        setSessions(sessions)
      }
    } catch (error) {
      console.error('Error:', error)
      setSessions(sessions)
    }
  }

  const handleDeleteSession = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this session?')
    if (!confirmed) return

    const filteredSessions = sessions.filter(s => s.id !== id)
    setSessions(filteredSessions)

    try {
      const { error } = await supabase
        .from('session_tracker')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting session:', error)
        setSessions(sessions)
      }
    } catch (error) {
      console.error('Error:', error)
      setSessions(sessions)
    }
  }

  const handleDragStart = (e: React.DragEvent, session: SessionItem) => {
    setDraggedItem(session)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetSession: SessionItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetSession.id) return

    const draggedIndex = sessions.findIndex(s => s.id === draggedItem.id)
    const targetIndex = sessions.findIndex(s => s.id === targetSession.id)

    const newSessions = [...sessions]
    newSessions.splice(draggedIndex, 1)
    newSessions.splice(targetIndex, 0, draggedItem)

    const reorderedSessions = newSessions.map((session, index) => ({
      ...session,
      order: index,
    }))

    setSessions(reorderedSessions)
    setDraggedItem(null)

    try {
      const updates = reorderedSessions.map(session => ({
        id: session.id,
        order: session.order,
      }))

      for (const update of updates) {
        await supabase
          .from('session_tracker')
          .update({ order: update.order })
          .eq('id', update.id)
      }
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
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
              Course Master Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1">
              Track and manage session completion
            </p>
          </div>

          {/* Add New Session */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Add New Session
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Create a new session to track
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter session title..."
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSession()}
                  className="flex-1 rounded-xl"
                />
                <Button
                  onClick={handleAddSession}
                  disabled={!newSessionTitle.trim()}
                  className="rounded-xl gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Session Tracker
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Drag to reorder, click checkbox to mark complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Circle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    No sessions yet. Add your first session above!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, session)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, session)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-move",
                        session.completed
                          ? "bg-green-50 dark:bg-green-900/20 reading:bg-green-100 border-green-200 dark:border-green-800"
                          : "bg-white dark:bg-slate-800 reading:bg-amber-50 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700",
                        draggedItem?.id === session.id && "opacity-50"
                      )}
                    >
                      <div className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={session.completed}
                          onCheckedChange={() => handleToggleComplete(session.id)}
                          className="h-5 w-5 rounded-md"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "font-medium truncate",
                              session.completed
                                ? "line-through text-gray-500 dark:text-gray-400"
                                : "text-gray-900 dark:text-gray-100 reading:text-amber-900"
                            )}
                          >
                            {session.title}
                          </p>
                          {session.creator && (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 reading:bg-purple-100 text-purple-700 dark:text-purple-400 reading:text-purple-800 border-purple-200 dark:border-purple-700 flex-shrink-0"
                            >
                              {session.creator.full_name || session.creator.email?.split('@')[0] || 'Unknown'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {session.completed && (
                        <div className="flex-shrink-0">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </div>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 reading:from-purple-100 reading:to-pink-100">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-3">
                How to use:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Add new sessions using the input field above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Click the checkbox to mark sessions as complete or incomplete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Drag and drop sessions to reorder them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Hover over a session and click the delete icon to remove it</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
