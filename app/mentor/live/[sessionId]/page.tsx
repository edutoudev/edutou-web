'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  ChevronRight,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  BarChart3,
  Eye,
  EyeOff,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { quizRealtime } from '@/utils/supabase/realtime'
import {
  getCurrentQuestion,
  advanceQuestion,
  endSession,
  getLeaderboard,
  getAnswerStats,
  getParticipantCount,
} from './actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const ANSWER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
]

export default function MentorLiveControlPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [ending, setEnding] = useState(false)

  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [session, setSession] = useState<any>(null)

  const [answerStats, setAnswerStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false) // Toggle for showing/hiding correct answer (hidden by default)

  const supabase = createClient()

  useEffect(() => {
    loadQuestionData()
    loadLeaderboard()
    loadParticipantCount()

    // Subscribe to answer changes
    const answerChannel = quizRealtime.subscribeToAnswers(sessionId, () => {
      loadAnswerStats()
      loadLeaderboard()
    })

    // Subscribe to participant changes
    const participantChannel = quizRealtime.subscribeToParticipants(
      sessionId,
      () => {
        loadParticipantCount()
        loadLeaderboard()
      }
    )

    // Subscribe to session status changes
    const sessionChannel = quizRealtime.subscribeToSession(sessionId, (payload) => {
      if (payload.new.status === 'finished') {
        router.push(`/leaderboard?session=${sessionId}`)
      } else if (payload.new.current_question_index !== questionIndex) {
        // Question changed, reload
        loadQuestionData()
      }
    })

    return () => {
      quizRealtime.unsubscribe(`answers:${sessionId}`)
      quizRealtime.unsubscribe(`participants:${sessionId}`)
      quizRealtime.unsubscribe(`session:${sessionId}`)
    }
  }, [sessionId])

  useEffect(() => {
    if (currentQuestion) {
      loadAnswerStats()
    }
  }, [currentQuestion])

  const loadQuestionData = async () => {
    const result = await getCurrentQuestion(sessionId)
    if (!result.error) {
      setCurrentQuestion(result.question)
      setQuestionIndex(result.index)
      setTotalQuestions(result.total)
      setSession(result.session)
    }
    setLoading(false)
  }

  const loadAnswerStats = async () => {
    const result = await getAnswerStats(sessionId, questionIndex)
    if (!result.error) {
      setAnswerStats(result.stats)
    }
  }

  const loadLeaderboard = async () => {
    const result = await getLeaderboard(sessionId)
    if (!result.error) {
      setLeaderboard(result.leaderboard || [])
    }
  }

  const loadParticipantCount = async () => {
    const result = await getParticipantCount(sessionId)
    if (!result.error) {
      setParticipantCount(result.count || 0)
    }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    const result = await advanceQuestion(sessionId)

    if (result.finished) {
      router.push(`/leaderboard?session=${sessionId}`)
    } else if (!result.error) {
      await loadQuestionData()
    }

    setAdvancing(false)
  }

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end the quiz session?')) return

    setEnding(true)
    const result = await endSession(sessionId)

    if (!result.error) {
      router.push(`/leaderboard?session=${sessionId}`)
    } else {
      alert(result.error)
      setEnding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const answeredCount = answerStats?.total || 0
  const answeredPercentage = participantCount > 0 ? (answeredCount / participantCount) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-blue-950 dark:to-cyan-950 p-4 md:p-8">
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
                {session?.quiz?.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {questionIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              {participantCount} participants
            </Badge>
            <Button
              onClick={handleEndSession}
              variant="destructive"
              disabled={ending}
              className="rounded-xl"
            >
              {ending ? 'Ending...' : 'End Quiz'}
            </Button>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Question & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Question */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-none shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-600 text-white rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Current Question</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                      className="text-white hover:bg-white/20 rounded-xl"
                    >
                      {showCorrectAnswer ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Answer
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Answer
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                    {currentQuestion?.questionText}
                  </h3>

                  {/* Answer Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {currentQuestion?.options?.map((option: string, idx: number) => {
                      const isCorrect = idx === currentQuestion.correctOptionIndex
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            showCorrectAnswer && isCorrect
                              ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg ${ANSWER_COLORS[idx]} flex items-center justify-center text-white font-bold`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {String(option)}
                              </p>
                              {showCorrectAnswer && isCorrect && (
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Correct Answer
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Response Progress */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Responses
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {answeredCount} / {participantCount}
                      </span>
                    </div>
                    <Progress value={answeredPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Answer Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Answer Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentQuestion?.options?.map((option: string, idx: number) => {
                    const count = answerStats?.[idx] || 0
                    const percentage =
                      answeredCount > 0 ? (count / answeredCount) * 100 : 0
                    const isCorrect = idx === currentQuestion.correctOptionIndex

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded ${ANSWER_COLORS[idx]} flex items-center justify-center text-white text-xs font-bold`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="text-sm font-medium">
                              {String(option).substring(0, 30)}
                              {String(option).length > 30 && '...'}
                            </span>
                            {showCorrectAnswer && isCorrect && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <span className="text-sm font-bold">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}

                  <div className="pt-4 mt-4 border-t dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Correct Answers:
                      </span>
                      <span className="font-bold text-green-600">
                        {answerStats?.correctCount || 0} / {answeredCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Navigation Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <Button
                    onClick={handleAdvance}
                    disabled={advancing}
                    className="w-full rounded-xl h-14 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    {advancing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Advancing...
                      </>
                    ) : questionIndex < totalQuestions - 1 ? (
                      <>
                        Next Question
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Finish Quiz
                        <Trophy className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Live Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                  <AnimatePresence>
                    {leaderboard.slice(0, 10).map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${
                          index === 0
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                            : index === 1
                            ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            : index === 2
                            ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? 'bg-yellow-500 text-white'
                              : index === 1
                              ? 'bg-gray-400 text-white'
                              : index === 2
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {participant.nickname}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              {participant.correct_answers}/{participant.questions_answered}{' '}
                              correct
                            </span>
                            {participant.current_streak > 0 && (
                              <Badge variant="outline" className="h-4 text-xs">
                                🔥 {participant.current_streak}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                            {participant.total_score}
                          </p>
                          <p className="text-xs text-gray-500">points</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {leaderboard.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No participants yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
