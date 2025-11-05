/**
 * League and Ranking System for Edutou Platform
 *
 * This module provides a professional yet engaging ranking system
 * to gamify learning while maintaining educational focus.
 *
 * Ranks are based on total leaderboard points earned through:
 * - Quiz performance
 * - Assignment completion
 * - Bonus achievements
 */

export interface Rank {
  id: string
  name: string
  emoji: string
  minPoints: number
  maxPoints: number
  color: string
  description: string
  gradient: string
}

/**
 * Complete ranking system from beginner to legend
 * Inspired by competitive gaming but with education-focused naming
 */
export const RANKS: Rank[] = [
  {
    id: 'seedling',
    name: 'Seedling',
    emoji: '🌱',
    minPoints: 0,
    maxPoints: 999,
    color: 'text-green-700 dark:text-green-300 reading:text-green-800',
    description: 'Just starting your learning journey',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    id: 'sprout',
    name: 'Sprout',
    emoji: '🌿',
    minPoints: 1000,
    maxPoints: 2499,
    color: 'text-emerald-700 dark:text-emerald-400 reading:text-emerald-800',
    description: 'Growing your knowledge foundation',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    emoji: '🌾',
    minPoints: 2500,
    maxPoints: 4999,
    color: 'text-amber-700 dark:text-amber-400 reading:text-amber-800',
    description: 'Developing solid expertise',
    gradient: 'from-amber-400 to-yellow-500',
  },
  {
    id: 'researcher',
    name: 'Researcher',
    emoji: '📚',
    minPoints: 5000,
    maxPoints: 9999,
    color: 'text-blue-700 dark:text-blue-400 reading:text-blue-800',
    description: 'Deep diving into subjects',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    id: 'graduate',
    name: 'Graduate',
    emoji: '🎓',
    minPoints: 10000,
    maxPoints: 14999,
    color: 'text-indigo-700 dark:text-indigo-400 reading:text-indigo-800',
    description: 'Advanced knowledge mastered',
    gradient: 'from-indigo-400 to-purple-500',
  },
  {
    id: 'expert',
    name: 'Expert',
    emoji: '🏆',
    minPoints: 15000,
    maxPoints: 24999,
    color: 'text-purple-700 dark:text-purple-400 reading:text-purple-800',
    description: 'Exceptional mastery achieved',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    id: 'master',
    name: 'Master',
    emoji: '💎',
    minPoints: 25000,
    maxPoints: 39999,
    color: 'text-cyan-700 dark:text-cyan-400 reading:text-cyan-800',
    description: 'Elite level performer',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    emoji: '🌟',
    minPoints: 40000,
    maxPoints: 59999,
    color: 'text-orange-700 dark:text-orange-400 reading:text-orange-800',
    description: 'Top-tier excellence',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    id: 'legend',
    name: 'Legend',
    emoji: '👑',
    minPoints: 60000,
    maxPoints: Infinity,
    color: 'text-yellow-700 dark:text-yellow-400 reading:text-yellow-800',
    description: 'Ultimate achievement unlocked',
    gradient: 'from-yellow-400 to-amber-500',
  },
]

/**
 * Get a user's rank based on their total points
 * @param points - Total leaderboard points
 * @returns Rank object with all rank information
 */
export function getRankFromPoints(points: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i]
    }
  }
  return RANKS[0] // Default to Seedling
}

/**
 * Get the next rank a user can achieve
 * @param points - Current total points
 * @returns Next rank object, or null if already at max rank
 */
export function getNextRank(points: number): Rank | null {
  const currentRank = getRankFromPoints(points)
  const currentIndex = RANKS.findIndex(r => r.id === currentRank.id)

  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1]
  }

  return null // Already at Legend rank
}

/**
 * Calculate progress percentage to next rank
 * @param points - Current total points
 * @returns Progress percentage (0-100)
 */
export function getProgressToNextRank(points: number): number {
  const currentRank = getRankFromPoints(points)
  const nextRank = getNextRank(points)

  if (!nextRank) {
    return 100 // Already at max rank
  }

  const pointsInCurrentRank = points - currentRank.minPoints
  const pointsNeededForNextRank = nextRank.minPoints - currentRank.minPoints

  return Math.min(100, (pointsInCurrentRank / pointsNeededForNextRank) * 100)
}

/**
 * Get points needed to reach next rank
 * @param points - Current total points
 * @returns Points needed, or 0 if already at max rank
 */
export function getPointsToNextRank(points: number): number {
  const nextRank = getNextRank(points)

  if (!nextRank) {
    return 0 // Already at max rank
  }

  return Math.max(0, nextRank.minPoints - points)
}

/**
 * Get a rank badge component-friendly object
 * Useful for rendering rank badges in UI
 */
export function getRankBadge(points: number) {
  const rank = getRankFromPoints(points)
  return {
    emoji: rank.emoji,
    name: rank.name,
    color: rank.color,
    gradient: rank.gradient,
    fullDisplay: `${rank.emoji} ${rank.name}`,
  }
}

/**
 * Get rank statistics for display
 * Provides all information needed to show rank progress
 */
export function getRankStats(points: number) {
  const currentRank = getRankFromPoints(points)
  const nextRank = getNextRank(points)
  const progress = getProgressToNextRank(points)
  const pointsNeeded = getPointsToNextRank(points)

  return {
    current: currentRank,
    next: nextRank,
    progress,
    pointsNeeded,
    isMaxRank: !nextRank,
  }
}
