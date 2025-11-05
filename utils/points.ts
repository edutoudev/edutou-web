import { createClient } from '@/utils/supabase/client'

export type ActionType =
  | 'task_submission'
  | 'discussion_create'
  | 'discussion_comment'
  | 'quiz_completion'
  | 'quiz_perfect_score'
  | 'resource_upload'
  | 'hackathon_participation'
  | 'feedback_submission'
  | 'daily_login'
  | 'profile_completion'
  | 'manual_points_add'
  | 'manual_points_subtract'

interface AwardPointsParams {
  userId: string
  actionType: ActionType
  referenceId?: string
  referenceType?: string
  description?: string
}

/**
 * Award points to a user for a specific action
 * Uses the award_points database function
 */
export async function awardPoints({
  userId,
  actionType,
  referenceId,
  referenceType,
  description,
}: AwardPointsParams): Promise<{ success: boolean; points: number; error?: string }> {
  try {
    const supabase = createClient()

    // Call the database function to award points
    const { data, error } = await supabase.rpc('award_points', {
      p_user_id: userId,
      p_action_type: actionType,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_description: description || null,
    })

    if (error) {
      console.error('Error awarding points:', error)
      return { success: false, points: 0, error: error.message }
    }

    // data contains the number of points awarded
    const pointsAwarded = data as number

    return { success: true, points: pointsAwarded }
  } catch (error) {
    console.error('Error in awardPoints:', error)
    return { success: false, points: 0, error: String(error) }
  }
}

/**
 * Manually adjust points (can be positive or negative)
 * Used for manual point additions/subtractions by mentors
 */
export async function adjustPointsManual({
  userId,
  actionType,
  points,
  referenceId,
  referenceType,
  description,
}: AwardPointsParams & { points: number }): Promise<{ success: boolean; points: number; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('adjust_points_manual', {
      p_user_id: userId,
      p_action_type: actionType,
      p_points: points,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_description: description || null,
    })

    if (error) {
      console.error('Error adjusting points manually:', error)
      return { success: false, points: 0, error: error.message }
    }

    return { success: true, points: data as number }
  } catch (error) {
    console.error('Error in adjustPointsManual:', error)
    return { success: false, points: 0, error: String(error) }
  }
}

/**
 * Get user's points history
 */
export async function getUserPointsHistory(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching points history:', error)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getUserPointsHistory:', error)
    return { success: false, data: [], error: String(error) }
  }
}

/**
 * Get points configuration
 */
export async function getPointsConfig() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('points_config')
      .select('*')
      .eq('is_active', true)
      .order('action_type')

    if (error) {
      console.error('Error fetching points config:', error)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getPointsConfig:', error)
    return { success: false, data: [], error: String(error) }
  }
}

/**
 * Get total points for a user
 */
export async function getUserTotalPoints(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_user_total_points', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Error fetching total points:', error)
      return { success: false, points: 0, error: error.message }
    }

    return { success: true, points: data as number }
  } catch (error) {
    console.error('Error in getUserTotalPoints:', error)
    return { success: false, points: 0, error: String(error) }
  }
}
