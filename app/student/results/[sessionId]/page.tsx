'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Trophy, Target, Zap, TrendingUp, ArrowLeft, Home } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function StudentResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [participant, setParticipant] = useState<any>(null)
  const [rank, setRank] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [topParticipants, setTopParticipants] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadResults()
  }, [sessionId])

  const loadResults = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Load session
      const { data: sessionData } = await supabase
        .from('quiz_sessions')
        .select('*, quiz:quizzes(*)')
        .eq('id', sessionId)
        .single()

      // Load participant
      const { data: participantData } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      // Load all participants for ranking
      const { data: allParticipants } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false })
        .order('joined_at', { ascending: true })

      setSession(sessionData)
      setParticipant(participantData)

      if (allParticipants) {
        const myRank = allParticipants.findIndex((p: any) => p.id === participantData.id) + 1
        setRank(myRank)
        setTotalParticipants(allParticipants.length)
        setTopParticipants(allParticipants.slice(0, 3))
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

  const accuracy =
    participant?.questions_answered > 0
      ? (participant.correct_answers / participant.questions_answered) * 100
      : 0

  const isTopThree = rank <= 3

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-pink-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Completed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{session?.quiz?.title}</p>
        </motion.div>

        {/* Rank Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className={`border-none shadow-2xl ${
              rank === 1
                ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 ring-4 ring-yellow-400'
                : rank === 2
                ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 ring-4 ring-gray-400'
                : rank === 3
                ? 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 ring-4 ring-orange-400'
                : ''
            }`}
          >
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                {/* Trophy Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl ${
                      rank === 1
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl'
                        : rank === 2
                        ? 'bg-gradient-to-br from-gray-300 to-gray-500 shadow-xl'
                        : rank === 3
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl'
                        : 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-xl'
                    }`}
                  >
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎯'}
                  </div>
                </motion.div>

                {/* Rank Text */}
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    Rank #{rank}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    out of {totalParticipants} participants
                  </p>
                </div>

                {/* Congratulations Message */}
                {isTopThree && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl"
                  >
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {rank === 1
                        ? '🎉 Congratulations! You came in first place!'
                        : rank === 2
                        ? '🌟 Amazing! You came in second place!'
                        : '🔥 Great job! You came in third place!'}
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-4 text-center">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {participant?.total_score}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Score</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accuracy.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Accuracy</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {participant?.best_streak}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Best Streak</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {participant?.correct_answers}/{participant?.questions_answered}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Correct</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Your Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Questions Answered</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {participant?.questions_answered}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Correct Answers</span>
                <span className="font-bold text-green-600">
                  {participant?.correct_answers}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Accuracy Rate</span>
                <span className="font-bold text-blue-600">{accuracy.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Best Streak</span>
                <span className="font-bold text-orange-600">
                  🔥 {participant?.best_streak}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top 3 Leaderboard */}
        {topParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-xl">
                <CardTitle>Top 3 Performers</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {topParticipants.map((p: any, index: number) => {
                  const isMe = p.id === participant?.id

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        isMe
                          ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                          index === 0
                            ? 'bg-yellow-500'
                            : index === 1
                            ? 'bg-gray-400'
                            : 'bg-orange-500'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-semibold ${
                            isMe
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {p.nickname} {isMe && '(You)'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {p.correct_answers}/{p.questions_answered} correct
                        </p>
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {p.total_score}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-4"
        >
          <Button
            onClick={() => router.push('/quiz')}
            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
