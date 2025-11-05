'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Get the current question being displayed in a live quiz session
 *
 * This function is used by mentors to fetch the question that students are currently
 * answering. It's called when the mentor's live dashboard loads or when navigating
 * between questions.
 *
 * @param sessionId - The unique ID of the quiz session
 * @returns Object containing the current question, its index, total questions, and session data
 */
export async function getCurrentQuestion(sessionId: string) {
  try {
    const supabase = await createClient()

    // Fetch the session with all quiz questions
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(questions)')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    // Extract the current question based on the session's question index
    const questions = session.quiz.questions as any[]
    const currentQuestion = questions[session.current_question_index]

    // Normalize question data structure for UI compatibility
    // Database stores as "question" but UI expects "questionText"
    const normalizedQuestion = currentQuestion ? {
      ...currentQuestion,
      questionText: currentQuestion.question || currentQuestion.questionText,
      options: currentQuestion.options || [],
      correctOptionIndex: currentQuestion.correctOptionIndex
    } : null

    return {
      question: normalizedQuestion,
      index: session.current_question_index,
      total: questions.length,
      session,
    }
  } catch (error) {
    console.error('Error getting current question:', error)
    return { error: 'Failed to get current question' }
  }
}

/**
 * Advance to the next question in the quiz, or finish the quiz if there are no more questions
 *
 * This is the primary control function for mentors during a live quiz. When called:
 * 1. If there are more questions, it moves to the next question
 * 2. If this was the last question, it ends the quiz session
 * 3. Students are automatically redirected to the next question via real-time updates
 *
 * @param sessionId - The unique ID of the quiz session
 * @returns Object indicating success, the next index, or whether the quiz finished
 */
export async function advanceQuestion(sessionId: string) {
  try {
    const supabase = await createClient()

    // Get current session state to determine if there are more questions
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(questions)')
      .eq('id', sessionId)
      .single()

    if (!session) throw new Error('Session not found')

    const questions = session.quiz.questions as any[]
    const nextIndex = session.current_question_index + 1

    // Check if we've reached the end of the quiz
    if (nextIndex >= questions.length) {
      // Mark the session as finished and record the completion time
      await supabase
        .from('quiz_sessions')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      // Get all participants who completed the quiz
      const { data: participants } = await supabase
        .from('session_participants')
        .select('user_id, total_score')
        .eq('session_id', sessionId)

      // Update leaderboard table - increment quizzes_completed for each participant
      if (participants) {
        for (const participant of participants) {
          const { data: leaderboardEntry } = await supabase
            .from('leaderboard')
            .select('quizzes_completed')
            .eq('user_id', participant.user_id)
            .maybeSingle()

          if (leaderboardEntry) {
            // Increment quizzes completed count
            await supabase
              .from('leaderboard')
              .update({
                quizzes_completed: (leaderboardEntry.quizzes_completed || 0) + 1,
                last_activity: new Date().toISOString(),
              })
              .eq('user_id', participant.user_id)
          }
        }
      }

      // Update all participants' status to finished so they see the results page
      await supabase
        .from('session_participants')
        .update({ status: 'finished' })
        .eq('session_id', sessionId)

      return { finished: true }
    }

    // Move to the next question
    // Real-time subscriptions will notify all students to load the new question
    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        current_question_index: nextIndex,
      })
      .eq('id', sessionId)

    if (error) throw error

    return { success: true, nextIndex }
  } catch (error) {
    console.error('Error advancing question:', error)
    return { error: 'Failed to advance question' }
  }
}

/**
 * Manually end a quiz session early
 *
 * This allows mentors to stop a quiz before all questions have been answered.
 * Useful for:
 * - Time constraints (class ending early)
 * - Technical issues
 * - Changing lesson plans
 *
 * All students will be redirected to the results page.
 *
 * @param sessionId - The unique ID of the quiz session to end
 * @returns Object indicating success or error
 */
