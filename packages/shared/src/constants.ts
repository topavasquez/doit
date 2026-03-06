export const HABIT_CATEGORIES = ['gym', 'reading', 'sleep', 'diet', 'study', 'custom'] as const
export type HabitCategory = (typeof HABIT_CATEGORIES)[number]

export const CHALLENGE_DURATIONS = [7, 30, 90] as const
export type ChallengeDuration = (typeof CHALLENGE_DURATIONS)[number]

export const CHALLENGE_FREQUENCIES = ['daily', 'weekly'] as const
export type ChallengeFrequency = (typeof CHALLENGE_FREQUENCIES)[number]

export const CHALLENGE_STATUSES = ['pending', 'active', 'completed', 'cancelled'] as const
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number]

export const GROUP_ROLES = ['admin', 'member'] as const
export type GroupRole = (typeof GROUP_ROLES)[number]

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90] as const

export const MAX_GROUP_SIZE = 10
export const MIN_GROUP_SIZE = 2

export const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  gym: '🏋️ Gym',
  reading: '📚 Reading',
  sleep: '😴 Sleep',
  diet: '🥗 Diet',
  study: '📖 Study',
  custom: '✨ Custom',
}

export const HABIT_CATEGORY_EMOJI: Record<HabitCategory, string> = {
  gym: '🏋️',
  reading: '📚',
  sleep: '😴',
  diet: '🥗',
  study: '📖',
  custom: '✨',
}

export const NOTIFICATION_TYPES = {
  FRIEND_CHECKIN: 'friend_checkin',
  STREAK_MILESTONE: 'streak_milestone',
  CHALLENGE_START: 'challenge_start',
  CHALLENGE_END: 'challenge_end',
  DAILY_REMINDER: 'daily_reminder',
  MISSED_CHECKIN: 'missed_checkin',
} as const
