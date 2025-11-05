'use client'

/**
 * Mentor Lobby Page - Pre-Quiz Waiting Room
 *
 * This page serves as the waiting room where mentors wait for students to join
 * before starting a live quiz session. Key features:
 * - Display session code prominently for students to enter
 * - Show QR code for easy mobile joining
 * - Real-time participant list updates as students join
 * - Start quiz button (disabled until at least one student joins)
 *
 * The page uses real-time Supabase subscriptions to instantly show new joiners.
 * Once the quiz starts, mentors are redirected to the live control dashboard.
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, Play, Copy, Check, QrCode as QrCodeIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/utils/supabase/client'
import { quizRealtime } from '@/utils/supabase/realtime'
import { getSessionByCode, startQuizSession } from './actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Participant {
  id: string
  user_id: string
  nickname: string
  status: string
  joined_at: string
}

export default function MentorLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const sessionCode = (params.sessionCode as string).toUpperCase()

  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const supabase = createClient()
  const quizUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/quiz`

  useEffect(() => {
    loadSessionAndSubscribe()

    return () => {
      // Cleanup subscriptions on unmount
      if (session?.id) {
        quizRealtime.unsubscribe(`participants:${session.id}`)
        quizRealtime.unsubscribe(`session:${session.id}`)
      }
    }
  }, [sessionCode])

  const loadSessionAndSubscribe = async () => {
    try {
      const result = await getSessionByCode(sessionCode)
      if (result.error || !result.session) {
        alert('Session not found')
        router.push('/mentor/makequiz')
        return
      }

      const sessionData = result.session
      setSession(sessionData)
      setLoading(false)

      // Load initial participants
      await loadParticipantsForSession(sessionData.id)

      // Set up subscriptions immediately after loading
      quizRealtime.subscribeToParticipants(sessionData.id, (payload) => {
        console.log('🔔 Participant event received:', payload.eventType, payload)
        if (payload.eventType === 'INSERT') {
          console.log('➕ New participant joining:', payload.new.nickname)
          setParticipants((prev) => {
            // Check if already exists to avoid duplicates
            if (prev.find((p) => p.id === payload.new.id)) {
              console.log('⚠️ Participant already exists, skipping')
              return prev
            }
            console.log('✅ Adding new participant to list')
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'DELETE') {
          console.log('➖ Participant leaving:', payload.old.id)
          setParticipants((prev) => prev.filter((p) => p.id !== payload.old.id))
        } else if (payload.eventType === 'UPDATE') {
          console.log('🔄 Participant updated:', payload.new.id)
          setParticipants((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          )
        }
      })

      // Subscribe to session status changes
      quizRealtime.subscribeToSession(sessionData.id, (payload) => {
        if (payload.new.status === 'active') {
          // Redirect to live control when quiz starts
          router.push(`/mentor/live/${sessionData.id}`)
        }
      })
    } catch (error) {
      console.error('Error loading session:', error)
      setLoading(false)
    }
  }

  const loadParticipantsForSession = async (sessionId: string) => {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (data) {
      setParticipants(data)
    }
  }

  const handleStartQuiz = async () => {
    if (!session || participants.length === 0) return

    setStarting(true)

    try {
      const result = await startQuizSession(session.id)
      if (result.error) {
        alert(result.error)
        setStarting(false)
        return
      }

      // Manually redirect after successful start
      router.push(`/mentor/live/${session.id}`)
    } catch (error) {
      console.error('Error starting quiz:', error)
      alert('Failed to start quiz')
      setStarting(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400" />
      </div>
    )
  }

  return (
    // Professional gradient background - subtle and elegant for educator interface
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
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
            Waiting for students to join...
          </p>
        </motion.div>

        {/* Session Code Card - Central focus for students to see and enter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-2xl bg-white dark:bg-slate-800">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Session Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                {/* Large, prominent session code with professional blue-gray gradient */}
                <div className="text-6xl md:text-7xl font-bold font-mono tracking-wider bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-600 dark:from-slate-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {sessionCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  className="rounded-xl h-12 w-12 border-slate-300 hover:border-slate-400 dark:border-slate-600"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQR(true)}
                  className="flex-1 rounded-xl border-slate-300 hover:border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  <QrCodeIcon className="mr-2 h-4 w-4" />
                  Show QR Code
                </Button>
              </div>

              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                Students can join at <span className="font-semibold text-slate-900 dark:text-white">{quizUrl}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participants Card - Real-time updates via Supabase subscriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none shadow-lg bg-white dark:bg-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  <CardTitle className="text-slate-900 dark:text-white">Participants</CardTitle>
                </div>
                <Badge className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-full px-3 py-1">
                  {participants.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No participants yet. Share the session code with your students!
                  </p>
                </div>
              ) : (
                // Grid layout with staggered animation for each participant
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <AnimatePresence>
                    {participants.map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-750 p-3 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-blue-600 dark:from-slate-500 dark:to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {participant.nickname?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-sm truncate text-slate-900 dark:text-white">
                          {participant.nickname || 'Anonymous'}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Start Button - Disabled until at least one student joins */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleStartQuiz}
            disabled={starting || participants.length === 0}
            className="w-full py-8 text-xl font-bold rounded-2xl bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-600 hover:from-slate-800 hover:via-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 shadow-lg hover:shadow-xl transition-all text-white"
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Starting Quiz...
              </>
            ) : (
              <>
                <Play className="mr-2 h-6 w-6" />
                Start Quiz ({participants.length} {participants.length === 1 ? 'participant' : 'participants'})
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan to Join</DialogTitle>
            <DialogDescription>
              Students can scan this QR code to join the quiz
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-2xl border-2 border-gray-200">
              <QRCodeSVG
                value={`${quizUrl}?code=${sessionCode}`}
                size={240}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono mb-1">{sessionCode}</p>
              <p className="text-sm text-gray-500">Session Code</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
