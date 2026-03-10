export const Colors = {
  // Brand
  primary: '#FF7A00',
  primarySoft: '#FF9A3D',
  primaryDim: '#CC6200',

  // Backgrounds
  background: '#0B0B0B',
  surface: '#151515',
  surfaceElevated: '#1E1E1E',
  border: '#242424',

  // Text
  text: '#EAEAEA',
  textSecondary: '#9A9A9A',
  textMuted: '#5A5A5A',

  // Semantic
  success: '#FF9A3D',
  warning: '#FF7A00',
  error: '#E84444',

  // Streak
  streakFire: '#FF7A00',
  streakGold: '#FF9A3D',

  // Habit category tints (warm palette only)
  gym: '#FF7A00',
  reading: '#FF9A3D',
  sleep: '#9A9A9A',
  diet: '#C8A060',
  study: '#E8A820',
  custom: '#8A8070',
} as const

export type ColorKey = keyof typeof Colors
