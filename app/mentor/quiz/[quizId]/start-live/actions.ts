'use server'

import { createClient } from '@/utils/supabase/server'

interface SessionSettings {
  questionTimer: number
  showAnswerDistribution: boolean
  showLeaderboard: boolean
  allowLateJoin: boolean
  pointsPerQuestion: number
  speedBonus: boolean
  streakMultiplier: boolean
}

export async function createLiveSession(
  quizId: string,
  settings: Partial<SessionSettings> = {}
) {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify quiz exists and belongs to user
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('created_by', user.id)
      .single()

    if (quizError || !quiz) {
      return { error: 'Quiz not found' }
    }

    // Generate session code using database function
    const { data: sessionCodeData, error: codeError } = await supabase
      .rpc('generate_session_code')

    if (codeError) {
      return { error: 'Failed to generate session code' }
    }

    const sessionCode = sessionCodeData as string

    // Default settings
    const defaultSettings: SessionSettings = {
      questionTimer: 20,
      showAnswerDistribution: true,
      showLeaderboard: true,
      allowLateJoin: false,
      pointsPerQuestion: 1000,
      speedBonus: true,
      streakMultiplier: true,
    }

    // Merge with provided settings
    const finalSettings = { ...defaultSettings, ...settings }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quizId,
        host_id: user.id,
        session_code: sessionCode,
        status: 'lobby',
        settings: finalSettings,
        current_question_index: 0,
      })
      .select('*')
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return { error: 'Failed to create session' }
    }

    // Log event
    await supabase.from('session_events').insert({
      session_id: session.id,
      event_type: 'session_created',
      user_id: user.id,
      event_data: { quiz_id: quizId, quiz_title: quiz.title },
    })

    return {
      success: true,
      session,
      sessionCode,
    }
  } catch (error) {
    console.error('Error creating live session:', error)
    return { error: 'An unexpected error occurred' }
  }
}