export async function endSession(sessionId: string) {
  try {
    const supabase = await createClient()

    // Mark the session as finished and record when it ended
    const { error: sessionError } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (sessionError) throw sessionError

    // Get all participants who completed the quiz
    const { data: participants } = await supabase
      .from('session_participants')
      .select('user_id, total_score')
      .eq('session_id', sessionId)

    // Update leaderboard table - increment quizzes_completed for each participant
    // Even if the quiz was ended early, count it as completed
    if (participants) {
      for (const participant of participants) {
        const { data: leaderboardEntry } = await supabase
          .from('leaderboard')
          .select('quizzes_completed')
          .eq('user_id', participant.user_id)
          .maybeSingle()

        if (leaderboardEntry) {
          // Increment quizzes completed count
          await supabase
            .from('leaderboard')
            .update({
              quizzes_completed: (leaderboardEntry.quizzes_completed || 0) + 1,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', participant.user_id)
        }
      }
    }

    // Update all participants to finished status
    // This triggers navigation to results page on the student side
    const { error: participantsError } = await supabase
      .from('session_participants')
      .update({ status: 'finished' })
      .eq('session_id', sessionId)

    if (participantsError) throw participantsError

    return { success: true }
  } catch (error) {
    console.error('Error ending session:', error)
    return { error: 'Failed to end session' }
  }
}

/**
 * Get the current leaderboard for a quiz session
 *
 * Fetches all participants and ranks them by:
 * 1. Total score (descending) - highest score wins
 * 2. Join time (ascending) - if tied, whoever joined first ranks higher
 *
 * This is displayed to mentors during the live quiz and on the results page.
 * Students also see this after each question.
 *
 * @param sessionId - The unique ID of the quiz session
 * @returns Object containing the ranked leaderboard array
 */
export async function getLeaderboard(sessionId: string) {
  try {
    const supabase = await createClient()

    // Fetch all participants sorted by score, then by join time for ties
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true })

    if (error) throw error

    // Add rank numbers based on the sorted order (1st place, 2nd place, etc.)
    const leaderboard = data.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }))

    return { leaderboard }
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return { error: 'Failed to get leaderboard' }
  }
}

/**
 * Get answer statistics for a specific question
 *
 * This provides real-time analytics for mentors showing:
 * - How many students selected each answer option (0-3)
 * - Total number of students who answered
 * - How many students got it correct
 *
 * Displayed as a bar chart on the mentor's live dashboard to visualize
 * student understanding and common misconceptions.
 *
 * @param sessionId - The unique ID of the quiz session
 * @param questionIndex - The index of the question to get stats for (0-based)
 * @returns Object containing answer distribution and correctness stats
 */
export async function getAnswerStats(sessionId: string, questionIndex: number) {
  try {
    const supabase = await createClient()

    // Get all submitted answers for this specific question
    const { data: answers, error } = await supabase
      .from('session_answers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_index', questionIndex)

    if (error) throw error

    // Initialize counters for each answer option (most quizzes have 4 options)
    const stats = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      total: answers?.length || 0,
      correctCount: 0,
    }

    // Count how many students selected each option
    // Note: selected_option_id is stored as text, so we parse it back to a number
    answers?.forEach((answer) => {
      if (answer.selected_option_id !== null) {
        const optionIndex = parseInt(answer.selected_option_id)
        if (!isNaN(optionIndex)) {
          stats[optionIndex as keyof typeof stats]++
        }
      }
      if (answer.is_correct) {
        stats.correctCount++
      }
    })

    return { stats }
  } catch (error) {
    console.error('Error getting answer stats:', error)
    return { error: 'Failed to get answer stats' }
  }
}

/**
 * Get the total number of participants in a quiz session
 *
 * This is an efficient count-only query (doesn't fetch full participant data).
 * Used to display "X students joined" in the mentor's dashboard header.
 *
 * @param sessionId - The unique ID of the quiz session
 * @returns Object containing the participant count
 */
export async function getParticipantCount(sessionId: string) {
  try {
    const supabase = await createClient()

    // Use head: true for an efficient count query without fetching data
    const { count, error } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (error) throw error

    return { count: count || 0 }
  } catch (error) {
    console.error('Error getting participant count:', error)
    return { error: 'Failed to get participant count' }
  }
}
