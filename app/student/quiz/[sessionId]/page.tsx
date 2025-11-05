'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Clock, Trophy, Zap, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { quizRealtime } from '@/utils/supabase/realtime'
import { getQuestionForStudent, submitAnswer } from './actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const ANSWER_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-500', ring: 'ring-red-500' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-blue-500', ring: 'ring-blue-500' },
  {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    text: 'text-yellow-500',
    ring: 'ring-yellow-500',
  },
  {
    bg: 'bg-green-500',
    hover: 'hover:bg-green-600',
    text: 'text-green-500',
    ring: 'ring-green-500',
  },
]

export default function StudentQuizPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [session, setSession] = useState<any>(null)
  const [participant, setParticipant] = useState<any>(null)
  const [question, setQuestion] = useState<any>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)

  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<any>(null)

  const [timeRemaining, setTimeRemaining] = useState(20)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadQuestion()

    // Subscribe to session changes
    const sessionChannel = quizRealtime.subscribeToSession(sessionId, (payload) => {
      if (payload.new.status === 'finished') {
        router.push(`/leaderboard?session=${sessionId}`)
      } else if (payload.new.current_question_index !== questionIndex) {
        // Question changed, reload
        loadQuestion()
      }
    })

    return () => {
      quizRealtime.unsubscribe(`session:${sessionId}`)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionId])

  useEffect(() => {
    // Start timer when question loads
    if (question && !hasAnswered) {
      startTimer()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [question, hasAnswered])

  const loadQuestion = async () => {
    const result = await getQuestionForStudent(sessionId)

    if (result.error) {
      alert(result.error)
      router.push('/quiz')
      return
    }

    setSession(result.session)
    setParticipant(result.participant)
    setQuestion(result.question)
    setQuestionIndex(result.questionIndex)
    setTotalQuestions(result.totalQuestions)
    setHasAnswered(result.hasAnswered)

    if (result.hasAnswered) {
      setSelectedOption(parseInt(result.answer.selected_option_id))
      setFeedback({
        isCorrect: result.answer.is_correct,
        pointsEarned: result.answer.points_earned,
        correctAnswer: result.question.correctOptionIndex,
      })
    } else {
      // Reset state for new question
      setSelectedOption(null)
      setFeedback(null)
      setQuestionStartTime(Date.now())
      setTimeRemaining(result.session.settings?.questionTimer || 20)
    }

    setLoading(false)
  }

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    const timerDuration = session?.settings?.questionTimer || 20

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000)
      const remaining = Math.max(0, timerDuration - elapsed)

      setTimeRemaining(remaining)

      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        // When time runs out, just mark as answered with no selection
        // Student must wait for mentor to advance
        if (!hasAnswered && !submitting) {
          setHasAnswered(true)
        }
      }
    }, 100)
  }

  const handleSelectOption = (index: number) => {
    if (hasAnswered || submitting || timeRemaining === 0) return
    setSelectedOption(index)
  }

  const handleSubmit = async () => {
    // Prevent submission if time is up, already answered, or already submitting
    if (selectedOption === null || submitting || hasAnswered || timeRemaining === 0) return

    setSubmitting(true)

    const answerTime = Date.now() - questionStartTime

    const result = await submitAnswer(sessionId, questionIndex, selectedOption, answerTime)

    if (result.error) {
      alert(result.error)
      setSubmitting(false)
      return
    }

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current)

    // Show feedback
    setFeedback({
      isCorrect: result.isCorrect,
      pointsEarned: result.pointsEarned,
      correctAnswer: result.correctAnswer,
      newTotalScore: result.newTotalScore,
      newStreak: result.newStreak,
    })

    setHasAnswered(true)
    setSubmitting(false)

    // Update participant state
    setParticipant({
      ...participant,
      total_score: result.newTotalScore,
      current_streak: result.newStreak,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const timerPercentage = session?.settings?.questionTimer
    ? (timeRemaining / session.settings.questionTimer) * 100
    : 100
  const isTimeRunningOut = timeRemaining <= 5

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-pink-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {session?.quiz?.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              {participant?.total_score || 0}
            </Badge>
            {participant?.current_streak > 0 && (
              <Badge className="gap-1 bg-orange-500">
                🔥 {participant.current_streak}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Timer */}
        {!hasAnswered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <Card
              className={`border-none shadow-xl ${
                isTimeRunningOut ? 'ring-4 ring-red-500 animate-pulse' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`h-5 w-5 ${
                        isTimeRunningOut ? 'text-red-600 animate-bounce' : 'text-blue-600'
                      }`}
                    />
                    <span
                      className={`text-2xl font-bold ${
                        isTimeRunningOut
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {timeRemaining}s
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</span>
                </div>
                <Progress
                  value={timerPercentage}
                  className={`h-2 ${isTimeRunningOut ? 'bg-red-100' : ''}`}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Feedback Card */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              <Card
                className={`border-none shadow-2xl ${
                  feedback.isCorrect
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 ring-2 ring-green-500'
                    : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 ring-2 ring-red-500'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {feedback.isCorrect ? (
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-10 w-10 text-white" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-10 w-10 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3
                        className={`text-2xl font-bold mb-2 ${
                          feedback.isCorrect
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}
                      >
                        {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          <span className="font-bold text-gray-900 dark:text-white">
                            +{feedback.pointsEarned} points
                          </span>
                        </div>
                        {feedback.newStreak > 1 && (
                          <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-lg">
                            <span>🔥 {feedback.newStreak} streak!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
              <CardTitle className="text-xl">Question {questionIndex + 1}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                {question?.questionText}
              </h2>

              {/* Answer Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question?.options?.map((option: string, idx: number) => {
                  const colors = ANSWER_COLORS[idx]
                  const isSelected = selectedOption === idx
                  const isCorrect = feedback && idx === feedback.correctAnswer
                  const isWrong = feedback && isSelected && !feedback.isCorrect

                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={hasAnswered || submitting}
                      whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                      whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                      className={`
                        relative p-6 rounded-2xl text-left transition-all duration-300
                        ${hasAnswered ? 'cursor-default' : 'cursor-pointer'}
                        ${
                          isSelected && !hasAnswered
                            ? `${colors.bg} text-white shadow-2xl ring-4 ${colors.ring}`
                            : hasAnswered && isCorrect
                            ? 'bg-green-500 text-white ring-4 ring-green-500 shadow-2xl'
                            : hasAnswered && isWrong
                            ? 'bg-red-500 text-white ring-4 ring-red-500 shadow-2xl'
                            : `bg-white dark:bg-gray-800 ${colors.hover} hover:shadow-xl hover:ring-2 ${colors.ring}`
                        }
                        ${hasAnswered && !isCorrect && !isSelected ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg
                          ${
                            isSelected && !hasAnswered
                              ? 'bg-white/20 text-white'
                              : hasAnswered && (isCorrect || isWrong)
                              ? 'bg-white/20 text-white'
                              : `${colors.bg} text-white`
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span
                          className={`text-lg font-semibold flex-1 ${
                            isSelected || (hasAnswered && (isCorrect || isWrong))
                              ? 'text-white'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {String(option)}
                        </span>
                        {hasAnswered && isCorrect && (
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        )}
                        {hasAnswered && isWrong && <XCircle className="h-6 w-6 text-white" />}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Submit Button */}
              {!hasAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedOption === null || submitting}
                    className="w-full h-16 text-xl rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Answer
                        <Zap className="ml-2 h-6 w-6" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Waiting for Next Question */}
              {hasAnswered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-center"
                >
                  <div className={`p-6 rounded-2xl ${
                    selectedOption === null
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-2 ${
                      selectedOption === null ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedOption === null
                        ? "Time's up! ⏰"
                        : "Answer submitted! ✓"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Waiting for the mentor to advance to the next question...
                    </p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-none shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {participant?.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {participant?.nickname}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {participant?.correct_answers || 0} / {participant?.questions_answered || 0}{' '}
                      correct
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {participant?.total_score || 0}
                  </p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
