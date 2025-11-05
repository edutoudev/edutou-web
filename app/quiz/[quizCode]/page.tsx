'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Award,
  X,
  Loader2,
  Trophy,
  Target,
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
  correctOptionId: string
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: QuizQuestion[]
  quiz_code: string
  created_by: string
}

interface UserAnswer {
  questionId: string
  selectedOptionId: string
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizCode = params.quizCode as string

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    async function fetchQuiz() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('quiz_code', quizCode)
          .eq('status', 'published')
          .single()

        if (quizError || !data) {
          setError('Quiz not found or not available')
          return
        }

        // Randomize question order for students
        const quizData = data as Quiz
        const shuffledQuestions = shuffleArray(quizData.questions)

        setQuiz({
          ...quizData,
          questions: shuffledQuestions
        })
      } catch (err) {
        console.error('Error fetching quiz:', err)
        setError('Failed to load quiz')
      } finally {
        setLoading(false)
      }
    }

    if (quizCode) {
      fetchQuiz()
    }
  }, [quizCode])

  const selectAnswer = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) =>
          a.questionId === questionId ? { ...a, selectedOptionId: optionId } : a
        )
      }
      return [...prev, { questionId, selectedOptionId: optionId }]
    })
  }

  const getCurrentAnswer = (questionId: string) => {
    return userAnswers.find((a) => a.questionId === questionId)?.selectedOptionId
  }

  const nextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitQuiz = async () => {
    if (!quiz) return

    // Check if all questions are answered
    if (userAnswers.length !== quiz.questions.length) {
      alert('Please answer all questions before submitting')
      return
    }

    try {
      setSubmitting(true)

      // Calculate score
      let correctCount = 0
      quiz.questions.forEach((question) => {
        const userAnswer = userAnswers.find((a) => a.questionId === question.id)
        if (userAnswer && userAnswer.selectedOptionId === question.correctOptionId) {
          correctCount++
        }
      })

      const finalScore = Math.round((correctCount / quiz.questions.length) * 100)
      setScore(finalScore)

      // Save quiz attempt to database
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quiz.id,
            user_id: user.id,
            answers: userAnswers,
            score: finalScore,
            total_questions: quiz.questions.length,
            correct_answers: correctCount,
          })

        if (error) {
          console.error('Error saving quiz attempt:', error)
        }

        // Update leaderboard table with quiz stats
        const pointsEarned = correctCount * 10 // 10 points per correct answer

        // Fetch current leaderboard entry
        const { data: leaderboardEntry } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (leaderboardEntry) {
          // Update existing entry
          await supabase
            .from('leaderboard')
            .update({
              total_points: leaderboardEntry.total_points + pointsEarned,
              quiz_points: leaderboardEntry.quiz_points + pointsEarned,
              quizzes_completed: leaderboardEntry.quizzes_completed + 1,
              correct_answers: leaderboardEntry.correct_answers + correctCount,
              total_attempts: leaderboardEntry.total_attempts + quiz.questions.length,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', user.id)
        } else {
          // Create new entry if doesn't exist
          await supabase
            .from('leaderboard')
            .insert({
              user_id: user.id,
              total_points: pointsEarned,
              quiz_points: pointsEarned,
              quizzes_completed: 1,
              correct_answers: correctCount,
              total_attempts: quiz.questions.length,
            })
        }
      }

      setShowResults(true)
    } catch (err) {
      console.error('Error submitting quiz:', err)
      alert('Failed to submit quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index)

  const isQuestionAnswered = (questionId: string) => {
    return userAnswers.some((a) => a.questionId === questionId)
  }

  if (loading) {
    return (
      <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
        </div>
      </main>
    )
  }

  if (error || !quiz) {
    return (
      <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4 mb-4">
            <X className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-2">
            Quiz Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mb-6 text-center">
            {error || 'The quiz you are looking for does not exist or is not available'}
          </p>
          <Button onClick={() => router.push('/')} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </main>
    )
  }

  if (showResults) {
    const correctCount = quiz.questions.filter((question) => {
      const userAnswer = userAnswers.find((a) => a.questionId === question.id)
      return userAnswer && userAnswer.selectedOptionId === question.correctOptionId
    }).length

    return (
      <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
        <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
        <Sidebar isOpen={sidebarOpen} />

        <div
          className={cn(
            'min-h-screen transition-all duration-300 ease-in-out',
            sidebarOpen ? 'md:pl-64' : 'md:pl-0'
          )}
        >
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />

          <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl"
            >
              <Card className="border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"
                  >
                    <Trophy className="h-12 w-12 text-white" />
                  </motion.div>

                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-2">
                    Quiz Completed!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mb-8">
                    Great job on completing the quiz
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 reading:bg-blue-100">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {score}%
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300 reading:text-blue-800">
                        Your Score
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 reading:bg-green-100">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {correctCount}/{quiz.questions.length}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300 reading:text-green-800">
                        Correct Answers
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 reading:bg-purple-100">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        +{correctCount * 10}
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-300 reading:text-purple-800">
                        Points Earned
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-left">
                      Review Answers:
                    </h3>
                    {quiz.questions.map((question, index) => {
                      const userAnswer = userAnswers.find((a) => a.questionId === question.id)
                      const isCorrect = userAnswer?.selectedOptionId === question.correctOptionId
                      const selectedOption = question.options.find(
                        (o) => o.id === userAnswer?.selectedOptionId
                      )
                      const correctOption = question.options.find(
                        (o) => o.id === question.correctOptionId
                      )

                      return (
                        <div
                          key={question.id}
                          className={cn(
                            'p-4 rounded-xl text-left border-2',
                            isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 reading:bg-green-100'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20 reading:bg-red-100'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center',
                                isCorrect ? 'bg-green-500' : 'bg-red-500'
                              )}
                            >
                              {isCorrect ? (
                                <Check className="h-4 w-4 text-white" />
                              ) : (
                                <X className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-2">
                                {index + 1}. {question.question}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                                Your answer: {selectedOption?.text}
                              </p>
                              {!isCorrect && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                                  Correct answer: {correctOption?.text}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    onClick={() => router.push('/')}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    Back to Home
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="px-4 py-8 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Quiz Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500 text-white rounded-full">
                  Quiz Code: {quizCode}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {currentQuestionIndex + 1} / {quiz.questions.length}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                {quiz.title}
              </h1>
              {quiz.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                  {quiz.description}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-2xl text-gray-900 dark:text-gray-100 reading:text-amber-900">
                      Question {currentQuestionIndex + 1}
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-700 dark:text-gray-300 reading:text-amber-800 mt-4">
                      {currentQuestion.question}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = getCurrentAnswer(currentQuestion.id) === option.id
                      return (
                        <button
                          key={option.id}
                          onClick={() => selectAnswer(currentQuestion.id, option.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 hover:border-blue-500',
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 reading:bg-blue-100'
                              : 'border-gray-200 dark:border-slate-700 reading:border-amber-300'
                          )}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center font-semibold',
                              isSelected
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400'
                            )}
                          >
                            {getOptionLetter(index)}
                          </div>
                          <span
                            className={cn(
                              'flex-1 font-medium',
                              isSelected
                                ? 'text-blue-900 dark:text-blue-100 reading:text-blue-900'
                                : 'text-gray-700 dark:text-gray-300 reading:text-amber-800'
                            )}
                          >
                            {option.text}
                          </span>
                          {isSelected && (
                            <Check className="flex-shrink-0 h-5 w-5 text-blue-500" />
                          )}
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Question Navigation Dots */}
            <div className="flex items-center justify-center gap-2">
              {quiz.questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === currentQuestionIndex
                      ? 'w-8 bg-blue-500'
                      : isQuestionAnswered(question.id)
                      ? 'w-2 bg-green-500'
                      : 'w-2 bg-gray-300 dark:bg-slate-600'
                  )}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentQuestionIndex === quiz.questions.length - 1 ? (
                <Button
                  onClick={submitQuiz}
                  disabled={submitting || userAnswers.length !== quiz.questions.length}
                  className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={nextQuestion} className="rounded-xl">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
