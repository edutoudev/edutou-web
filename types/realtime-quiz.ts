/**
 * Real-Time Quiz System Types
 * Complete TypeScript definitions for Kahoot-style quiz platform
 */

// ============================================================
// CORE ENUMS
// ============================================================

export type SessionStatus =
  | 'lobby'
  | 'active'
  | 'question'
  | 'results'
  | 'leaderboard'
  | 'finished'

export type ParticipantStatus =
  | 'waiting'
  | 'active'
  | 'disconnected'
  | 'finished'

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'very_hard'

export type SnapshotPeriod = 'weekly' | 'monthly' | 'quarterly'

export type EventType =
  | 'session_created'
  | 'session_started'
  | 'participant_joined'
  | 'participant_left'
  | 'question_started'
  | 'answer_submitted'
  | 'question_ended'
  | 'leaderboard_shown'
  | 'session_finished'
  | 'status_change'

// ============================================================
// QUIZ & QUESTION TYPES
// ============================================================

export interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false'
  options: QuizOption[]
  explanation?: string
  timeLimit?: number // Override default time limit
  points?: number // Override default points
  imageUrl?: string
}

export interface Quiz {
  id: string
  title: string
  description?: string
  questions: QuizQuestion[]
  status: 'draft' | 'published'
  quiz_code?: string
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================================
// SESSION TYPES
// ============================================================

export interface SessionSettings {
  questionTimer: number // seconds per question
  showAnswerDistribution: boolean
  showLeaderboard: boolean
  allowLateJoin: boolean
  pointsPerQuestion: number
  speedBonus: boolean
  streakMultiplier: boolean
}

export interface QuizSession {
  id: string
  quiz_id: string
  host_id: string
  session_code: string
  status: SessionStatus

  // Question control
  current_question_index: number
  current_question_id?: string
  question_start_time?: string
  question_end_time?: string

  // Settings
  settings: SessionSettings

  // Metadata
  created_at: string
  started_at?: string
  finished_at?: string

  // Relations (optional, for joined queries)
  quiz?: Quiz
  host?: {
    id: string
    email: string
    full_name?: string
  }
}

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  nickname?: string

  // Status
  status: ParticipantStatus

  // Scoring
  total_score: number
  correct_answers: number
  incorrect_answers: number
  current_streak: number
  longest_streak: number

  // Engagement
  questions_answered: number
  questions_skipped: number
  avg_response_time_ms: number

  // Metadata
  joined_at: string
  last_seen: string

  // Relations (optional)
  user?: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

export interface SessionAnswer {
  id: string
  session_id: string
  participant_id: string
  user_id: string

  // Question and answer
  question_id: string
  question_index: number
  selected_option_id: string
  is_correct: boolean

  // Timing
  answered_at: string
  time_taken_ms: number

  // Scoring
  points_earned: number
  speed_bonus: number
  streak_multiplier: number
}

export interface SessionEvent {
  id: string
  session_id: string
  event_type: EventType
  event_data?: Record<string, any>
  user_id?: string
  created_at: string
}

// ============================================================
// ANALYTICS & PROGRESS TYPES
// ============================================================

export interface StudentQuizHistory {
  id: string
  student_id: string
  quiz_id: string
  session_id?: string

  // Performance metrics
  total_score: number
  correct_answers: number
  incorrect_answers: number
  total_questions: number
  questions_answered: number
  questions_skipped: number

  // Calculated metrics (generated columns)
  accuracy_percentage: number
  completion_percentage: number

  // Session details
  completion_time_seconds?: number
  avg_response_time_ms?: number
  rank?: number
  total_participants?: number
  longest_streak: number

  // Metadata
  participated_at: string

  // Relations (optional)
  quiz?: Quiz
  session?: QuizSession
}

export interface QuestionPerformanceAnalytics {
  id: string
  session_id: string
  question_id: string
  question_index: number

  // Aggregated stats
  total_attempts: number
  correct_attempts: number
  incorrect_attempts: number
  skipped_count: number
  success_rate: number // Calculated

  // Timing stats
  avg_time_taken_ms?: number
  median_time_taken_ms?: number
  min_time_taken_ms?: number
  max_time_taken_ms?: number

  // Answer distribution
  option_distribution?: Record<string, number> // {"a": 5, "b": 15, ...}
  correct_option_id?: string

  // Difficulty
  difficulty_level?: DifficultyLevel

  // Metadata
  created_at: string
  updated_at: string
}

export interface MentorSessionAnalytics {
  id: string
  session_id: string
  mentor_id: string
  quiz_id: string

  // Participation stats
  total_participants: number
  total_completed: number
  total_dropouts: number
  completion_rate: number // Calculated

  // Score statistics
  avg_score?: number
  median_score?: number
  top_score?: number
  lowest_score?: number
  std_deviation?: number

