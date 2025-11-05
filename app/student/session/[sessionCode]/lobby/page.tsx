'use client'

/**
 * Student Lobby Page - Pre-Quiz Waiting Room
 *
 * This page automatically joins a student to a quiz session and displays a waiting
 * room until the mentor starts the quiz. Key features:
 * - Automatic session joining on page load (no manual join button)
 * - Display quiz title and description
 * - Show student's own nickname/display name
 * - Real-time list of other participants joining
 * - Animated waiting indicators
 * - Automatic redirect when quiz starts
 *
 * The page uses:
 * - Real-time Supabase subscriptions for live participant updates
 * - Polling fallback (every 2 seconds) if real-time fails
 * - 10-second timeout to prevent infinite loading
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { quizRealtime } from '@/utils/supabase/realtime'
import { joinQuizSession } from '../../join/actions'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Participant {
  id: string
  user_id: string
  nickname: string
  status: string
  joined_at: string
}

export default function StudentLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const sessionCode = (params.sessionCode as string).toUpperCase()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [participant, setParticipant] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [hasJoined, setHasJoined] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Prevent multiple join attempts
    if (hasJoined) return

    // Auto-join when page loads
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('Join timeout - taking too long to load')
        setLoading(false)
        alert('Connection timeout. Please check your internet and try again.')
        router.push('/quiz')
      }
    }, 10000) // 10 second timeout

    // Mark as joined to prevent duplicate calls
    setHasJoined(true)
    handleJoin()

    return () => {
      clearTimeout(timeoutId)
    }
  }, [sessionCode])

  useEffect(() => {
    if (!session || !participant) return

    const setupSubscriptions = async () => {
      // Load initial participants
      await loadParticipants()

      // Subscribe to participant changes (with fallback polling if realtime fails)
      try {
        quizRealtime.subscribeToParticipants(session.id, (payload) => {
          if (payload.eventType === 'INSERT') {
            setParticipants((prev) => {
              // Check if already exists to avoid duplicates
              if (prev.find((p) => p.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          } else if (payload.eventType === 'DELETE') {
            setParticipants((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        })

        // Subscribe to session status changes
        quizRealtime.subscribeToSession(session.id, (payload) => {
          if (payload.new.status === 'active') {
            // Redirect to quiz when it starts
            router.push(`/student/quiz/${session.id}`)
          }
        })
      } catch (error) {
        console.error('Realtime subscription failed, using polling fallback:', error)
      }

      // Fallback: Poll for session status updates every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const { data: updatedSession } = await supabase
            .from('quiz_sessions')
            .select('status')
            .eq('id', session.id)
            .single()

          if (updatedSession?.status === 'active') {
            clearInterval(pollInterval)
            router.push(`/student/quiz/${session.id}`)
          }
        } catch (error) {
          console.error('Error polling session status:', error)
        }
      }, 2000)

      return () => {
        clearInterval(pollInterval)
      }
    }

    setupSubscriptions()

    return () => {
      quizRealtime.unsubscribe(`participants:${session.id}`)
      quizRealtime.unsubscribe(`session:${session.id}`)
    }
  }, [session, participant])

  const loadParticipants = async () => {
    if (!session) return

    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', session.id)
      .order('joined_at', { ascending: true })

    if (data) {
      setParticipants(data)
    }
  }

  const handleJoin = async () => {
    try {
      console.log('[LOBBY] Starting join process for code:', sessionCode)
      const startTime = Date.now()

      const result = await joinQuizSession(sessionCode)
      console.log('[LOBBY] Join action completed | Time:', Date.now() - startTime, 'ms', result)

      if (result.error) {
        console.error('[LOBBY] Join error:', result.error)
        alert(result.error)
        setLoading(false)
        router.push('/quiz')
        return
      }

      console.log('[LOBBY] Setting session and participant state...')
      setSession(result.session)
      setParticipant(result.participant)
      setLoading(false)
      console.log('[LOBBY] State updated, loading complete | Total time:', Date.now() - startTime, 'ms')

      // If already active, redirect immediately
      if (result.session.status === 'active') {
        console.log('[LOBBY] Session already active, redirecting to quiz...')
        router.push(`/student/quiz/${result.session.id}`)
      }
    } catch (error) {
      console.error('[LOBBY] Error joining session:', error)
      alert('Failed to join session. Please try again.')
      setLoading(false)
      router.push('/quiz')
    }
  }

  // Show loading while joining - has 10 second timeout for safety
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-slate-600 dark:text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-slate-700 dark:text-slate-300">Joining session...</p>
        </motion.div>
      </div>
    )
  }

  return (
    // Professional gradient background matching educator interface
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {session?.quiz?.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {session?.quiz?.description}
          </p>
        </motion.div>

        {/* Waiting Card - Animated clock to show waiting state */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-2xl bg-white dark:bg-slate-800">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Clock className="h-16 w-16 text-slate-700 dark:text-slate-300 mx-auto" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Waiting for quiz to start...
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Your instructor will start the quiz soon
                </p>
                {/* Animated loading dots */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-slate-700 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-700 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-700 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Info - Shows student's display name and connection status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none shadow-lg bg-white dark:bg-slate-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-blue-600 dark:from-slate-500 dark:to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {participant?.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">You're joining as</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{participant?.nickname}</p>
                  </div>
                </div>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  Connected
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participants - Real-time list of other students joining */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-none shadow-lg bg-white dark:bg-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  <CardTitle className="text-slate-900 dark:text-white">Other Participants</CardTitle>
                </div>
                <Badge className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-full">
                  {participants.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <AnimatePresence>
                  {participants
                    .filter((p) => p.id !== participant?.id)
                    .map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-750 p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs flex-shrink-0">
                          {p.nickname?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm truncate text-slate-900 dark:text-white">
                          {p.nickname}
                        </span>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
