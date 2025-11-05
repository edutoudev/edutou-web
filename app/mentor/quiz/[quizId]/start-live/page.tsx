'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Play, Settings as SettingsIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { createLiveSession } from './actions'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface Quiz {
  id: string
  title: string
  description: string
  questions: any[]
}

export default function StartLivePage() {
  const router = useRouter()
  const params = useParams()
  const quizId = params.quizId as string

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  // Settings
  const [questionTimer, setQuestionTimer] = useState(20)
  const [showAnswerDistribution, setShowAnswerDistribution] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [allowLateJoin, setAllowLateJoin] = useState(false)
  const [pointsPerQuestion, setPointsPerQuestion] = useState(1000)
  const [speedBonus, setSpeedBonus] = useState(true)
  const [streakMultiplier, setStreakMultiplier] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (error) throw error
      setQuiz(data)
    } catch (error) {
      console.error('Error loading quiz:', error)
      alert('Failed to load quiz')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleStartLive = async () => {
    if (!quiz) return

    setCreating(true)

    try {
      const result = await createLiveSession(quizId, {
        questionTimer,
        showAnswerDistribution,
        showLeaderboard,
        allowLateJoin,
        pointsPerQuestion,
        speedBonus,
        streakMultiplier,
      })

      if (result.error) {
        alert(result.error)
        return
      }

      // Redirect to lobby
      router.push(`/mentor/session/${result.sessionCode}/lobby`)
    } catch (error) {
      console.error('Error starting live session:', error)
      alert('Failed to start live session')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

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

        <div className="px-4 py-8 md:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Start Live Session
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure settings and launch a real-time quiz
              </p>
            </div>
          </div>

          {/* Quiz Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6 border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-2xl">
                <CardTitle>{quiz?.title}</CardTitle>
                {quiz?.description && (
                  <CardDescription className="text-white/90">
                    {quiz.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-semibold">{quiz?.questions.length}</span> questions
                  </div>
                  <div>•</div>
                  <div>
                    Estimated time: {Math.ceil((quiz?.questions.length || 0) * questionTimer / 60)} minutes
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-blue-600" />
                  <CardTitle>Session Settings</CardTitle>
                </div>
                <CardDescription>Configure how your live quiz will work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer */}
                <div className="space-y-2">
                  <Label htmlFor="timer">Question Timer (seconds)</Label>
                  <Input
                    id="timer"
                    type="number"
                    min="5"
                    max="120"
                    value={questionTimer}
                    onChange={(e) => setQuestionTimer(parseInt(e.target.value) || 20)}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-gray-500">
                    Students will have {questionTimer} seconds to answer each question
                  </p>
                </div>

                {/* Points */}
                <div className="space-y-2">
                  <Label htmlFor="points">Base Points Per Question</Label>
                  <Input
                    id="points"
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={pointsPerQuestion}
                    onChange={(e) => setPointsPerQuestion(parseInt(e.target.value) || 1000)}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-gray-500">
                    Base points awarded for correct answers
                  </p>
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Speed Bonus</Label>
                      <p className="text-xs text-gray-500">
                        Faster answers earn bonus points (up to +500)
                      </p>
                    </div>
                    <Switch
                      checked={speedBonus}
                      onCheckedChange={setSpeedBonus}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Streak Multiplier</Label>
                      <p className="text-xs text-gray-500">
                        Consecutive correct answers multiply points (up to 2x)
                      </p>
                    </div>
                    <Switch
                      checked={streakMultiplier}
                      onCheckedChange={setStreakMultiplier}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Answer Distribution</Label>
                      <p className="text-xs text-gray-500">
                        Display how many students chose each option
                      </p>
                    </div>
                    <Switch
                      checked={showAnswerDistribution}
                      onCheckedChange={setShowAnswerDistribution}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Leaderboard</Label>
                      <p className="text-xs text-gray-500">
                        Display rankings after each question
                      </p>
                    </div>
                    <Switch
                      checked={showLeaderboard}
                      onCheckedChange={setShowLeaderboard}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Late Join</Label>
                      <p className="text-xs text-gray-500">
                        Students can join after quiz has started
                      </p>
                    </div>
                    <Switch
                      checked={allowLateJoin}
                      onCheckedChange={setAllowLateJoin}
                    />
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={handleStartLive}
                  disabled={creating}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 py-6 text-lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Start Live Session
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
