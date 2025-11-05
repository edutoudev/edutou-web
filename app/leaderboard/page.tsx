'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Medal,
  Flame,
  TrendingUp,
  Target,
  Zap,
  Loader2,
  Crown,
  Star,
  CheckCircle,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { getRankFromPoints, RANKS, getRankStats, getProgressToNextRank } from '@/lib/ranks'

const LEADERBOARD_TABS = [
  { id: 'overall', icon: Trophy, label: 'All Time', description: 'Total points earned' },
  { id: 'weekly', icon: Flame, label: 'This Week', description: 'Past 7 days' },
  { id: 'monthly', icon: TrendingUp, label: 'This Month', description: 'Current month' },
]

interface LeaderboardEntry {
  user_id: string
  total_points: number
  quiz_points: number
  assignment_points: number
  bonus_points: number
  quizzes_completed: number
  correct_answers: number
  total_attempts: number
  last_activity: string
  rank: number
  full_name: string | null
  email: string | null
  role: string | null
}

interface CurrentUserStats {
  rank: number
  total_points: number
  quiz_points: number
  quizzes_completed: number
  correct_answers: number
  total_attempts: number
}

interface SessionParticipant {
  id: string
  nickname: string
  total_score: number
  correct_answers: number
  questions_answered: number
  current_streak: number
  best_streak: number
  rank: number
}