  // Accuracy statistics
  avg_accuracy_percentage?: number
  avg_correct_answers?: number

  // Engagement metrics
  avg_completion_time_seconds?: number
  avg_response_time_ms?: number
  dropout_rate: number // Calculated

  // Question statistics
  total_questions: number
  easiest_question_index?: number
  easiest_question_success_rate?: number
  hardest_question_index?: number
  hardest_question_success_rate?: number

  // Timing
  session_duration_seconds?: number

  // Metadata
  generated_at: string
}

export interface StudentProgressSnapshot {
  id: string
  student_id: string

  // Snapshot period
  snapshot_period: SnapshotPeriod
  period_start: string
  period_end: string

  // Aggregated metrics
  quizzes_taken: number
  total_questions_answered: number
  total_correct_answers: number
  avg_accuracy?: number
  avg_score?: number
  best_score?: number

  // Engagement
  total_time_spent_seconds: number
  avg_response_time_ms?: number
  participation_rate?: number

  // Rankings
  avg_rank?: number
  best_rank?: number

  // Metadata
  created_at: string
}

// ============================================================
// REAL-TIME EVENT PAYLOADS
// ============================================================

export interface QuizStartedPayload {
  event: 'quiz_started'
  session_id: string
  first_question: QuizQuestion
  time_limit: number
  total_questions: number
}

export interface NewQuestionPayload {
  event: 'new_question'
  session_id: string
  question_index: number
  question: QuizQuestion
  time_limit: number
  start_time: string
}

export interface AnswerSubmittedPayload {
  event: 'answer_submitted'
  session_id: string
  participant_id: string
  nickname?: string
  answered: boolean
  time_taken_ms: number
  total_answered: number
  total_participants: number
  answer_distribution?: Record<string, number>
}

export interface QuestionResultsPayload {
  event: 'question_results'
  session_id: string
  question_index: number
  correct_option_id: string
  answer_distribution: Record<string, number>
  top_scorers: Array<{
    participant_id: string
    nickname?: string
    time_taken_ms: number
    points_earned: number
    is_correct: boolean
  }>
}

export interface LeaderboardEntry {
  rank: number
  participant_id: string
  user_id: string
  nickname?: string
  total_score: number
  correct_answers: number
  longest_streak: number
  avatar_url?: string
}

export interface LeaderboardUpdatePayload {
  event: 'leaderboard_update'
  session_id: string
  leaderboard: LeaderboardEntry[]
  current_question: number
  total_questions: number
}

export interface ParticipantJoinedPayload {
  event: 'participant_joined'
  session_id: string
  participant: {
    id: string
    user_id: string
    nickname?: string
    avatar_url?: string
  }
  total_participants: number
}

export interface ParticipantLeftPayload {
  event: 'participant_left'
  session_id: string
  participant_id: string
  total_participants: number
}

export interface QuizFinishedPayload {
  event: 'quiz_finished'
  session_id: string
  final_leaderboard: LeaderboardEntry[]
  session_analytics: {
    total_participants: number
    avg_score: number
    top_score: number
    duration_seconds: number
  }
}

export type RealtimeEventPayload =
  | QuizStartedPayload
  | NewQuestionPayload
  | AnswerSubmittedPayload
  | QuestionResultsPayload
  | LeaderboardUpdatePayload
  | ParticipantJoinedPayload
  | ParticipantLeftPayload
  | QuizFinishedPayload

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface CreateSessionRequest {
  quiz_id: string
  settings?: Partial<SessionSettings>
}

export interface CreateSessionResponse {
  session: QuizSession
  session_code: string
}

export interface JoinSessionRequest {
  session_code: string
  nickname?: string
}

export interface JoinSessionResponse {
  session: QuizSession
  participant: SessionParticipant
  quiz: Quiz
}

export interface SubmitAnswerRequest {
  session_id: string
  participant_id: string
  question_id: string
  question_index: number
  selected_option_id: string
  time_taken_ms: number
}

export interface SubmitAnswerResponse {
  answer: SessionAnswer
  updated_participant: SessionParticipant
  is_correct: boolean
  points_earned: number
  new_rank?: number
}

export interface AdvanceQuestionRequest {
  session_id: string
}

export interface AdvanceQuestionResponse {
  session: QuizSession
  next_question?: QuizQuestion
  has_more: boolean
}

export interface GetLeaderboardRequest {
  session_id: string
  limit?: number
}

export interface GetLeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  total_participants: number
  current_user_rank?: number
}

// ============================================================
// DASHBOARD DATA TYPES
// ============================================================

