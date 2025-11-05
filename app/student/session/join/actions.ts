'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Join a quiz session using a session code
 *
 * This function handles the complete process of a student joining a live quiz:
 * - Validates authentication and fetches user profile
 * - Verifies the session code and checks if the session is joinable
 * - Prevents duplicate joins by checking if user already joined
 * - Creates a participant record with the user's display name
 * - Logs the join event for analytics
 *
 * Session codes are case-insensitive (automatically converted to uppercase).
 * Students can join during the lobby phase or during active quiz if late join is enabled.
 *
 * @param sessionCode - The 6-character session code (e.g., "ABC123")
 * @returns Object containing success status, session data, and participant info
 */
export async function joinQuizSession(sessionCode: string) {
  const supabase = await createClient()

  try {
    console.log('[JOIN] Starting join process for code:', sessionCode)
    const startTime = Date.now()

    // Verify the user is logged in before they can join any quiz
    console.log('[JOIN] Step 1: Checking authentication...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[JOIN] Auth failed:', authError)
      return { error: 'Please log in to join a quiz' }
    }
    console.log('[JOIN] Auth successful:', user.id, '| Time:', Date.now() - startTime, 'ms')

    // Fetch the user's display name from their profile
    // We try multiple fallbacks to always have a friendly name:
    // 1. Full name from profile (preferred)
    // 2. Email from profile
    // 3. Email from auth
    // 4. "Anonymous" as last resort
    console.log('[JOIN] Step 2: Fetching profile...')
    let displayName = user.email?.split('@')[0] || 'Anonymous'

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileError && profile) {
        displayName = profile.full_name || profile.email?.split('@')[0] || displayName
      }
      console.log('[JOIN] Profile fetched:', displayName, '| Time:', Date.now() - startTime, 'ms')
    } catch (profileErr) {
      // If profiles table doesn't exist or query fails, gracefully fall back to email
      // This makes the code resilient to schema changes
      console.warn('[JOIN] Could not fetch profile, using email | Time:', Date.now() - startTime, 'ms', profileErr)
    }

    // Look up the session by its code (case-insensitive)
    console.log('[JOIN] Step 3: Looking up session...')
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('*, quiz:quizzes(*)')
      .eq('session_code', sessionCode.toUpperCase())
      .single()

    if (sessionError || !session) {
      console.error('[JOIN] Session lookup failed:', sessionError)
      return { error: 'Session not found. Please check the code.' }
    }
    console.log('[JOIN] Session found:', session.id, '| Time:', Date.now() - startTime, 'ms')

    // Check if the session is in a joinable state
    // Finished sessions cannot be joined
    if (session.status === 'finished') {
      console.log('[JOIN] Session already finished')
      return { error: 'This session has already ended' }
    }

    // Active sessions can only be joined if the mentor enabled late join
    if (session.status !== 'lobby' && !session.settings?.allowLateJoin) {
      console.log('[JOIN] Late join not allowed')
      return { error: 'This session has already started and late join is not allowed' }
    }

    // Check if this user has already joined this session
    // If so, return their existing participant record instead of creating a duplicate
    console.log('[JOIN] Step 4: Checking for existing participant...')
    const { data: existing } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      console.log('[JOIN] Already joined, returning existing participant | Time:', Date.now() - startTime, 'ms')
      return {
        success: true,
        session,
        participant: existing,
        alreadyJoined: true,
      }
    }
    console.log('[JOIN] No existing participant found | Time:', Date.now() - startTime, 'ms')

    // Create a new participant record for this user
    // Status depends on session state: "waiting" in lobby, "active" if quiz started
    console.log('[JOIN] Step 5: Creating participant record...')
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: user.id,
        nickname: displayName,
        status: session.status === 'lobby' ? 'waiting' : 'active',
      })
      .select('*')
      .single()

    if (participantError) {
      console.error('[JOIN] Error adding participant:', participantError)
      return { error: 'Failed to join session' }
    }
    console.log('[JOIN] Participant created:', participant.id, '| Time:', Date.now() - startTime, 'ms')

    // Log the join event for session history and analytics
    // This helps mentors see when students joined during the session
    // Wrapped in try-catch to prevent blocking if event logging fails
    console.log('[JOIN] Step 6: Logging join event...')
    try {
      await supabase.from('session_events').insert({
        session_id: session.id,
        event_type: 'participant_joined',
        user_id: user.id,
        event_data: { nickname: participant.nickname },
      })
      console.log('[JOIN] Event logged | Time:', Date.now() - startTime, 'ms')
    } catch (eventError) {
      // Don't fail the join if event logging fails - this is non-critical
      console.warn('[JOIN] Failed to log event (non-critical):', eventError)
    }

    console.log('[JOIN] Join complete! Total time:', Date.now() - startTime, 'ms')
    return {
      success: true,
      session,
      participant,
      alreadyJoined: false,
    }
  } catch (error) {
    console.error('Error joining session:', error)
    return { error: 'An unexpected error occurred' }
  }
}