export default function LeaderboardPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [sessionParticipants, setSessionParticipants] = useState<SessionParticipant[]>([])
  const [sessionData, setSessionData] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUserStats | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overall')

  const supabase = createClient()

  useEffect(() => {
    if (sessionId) {
      fetchSessionLeaderboard()
    } else {
      fetchLeaderboard()
    }
  }, [activeTab, sessionId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Fetch directly from profiles table with leaderboard_points
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, leaderboard_points, created_at')
        .eq('role', 'student')
        .order('leaderboard_points', { ascending: false })

      // Apply time filters (for now, time filters apply to created_at)
      // Note: For more accurate time filtering, you'd want to track last_activity
      if (activeTab === 'weekly') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (activeTab === 'monthly') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data, error: leaderboardError } = await query

      if (leaderboardError) {
        console.error('Supabase error:', leaderboardError)
        throw new Error(`Database error: ${leaderboardError.message}`)
      }

      if (!data) {
        throw new Error('No data returned from database')
      }

      console.log('Fetched leaderboard from profiles:', data)

      // Format data and calculate rank on client side
      const formattedData: LeaderboardEntry[] = data.map((entry: any, index) => ({
        user_id: entry.id,
        total_points: entry.leaderboard_points || 0,
        quiz_points: 0, // Will be populated if you have separate quiz tracking
        assignment_points: 0,
        bonus_points: 0,
        quizzes_completed: 0,
        correct_answers: 0,
        total_attempts: 0,
        last_activity: entry.created_at,
        rank: index + 1,
        full_name: entry.full_name || null,
        email: entry.email || null,
        role: entry.role || null,
      }))

      setLeaderboardData(formattedData)

      // Find current user's stats
      if (user) {
        const userEntry = formattedData.find(entry => entry.user_id === user.id)
        if (userEntry) {
          setCurrentUser({
            rank: userEntry.rank,
            total_points: userEntry.total_points,
            quiz_points: userEntry.quiz_points,
            quizzes_completed: userEntry.quizzes_completed,
            correct_answers: userEntry.correct_answers,
            total_attempts: userEntry.total_attempts,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Fetch session data
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz:quiz_id (
            title,
            description
          )
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        throw new Error(`Failed to load session: ${sessionError.message}`)
      }

      setSessionData(session)

      // Fetch session participants
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false })

      if (participantsError) {
        throw new Error(`Failed to load participants: ${participantsError.message}`)
      }

      // Format data with ranks
      const formattedParticipants: SessionParticipant[] = (participants || []).map((p, index) => ({
        id: p.id,
        nickname: p.nickname,
        total_score: p.total_score || 0,
        correct_answers: p.correct_answers || 0,
        questions_answered: p.questions_answered || 0,
        current_streak: p.current_streak || 0,
        best_streak: p.best_streak || 0,
        rank: index + 1,
      }))

      setSessionParticipants(formattedParticipants)

    } catch (err) {
      console.error('Error fetching session leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return (
      <div className="flex flex-col items-center">
        <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400 reading:text-amber-700" />
        <span className="text-xs font-bold text-black mt-0.5">#{rank}</span>
      </div>
    )
    if (rank === 2) return (
      <div className="flex flex-col items-center">
        <Medal className="h-6 w-6 text-slate-500 dark:text-slate-300 reading:text-slate-600" />
        <span className="text-xs font-bold text-black mt-0.5">#{rank}</span>
      </div>
    )
    if (rank === 3) return (
      <div className="flex flex-col items-center">
        <Medal className="h-6 w-6 text-orange-600 dark:text-orange-400 reading:text-orange-700" />
        <span className="text-xs font-bold text-black mt-0.5">#{rank}</span>
      </div>
    )
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  const getBadgeFromPoints = (points: number): { label: string; color: string } => {
    if (points >= 20000) return { label: 'Legendary', color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
    if (points >= 15000) return { label: 'Expert', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' }
    if (points >= 10000) return { label: 'Master', color: 'bg-gradient-to-r from-amber-500 to-orange-500' }
    if (points >= 5000) return { label: 'Advanced', color: 'bg-gradient-to-r from-green-500 to-emerald-500' }
    if (points >= 2000) return { label: 'Intermediate', color: 'bg-gradient-to-r from-cyan-500 to-blue-500' }
    return { label: 'Beginner', color: 'bg-gradient-to-r from-slate-500 to-gray-500' }
  }

  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getAccuracy = (correct: number, total: number): number => {
    if (total === 0) return 0
    return Math.round((correct / total) * 100)
  }

  const statCards = [
    {
      icon: Trophy,
      label: 'Your Rank',
      value: currentUser ? `#${currentUser.rank}` : '-',
      color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 reading:bg-purple-100 reading:text-purple-700',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Star,
      label: 'Total Points',
      value: currentUser ? currentUser.total_points.toLocaleString() : '-',
      color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 reading:bg-blue-100 reading:text-blue-700',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: CheckCircle,
      label: 'Quizzes Completed',
      value: currentUser ? currentUser.quizzes_completed.toString() : '-',
      color: 'bg-green-500/10 text-green-600 dark:bg-green-900/20 dark:text-green-400 reading:bg-green-100 reading:text-green-700',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Target,
      label: 'Accuracy',
      value: currentUser ? `${getAccuracy(currentUser.correct_answers, currentUser.total_attempts)}%` : '-',
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 reading:bg-emerald-100 reading:text-emerald-700',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
  ]

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />

      {/* Desktop Sidebar */}
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

        <div className="space-y-8 px-4 py-8 md:px-6 lg:px-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                {sessionId ? sessionData?.quiz?.title || 'Quiz Results' : 'Leaderboard'}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                {sessionId
                  ? sessionData?.quiz?.description || 'Final rankings for this quiz session'
                  : 'Compete with others and climb to the top!'}
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-4 py-2 text-sm">
              <Trophy className="mr-2 h-4 w-4" />
              {sessionId ? sessionParticipants.length : leaderboardData.length} {sessionId ? 'Participants' : 'Competitors'}
            </Badge>
          </div>

          {/* User Stats - Only show for platform leaderboard */}
          {!sessionId && currentUser && (
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-4">
                Your Performance
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                  <motion.div
                    key={stat.label}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={cn("border-none rounded-2xl", stat.color)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-75">{stat.label}</p>
                            <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                          </div>
                          <div className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-white/20", stat.iconColor)}>
                            <stat.icon className="h-6 w-6" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Rank Structure Display - Only show for platform leaderboard */}
          {!sessionId && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-2">
                Rank Structure
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 reading:text-amber-700 mb-4">
                Earn points to climb through the ranks and unlock achievements!
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {RANKS.map((rank, index) => {
                  const isCurrentRank = currentUser && getRankFromPoints(currentUser.total_points).id === rank.id
                  const isUnlocked = currentUser && currentUser.total_points >= rank.minPoints
                  const progressInRank = currentUser && isCurrentRank
                    ? getProgressToNextRank(currentUser.total_points)
                    : isUnlocked
                    ? 100
                    : 0

                  return (
                    <motion.div
                      key={rank.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card
                        className={cn(
                          'border-2 transition-all duration-300 rounded-xl relative overflow-hidden',
                          isCurrentRank && 'border-blue-500 dark:border-cyan-500 reading:border-orange-500 shadow-md ring-2 ring-blue-500/20 dark:ring-cyan-500/20 reading:ring-orange-500/20',
                          isUnlocked && !isCurrentRank && 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10 reading:bg-green-100/50',
                          !isUnlocked && 'border-gray-300 dark:border-slate-700 reading:border-amber-300 opacity-75'
                        )}
                      >
                        {/* Background Gradient */}
                        <div
                          className={cn(
                            'absolute inset-0 bg-gradient-to-br opacity-5',
                            rank.gradient
                          )}
                        />

                        <CardContent className="relative z-10 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'flex items-center justify-center rounded-lg text-3xl w-10 h-10',
                                isUnlocked ? 'bg-white dark:bg-slate-800' : 'bg-gray-100 dark:bg-slate-700 grayscale'
                              )}>
                                {rank.emoji}
                              </div>
                              <div>
                                <h3 className={cn(
                                  'font-bold text-sm',
                                  isCurrentRank && 'text-blue-600 dark:text-cyan-400 reading:text-orange-600',
                                  isUnlocked && !isCurrentRank && 'text-green-600 dark:text-green-400 reading:text-green-700',
                                  !isUnlocked && 'text-gray-600 dark:text-gray-400 reading:text-amber-600'
                                )}>
                                  {rank.name}
                                </h3>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 reading:text-amber-600">
                                  {rank.minPoints.toLocaleString()} - {rank.maxPoints === Infinity ? '∞' : rank.maxPoints.toLocaleString()} pts
                                </p>
                              </div>
                            </div>
                            {isCurrentRank && (
                              <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                                Current
                              </Badge>
                            )}
                            {isUnlocked && !isCurrentRank && (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>

                          <p className={cn(
                            'text-[11px] mb-2',
                            isUnlocked ? 'text-gray-700 dark:text-gray-300 reading:text-amber-800' : 'text-gray-500 dark:text-gray-400 reading:text-amber-600'
                          )}>
                            {rank.description}
                          </p>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={cn(
                                isCurrentRank ? 'text-blue-600 dark:text-cyan-400 font-medium' : 'text-gray-500 dark:text-gray-400'
                              )}>
                                {isCurrentRank ? 'Your Progress' : isUnlocked ? 'Completed' : 'Locked'}
                              </span>
                              <span className={cn(
                                isCurrentRank ? 'text-blue-600 dark:text-cyan-400 font-medium' : 'text-gray-500 dark:text-gray-400'
                              )}>
                                {Math.round(progressInRank)}%
                              </span>
                            </div>
                            <Progress
                              value={progressInRank}
                              className={cn(
                                'h-1.5',
                                isCurrentRank && 'bg-blue-200 dark:bg-blue-900/30',
                                isUnlocked && !isCurrentRank && 'bg-green-200 dark:bg-green-900/30'
                              )}
                            />
                            {isCurrentRank && currentUser && (
                              <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                                {getRankStats(currentUser.total_points).isMaxRank
                                  ? '🎉 Maximum rank achieved!'
                                  : `${getRankStats(currentUser.total_points).pointsNeeded.toLocaleString()} pts to next`
                                }
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Leaderboard Tabs - Only show for platform leaderboard */}
          <section className="space-y-6">
            {!sessionId && (
              <div className="flex flex-wrap items-center gap-3">
                {LEADERBOARD_TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'outline'}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'rounded-2xl transition-all',
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                        : 'dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 reading:bg-amber-100 reading:text-amber-900 reading:border-amber-300'
                    )}
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  {sessionId ? 'Final Rankings' : `${LEADERBOARD_TABS.find(t => t.id === activeTab)?.label} Rankings`}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 reading:text-amber-600">
                  {sessionId ? 'Ranked by total score' : LEADERBOARD_TABS.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
                </div>
              ) : error ? (
                <div className="p-6 text-center rounded-2xl bg-red-50 dark:bg-red-900/20 reading:bg-red-100 border border-red-200 dark:border-red-800 reading:border-red-300">
                  <p className="text-red-600 dark:text-red-400 reading:text-red-700">{error}</p>
                </div>
              ) : sessionId ? (
                // Session-specific leaderboard
                sessionParticipants.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-gray-50 dark:bg-slate-800 reading:bg-amber-100 border border-gray-200 dark:border-slate-700 reading:border-amber-300">
                    <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500 reading:text-amber-500" />
                    <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                      No participants in this session yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessionParticipants.map((participant, index) => {
                      const isTopThree = participant.rank <= 3
                      const accuracy = participant.questions_answered > 0
                        ? Math.round((participant.correct_answers / participant.questions_answered) * 100)
                        : 0

                      return (
                        <motion.div
                          key={participant.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card
                            className={cn(
                              'border-2 transition-all duration-300 rounded-2xl',
                              isTopThree
                                ? 'border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 reading:from-amber-100 reading:to-orange-100 shadow-lg'
                                : 'border-transparent bg-white dark:bg-slate-800 reading:bg-amber-50 hover:border-blue-500/20'
                            )}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                {/* Rank */}
                                <div className={cn(
                                  "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl",
                                  participant.rank === 1 && "bg-amber-100 dark:bg-amber-900/30 reading:bg-amber-200",
                                  participant.rank === 2 && "bg-slate-200 dark:bg-slate-600 reading:bg-slate-300",
                                  participant.rank === 3 && "bg-orange-100 dark:bg-orange-900/30 reading:bg-orange-200",
                                  participant.rank > 3 && "bg-muted dark:bg-slate-700 reading:bg-amber-200"
                                )}>
                                  {getRankIcon(participant.rank)}
                                </div>

                                {/* User Info */}
                                <div className="flex flex-1 items-center gap-4 min-w-0">
                                  <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white dark:border-slate-700">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold text-lg">
                                      {participant.nickname?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100 reading:text-amber-900">
                                        {participant.nickname}
                                      </p>
                                      {participant.current_streak > 0 && (
                                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white text-xs font-semibold">
                                          🔥 {participant.current_streak} streak
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                                      <div className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        {participant.correct_answers}/{participant.questions_answered} correct
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Target className="h-3 w-3" />
                                        {accuracy}% accuracy
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                    {participant.total_score.toLocaleString()}
                                  </p>
                                  <span className="text-xs text-muted-foreground dark:text-gray-500 reading:text-amber-600">
                                    points
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )
              ) : leaderboardData.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-gray-50 dark:bg-slate-800 reading:bg-amber-100 border border-gray-200 dark:border-slate-700 reading:border-amber-300">
                  <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500 reading:text-amber-500" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    No leaderboard data available yet
                  </p>
                </div>
              ) : (
                // Platform leaderboard
                <div className="space-y-2">
                  {leaderboardData.map((entry) => {
                    const isTopThree = entry.rank <= 3
                    const isCurrentUser = entry.user_id === currentUserId
                    const badge = getBadgeFromPoints(entry.total_points)
                    const rankInfo = getRankFromPoints(entry.total_points)
                    const displayName = entry.full_name || entry.email?.split('@')[0] || 'Anonymous'
                    const initials = getInitials(entry.full_name, entry.email)
                    const accuracy = getAccuracy(entry.correct_answers, entry.total_attempts)

                    return (
                      <motion.div
                        key={entry.user_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: entry.rank * 0.02 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Card
                          className={cn(
                            'border-2 transition-all duration-300 rounded-2xl',
                            isTopThree
                              ? 'border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 reading:from-amber-100 reading:to-orange-100 shadow-lg'
                              : 'border-transparent bg-white dark:bg-slate-800 reading:bg-amber-50 hover:border-blue-500/20',
                            isCurrentUser && 'ring-2 ring-blue-500 dark:ring-cyan-500 reading:ring-orange-500'
                          )}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              {/* Rank */}
                              <div className={cn(
                                "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl",
                                entry.rank === 1 && "bg-amber-100 dark:bg-amber-900/30 reading:bg-amber-200",
                                entry.rank === 2 && "bg-slate-200 dark:bg-slate-600 reading:bg-slate-300",
                                entry.rank === 3 && "bg-orange-100 dark:bg-orange-900/30 reading:bg-orange-200",
                                entry.rank > 3 && "bg-muted dark:bg-slate-700 reading:bg-amber-200"
                              )}>
                                {getRankIcon(entry.rank)}
                              </div>

                              {/* User Info */}
                              <div className="flex flex-1 items-center gap-4 min-w-0">
                                <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white dark:border-slate-700">
                                  <AvatarFallback className={cn(badge.color, "text-white font-bold text-lg")}>
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100 reading:text-amber-900">
                                      {displayName}
                                      {isCurrentUser && (
                                        <span className="ml-2 text-sm font-normal text-blue-600 dark:text-cyan-400 reading:text-orange-600">
                                          (You)
                                        </span>
                                      )}
                                    </p>
                                    <Badge className={cn(
                                      "rounded-full text-xs font-semibold border-none bg-black text-white",
                                      rankInfo.gradient === 'from-green-400 to-emerald-500' && "dark:bg-gradient-to-r dark:from-green-400 dark:to-emerald-500 reading:bg-gradient-to-r reading:from-green-400 reading:to-emerald-500",
                                      rankInfo.gradient === 'from-emerald-400 to-teal-500' && "dark:bg-gradient-to-r dark:from-emerald-400 dark:to-teal-500 reading:bg-gradient-to-r reading:from-emerald-400 reading:to-teal-500",
                                      rankInfo.gradient === 'from-amber-400 to-yellow-500' && "dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500 reading:bg-gradient-to-r reading:from-amber-400 reading:to-yellow-500",
                                      rankInfo.gradient === 'from-blue-400 to-indigo-500' && "dark:bg-gradient-to-r dark:from-blue-400 dark:to-indigo-500 reading:bg-gradient-to-r reading:from-blue-400 reading:to-indigo-500",
                                      rankInfo.gradient === 'from-indigo-400 to-purple-500' && "dark:bg-gradient-to-r dark:from-indigo-400 dark:to-purple-500 reading:bg-gradient-to-r reading:from-indigo-400 reading:to-purple-500",
                                      rankInfo.gradient === 'from-purple-400 to-pink-500' && "dark:bg-gradient-to-r dark:from-purple-400 dark:to-pink-500 reading:bg-gradient-to-r reading:from-purple-400 reading:to-pink-500",
                                      rankInfo.gradient === 'from-cyan-400 to-blue-500' && "dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 reading:bg-gradient-to-r reading:from-cyan-400 reading:to-blue-500",
                                      rankInfo.gradient === 'from-orange-400 to-red-500' && "dark:bg-gradient-to-r dark:from-orange-400 dark:to-red-500 reading:bg-gradient-to-r reading:from-orange-400 reading:to-red-500",
                                      rankInfo.gradient === 'from-yellow-400 to-amber-500' && "dark:bg-gradient-to-r dark:from-yellow-400 dark:to-amber-500 reading:bg-gradient-to-r reading:from-yellow-400 reading:to-amber-500",
                                      "dark:text-black reading:text-black"
                                    )}>
                                      <span className="mr-1">{rankInfo.emoji}</span>
                                      {rankInfo.name}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      {entry.quizzes_completed} quizzes
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3" />
                                      {accuracy}% accuracy
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                  {entry.total_points.toLocaleString()}
                                </p>
                                <span className="text-xs text-muted-foreground dark:text-gray-500 reading:text-amber-600">
                                  points
                                </span>
                                {entry.quiz_points > 0 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 reading:text-amber-600">
                                    <Zap className="h-3 w-3 inline mr-1" />
                                    {entry.quiz_points} from quizzes
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
