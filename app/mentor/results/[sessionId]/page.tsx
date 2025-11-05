'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Loader2,
  Trophy,
  Users,
  BarChart3,
  ArrowLeft,
  Download,
  Target,
  Percent,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function MentorResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadResults()
  }, [sessionId])

  const loadResults = async () => {
    try {
      // Load session
      const { data: sessionData } = await supabase
        .from('quiz_sessions')
        .select('*, quiz:quizzes(*)')
        .eq('id', sessionId)
        .single()

      // Load participants with rankings
      const { data: participantsData } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false })
        .order('joined_at', { ascending: true })

      // Load all answers for statistics
      const { data: answersData } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', sessionId)

      setSession(sessionData)
      setParticipants(participantsData || [])

      // Calculate statistics
      if (participantsData && answersData) {
        const totalParticipants = participantsData.length
        const totalQuestions = sessionData.quiz.questions.length
        const totalAnswers = answersData.length
        const correctAnswers = answersData.filter((a: any) => a.is_correct).length

        const avgScore =
          totalParticipants > 0
            ? participantsData.reduce((sum: number, p: any) => sum + p.total_score, 0) /
              totalParticipants
            : 0

        const avgAccuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0

        const avgAnswerTime =
          answersData.length > 0
            ? answersData.reduce((sum: number, a: any) => sum + a.time_taken_ms, 0) /
              answersData.length
            : 0

        setStats({
          totalParticipants,
          totalQuestions,
          avgScore: Math.round(avgScore),
          avgAccuracy: avgAccuracy.toFixed(1),
          avgAnswerTime: (avgAnswerTime / 1000).toFixed(1),
          totalAnswers,
          correctAnswers,
        })
      }
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/mentor/makequiz')}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Quiz Results
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session?.quiz?.title}
              </p>
            </div>
          </div>

          <Badge className="bg-green-600 text-white">
            <Trophy className="h-4 w-4 mr-1" />
            Completed
          </Badge>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.totalParticipants}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.avgScore}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.avgAccuracy}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats?.avgAnswerTime}s
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Final Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="h-6 w-6" />
                  Final Rankings
                </CardTitle>
                <Badge className="bg-white/20 text-white">
                  {participants.length} participants
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {participants.map((participant, index) => {
                  const rank = index + 1
                  const accuracy =
                    participant.questions_answered > 0
                      ? (participant.correct_answers / participant.questions_answered) * 100
                      : 0

                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`flex items-center gap-4 p-4 rounded-2xl ${
                        rank === 1
                          ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-400'
                          : rank === 2
                          ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-400'
                          : rank === 3
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-400'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 ${
                          rank === 1
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg'
                            : rank === 2
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg'
                            : rank === 3
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </div>

                      {/* Participant Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                          {participant.nickname}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span>
                            {participant.correct_answers}/{participant.questions_answered} correct
                          </span>
                          <span>•</span>
                          <span>{accuracy.toFixed(0)}% accuracy</span>
                          {participant.best_streak > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600 dark:text-orange-400 font-medium">
                                🔥 {participant.best_streak} streak
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {participant.total_score}
                        </p>
                        <p className="text-sm text-gray-500">points</p>
                      </div>
                    </motion.div>
                  )
                })}

                {participants.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No participants in this session</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4"
        >
          <Button
            onClick={() => router.push('/mentor/makequiz')}
            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            Back to Quizzes
          </Button>
          <Button
            onClick={() => router.push(`/mentor/session/${session?.session_code}/lobby`)}
            variant="outline"
            className="flex-1 rounded-xl h-12"
          >
            View Session Details
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
