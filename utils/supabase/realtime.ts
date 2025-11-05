import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export class QuizRealtimeClient {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()

  /**
   * Subscribe to session lobby updates (participant join/leave)
   */
  subscribeLobby(
    sessionCode: string,
    callbacks: {
      onParticipantJoined?: (payload: any) => void
      onParticipantLeft?: (payload: any) => void
      onQuizStarting?: (payload: any) => void
    }
  ) {
    const channelName = `session:${sessionCode}:lobby`

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event: 'participant_joined' }, callbacks.onParticipantJoined || (() => {}))
      .on('broadcast', { event: 'participant_left' }, callbacks.onParticipantLeft || (() => {}))
      .on('broadcast', { event: 'quiz_starting' }, callbacks.onQuizStarting || (() => {}))
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to active quiz session
   */
  subscribeQuiz(
    sessionId: string,
    callbacks: {
      onQuestionStart?: (payload: any) => void
      onAnswerSubmitted?: (payload: any) => void
      onQuestionEnd?: (payload: any) => void
      onLeaderboardUpdate?: (payload: any) => void
      onQuizFinished?: (payload: any) => void
    }
  ) {
    const channelName = `session:${sessionId}:quiz`

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event: 'question_start' }, callbacks.onQuestionStart || (() => {}))
      .on('broadcast', { event: 'answer_submitted' }, callbacks.onAnswerSubmitted || (() => {}))
      .on('broadcast', { event: 'question_end' }, callbacks.onQuestionEnd || (() => {}))
      .on('broadcast', { event: 'leaderboard_update' }, callbacks.onLeaderboardUpdate || (() => {}))
      .on('broadcast', { event: 'quiz_finished' }, callbacks.onQuizFinished || (() => {}))
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to database changes for real-time updates
   */
  subscribeToParticipants(sessionId: string, callback: (payload: any) => void) {
    const channelName = `participants:${sessionId}`

    // Remove existing channel if it exists
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for participants: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to participants for session: ${sessionId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to participants for session: ${sessionId}`)
          console.error(`💡 Make sure Realtime is enabled for 'session_participants' table in Supabase Dashboard → Database → Replication`)
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Subscription timed out for session: ${sessionId}`)
          console.error(`💡 Check if Realtime is enabled for 'session_participants' table`)
        } else if (status === 'CLOSED') {
          console.warn(`🔒 Subscription closed for session: ${sessionId}`)
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to session status changes
   */
  subscribeToSession(sessionId: string, callback: (payload: any) => void) {
    const channelName = `session:${sessionId}`

    // Remove existing channel if it exists
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for session: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to session updates for: ${sessionId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to session for: ${sessionId}`)
          console.error(`💡 Make sure Realtime is enabled for 'quiz_sessions' table in Supabase Dashboard → Database → Replication`)
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Session subscription timed out: ${sessionId}`)
          console.error(`💡 Check if Realtime is enabled for 'quiz_sessions' table`)
        } else if (status === 'CLOSED') {
          console.warn(`🔒 Session subscription closed: ${sessionId}`)
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Subscribe to answer submissions
   */
  subscribeToAnswers(sessionId: string, callback: (payload: any) => void) {
    const channelName = `answers:${sessionId}`

    // Remove existing channel if it exists
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        callback
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for answers: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to answers for session: ${sessionId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to answers for: ${sessionId}`)
          console.error(`💡 Make sure Realtime is enabled for 'session_answers' table in Supabase Dashboard → Database → Replication`)
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ Answer subscription timed out: ${sessionId}`)
          console.error(`💡 Check if Realtime is enabled for 'session_answers' table`)
        } else if (status === 'CLOSED') {
          console.warn(`🔒 Answer subscription closed: ${sessionId}`)
        }
      })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Broadcast event to channel
   */
  async broadcast(channelName: string, event: string, payload: any) {
    const channel = this.channels.get(channelName)
    if (!channel) {
      console.error(`Channel ${channelName} not found`)
      return
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

// Singleton instance
export const quizRealtime = new QuizRealtimeClient()
