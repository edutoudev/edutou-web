'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Submit a student's answer to a quiz question
 *
 * This function handles the complete answer submission flow including:
 * - Verifying the answer is correct
 * - Calculating points based on speed, streaks, and quiz settings
 * - Recording the answer in the database
 * - Updating participant statistics
 *
 * @param sessionId - The unique ID of the quiz session
 * @param questionIndex - The index of the question being answered (0-based)
 * @param selectedOptionIndex - The option the student selected (0-3)
 * @param answerTimeMs - How long it took the student to answer in milliseconds
 * @returns Object containing success status, correctness, points earned, and updated stats
 */
export async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  selectedOptionIndex: number,
  answerTimeMs: number
) {
  try {
    const supabase = await createClient()

    // Verify the user is authenticated before processing their answer
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Look up this user's participant record for this session
    // We need this to track their progress and update their stats
    const { data: participant } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!participant) return { error: 'Participant not found' }

    // Fetch the session and quiz questions to verify the answer
    // We join with the quizzes table to get the full question data
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(questions)')
      .eq('id', sessionId)
      .single()

    if (!session) return { error: 'Session not found' }

    const questions = session.quiz.questions as any[]
    const question = questions[questionIndex]

    if (!question) return { error: 'Question not found' }

    // Determine if the student's answer is correct
    const isCorrect = selectedOptionIndex === question.correctOptionIndex

    // Calculate points earned based on quiz settings and performance
    // Points are only awarded for correct answers
    const settings = session.settings as any
    let pointsEarned = 0

    if (isCorrect) {
      // Start with base points (default: 1000 points per question)
      pointsEarned = settings.pointsPerQuestion || 1000

      // Add speed bonus if enabled - reward faster answers
      // The faster you answer, the more bonus points you get
      if (settings.speedBonus) {
        const questionTimeMs = (settings.questionTimer || 20) * 1000
        const speedRatio = Math.max(0, (questionTimeMs - answerTimeMs) / questionTimeMs)
        const speedBonus = Math.floor(speedRatio * (settings.maxSpeedBonus || 500))
        pointsEarned += speedBonus
      }

      // Apply streak multiplier if enabled - reward consistent correct answers
      // Each consecutive correct answer increases the multiplier (up to 2x at 10 streak)
      if (settings.streakMultiplier) {
        const newStreak = participant.current_streak + 1
        const multiplier = Math.min(2, 1 + (newStreak - 1) * 0.1) // Max 2x at 10 streak
        pointsEarned = Math.floor(pointsEarned * multiplier)
      }
    }

    // Record the answer in the database for analytics and result tracking
    // Note: selected_option_id is stored as text, so we convert the number to string
    const { data: answer, error: answerError } = await supabase
      .from('session_answers')
      .insert({
        session_id: sessionId,
        participant_id: participant.id,
        user_id: user.id,
        question_id: question.id || `q_${questionIndex}`,
        question_index: questionIndex,
        selected_option_id: selectedOptionIndex.toString(),
        is_correct: isCorrect,
        time_taken_ms: answerTimeMs,
        points_earned: pointsEarned,
      })
      .select()
      .single()

    if (answerError) throw answerError

    // Update participant statistics for leaderboard and progress tracking
    // Streak resets to 0 if the answer is incorrect
    const newStreak = isCorrect ? participant.current_streak + 1 : 0
    const newTotalScore = participant.total_score + pointsEarned
    const newCorrectAnswers = participant.correct_answers + (isCorrect ? 1 : 0)
    const newQuestionsAnswered = participant.questions_answered + 1

    await supabase
      .from('session_participants')
      .update({
        total_score: newTotalScore,
        current_streak: newStreak,
        longest_streak: Math.max(participant.longest_streak || 0, newStreak),
        correct_answers: newCorrectAnswers,
        questions_answered: newQuestionsAnswered,
      })
      .eq('id', participant.id)

    // Update leaderboard table - sync points from quiz session to main leaderboard
    // This keeps the global leaderboard up-to-date with quiz performance
    if (isCorrect && pointsEarned > 0) {
      // Check if user has a leaderboard entry
      const { data: leaderboardEntry } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (leaderboardEntry) {
        // Update existing entry - add new points
        await supabase
          .from('leaderboard')
          .update({
            total_points: (leaderboardEntry.total_points || 0) + pointsEarned,
            quiz_points: (leaderboardEntry.quiz_points || 0) + pointsEarned,
            correct_answers: (leaderboardEntry.correct_answers || 0) + 1,
            total_attempts: (leaderboardEntry.total_attempts || 0) + 1,
            last_activity: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      } else {
        // Create new leaderboard entry for first-time quiz taker
        await supabase
          .from('leaderboard')
          .insert({
            user_id: user.id,
            total_points: pointsEarned,
            quiz_points: pointsEarned,
            assignment_points: 0,
            bonus_points: 0,
            quizzes_completed: 0, // Will be updated when quiz finishes
            correct_answers: 1,
            total_attempts: 1,
            last_activity: new Date().toISOString(),
          })
      }

      // Update profiles table's leaderboard_points column
      // This provides quick access to user's total points without joining tables
      await supabase
        .from('profiles')
        .update({
          leaderboard_points: (leaderboardEntry?.total_points || 0) + pointsEarned,
        })
        .eq('id', user.id)
    } else if (!isCorrect) {
      // Track incorrect answers in leaderboard stats
      const { data: leaderboardEntry } = await supabase
        .from('leaderboard')
        .select('total_attempts')
        .eq('user_id', user.id)
        .maybeSingle()

      if (leaderboardEntry) {
        // Update attempt count for incorrect answers
        await supabase
          .from('leaderboard')
          .update({
            total_attempts: (leaderboardEntry.total_attempts || 0) + 1,
            last_activity: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
    }

    // Return all relevant information to update the UI
    return {
      success: true,
      isCorrect,
      pointsEarned,
      newTotalScore,
      newStreak,
      correctAnswer: question.correctOptionIndex,
    }
  } catch (error) {
    console.error('Error submitting answer:', error)
    return { error: 'Failed to submit answer' }
  }
}

/**
 * Get the current question for a student in a quiz session
 *
 * This function fetches all necessary data for displaying the current question:
 * - The session details and quiz information
 * - The student's participant record
 * - The current question being shown
 * - Whether the student has already answered this question (prevents double submission)
 *
 * This is typically called when a student joins an active quiz or when a new question starts.
 *
 * @param sessionId - The unique ID of the quiz session
 * @returns Object containing session, participant, current question, and answer status
 */
export async function getQuestionForStudent(sessionId: string) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Fetch the session with full quiz details including all questions
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(questions, title, description)')
      .eq('id', sessionId)
      .single()

    if (!session) return { error: 'Session not found' }

    // Get this student's participant record
    const { data: participant } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!participant) return { error: 'Participant not found' }

    // Check if the student has already answered the current question
    // This prevents double submissions and allows showing their previous answer
    const { data: existingAnswer } = await supabase
      .from('session_answers')
      .select('*')
      .eq('participant_id', participant.id)
      .eq('question_index', session.current_question_index)
      .single()

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
      session,
      participant,
      question: normalizedQuestion,
      questionIndex: session.current_question_index,
      totalQuestions: questions.length,
      hasAnswered: !!existingAnswer,
      answer: existingAnswer,
    }
  } catch (error) {
    console.error('Error getting question:', error)
    return { error: 'Failed to get question' }
  }
}
