export const Colors = {
  // Brand
  primary: '#fe7d1b',
  primaryDim: '#cc6214',

  // Backgrounds
  background: '#111111',
  surface: '#1c1c1c',
  surfaceElevated: '#252525',
  border: '#2e2e2e',

  // Text
  text: '#fff9f9',
  textSecondary: '#a0a0a0',
  textMuted: '#606060',

  // Semantic
  success: '#22C55E',
  warning: '#f0a500',
  error: '#EF4444',
  info: '#3B82F6',

  // Streak
  streakFire: '#fe7d1b',
  streakGold: '#f0a500',

  // Habit category tints
  gym: '#fe7d1b',
  reading: '#3B82F6',
  sleep: '#8B5CF6',
  diet: '#22C55E',
  study: '#f0a500',
  custom: '#EC4899',
} as const

export type ColorKey = keyof typeof Colors