export interface StudentDashboardData {
  student_id: string
  recent_quizzes: StudentQuizHistory[]
  performance_summary: {
    total_quizzes: number
    avg_score: number
    avg_accuracy: number
    total_correct: number
    total_questions: number
    best_score: number
    best_rank: number
  }
  performance_trends: Array<{
    week: string
    quizzes_taken: number
    avg_score: number
    avg_accuracy: number
  }>
  current_streak: number
  achievements: Array<{
    id: string
    title: string
    description: string
    earned_at: string
  }>
}

export interface MentorDashboardData {
  mentor_id: string
  active_sessions: QuizSession[]
  recent_sessions: Array<{
    session: QuizSession
    analytics: MentorSessionAnalytics
  }>
  total_quizzes_created: number
  total_sessions_hosted: number
  total_students_reached: number
  avg_session_score: number
  most_difficult_questions: Array<{
    quiz_title: string
    question_index: number
    question_text: string
    success_rate: number
  }>
}

export interface LiveSessionDashboard {
  session: QuizSession
  participants: SessionParticipant[]
  current_question?: QuizQuestion
  answer_distribution: Record<string, number>
  response_timeline: Array<{
    time_range: string
    count: number
  }>
  top_performers: LeaderboardEntry[]
  engagement_metrics: {
    total_joined: number
    currently_active: number
    disconnected: number
    avg_response_time: number
    questions_completed: number
    questions_remaining: number
  }
}

// ============================================================
// UTILITY TYPES
// ============================================================

export interface ScoreCalculation {
  base_points: number
  speed_bonus: number
  streak_multiplier: number
  total_points: number
}

export interface QuestionTiming {
  start_time: Date
  end_time: Date
  remaining_ms: number
  elapsed_ms: number
}

export interface AnswerValidation {
  is_correct: boolean
  correct_option_id: string
  selected_option_id: string
  explanation?: string
}

// ============================================================
// HOOKS & CONTEXT TYPES
// ============================================================

export interface QuizSessionContextValue {
  session: QuizSession | null
  participant: SessionParticipant | null
  currentQuestion: QuizQuestion | null
  leaderboard: LeaderboardEntry[]
  isHost: boolean
  isLoading: boolean
  error: string | null

  // Actions
  joinSession: (sessionCode: string, nickname?: string) => Promise<void>
  submitAnswer: (optionId: string, timeTakenMs: number) => Promise<void>
  advanceQuestion: () => Promise<void>
  finishSession: () => Promise<void>
  leaveSession: () => Promise<void>
}

export interface RealtimeSubscription {
  channel: string
  connected: boolean
  latency: number
  reconnecting: boolean
}

// ============================================================
// FILTER & SORT OPTIONS
// ============================================================

export interface StudentHistoryFilters {
  quiz_id?: string
  date_from?: string
  date_to?: string
  min_score?: number
  max_score?: number
  min_accuracy?: number
}

export type StudentHistorySortBy =
  | 'participated_at'
  | 'total_score'
  | 'accuracy_percentage'
  | 'rank'

export interface MentorAnalyticsFilters {
  quiz_id?: string
  date_from?: string
  date_to?: string
  min_participants?: number
  session_status?: SessionStatus
}

export type MentorAnalyticsSortBy =
  | 'created_at'
  | 'total_participants'
  | 'avg_score'
  | 'completion_rate'

// ============================================================
// CONSTANTS
// ============================================================

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  questionTimer: 20,
  showAnswerDistribution: true,
  showLeaderboard: true,
  allowLateJoin: false,
  pointsPerQuestion: 1000,
  speedBonus: true,
  streakMultiplier: true,
}

export const STREAK_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
}

export const DIFFICULTY_THRESHOLDS = {
  easy: 80, // >= 80% success rate
  medium: 60, // >= 60% success rate
  hard: 40, // >= 40% success rate
  very_hard: 0, // < 40% success rate
} as const

// ============================================================
// TYPE GUARDS
// ============================================================

export function isQuizSession(obj: any): obj is QuizSession {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.session_code === 'string' &&
    typeof obj.status === 'string'
  )
}

export function isSessionParticipant(obj: any): obj is SessionParticipant {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.session_id === 'string' &&
    typeof obj.user_id === 'string'
  )
}

export function isRealtimeEventPayload(obj: any): obj is RealtimeEventPayload {
  return obj && typeof obj.event === 'string' && typeof obj.session_id === 'string'
}

// ============================================================
// HELPER TYPES FOR SUPABASE QUERIES
// ============================================================

export type SessionWithRelations = QuizSession & {
  quiz: Quiz
  host: {
    id: string
    email: string
    full_name?: string
  }
  participants: SessionParticipant[]
}

export type ParticipantWithUser = SessionParticipant & {
  user: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

export type HistoryWithQuiz = StudentQuizHistory & {
  quiz: Quiz
  session?: QuizSession
}
