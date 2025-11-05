'use server'

import { createClient } from '@/utils/supabase/server'

export async function getSessionByCode(sessionCode: string) {
  const supabase = await createClient()

  try {
    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        quiz:quizzes(*)
      `)
      .eq('session_code', sessionCode.toUpperCase())
      .single()

    if (error) {
      return { error: 'Session not found' }
    }

    return { success: true, session }
  } catch (error) {
    return { error: 'Failed to load session' }
  }
}

export async function startQuizSession(sessionId: string) {
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    // Get session with quiz data
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(*)')
      .eq('id', sessionId)
      .eq('host_id', user.id)
      .single()

    if (sessionError || !session) {
      return { error: 'Session not found or unauthorized' }
    }

    const questions = session.quiz.questions as any[]
    if (!questions || questions.length === 0) {
      return { error: 'Quiz has no questions' }
    }

    const firstQuestion = questions[0]
    const questionTimer = session.settings?.questionTimer || 20

    // Update session to active status with first question
    const { error: updateError } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        current_question_index: 0,
        current_question_id: firstQuestion.id,
        question_start_time: new Date().toISOString(),
        question_end_time: new Date(Date.now() + questionTimer * 1000).toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error starting quiz:', updateError)
      return { error: 'Failed to start quiz' }
    }

    // Update all participants to active
    await supabase
      .from('session_participants')
      .update({ status: 'active' })
      .eq('session_id', sessionId)
      .eq('status', 'waiting')

    // Log event
    await supabase.from('session_events').insert({
      session_id: sessionId,
      event_type: 'session_started',
      user_id: user.id,
      event_data: { question_index: 0 },
    })

    return { success: true }
  } catch (error) {
    console.error('Error starting quiz:', error)
    return { error: 'An unexpected error occurred' }
  }
}
