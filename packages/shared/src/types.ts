import type { HabitCategory, ChallengeFrequency, ChallengeStatus, GroupRole } from './constants'

export interface User {
  id: string
  phone?: string | null
  email?: string | null
  username: string
  display_name?: string | null
  avatar_url?: string | null
  level: number
  xp: number
  timezone: string
  created_at: string
}

export interface UserStats {
  total_challenges: number
  total_checkins: number
  current_streaks: number
  challenges_won: number
  challenges_completed: number
}

export interface Group {
  id: string
  name: string
  avatar_url?: string | null
  created_by: string
  invite_code: string
  created_at: string
  member_count?: number
  members?: GroupMember[]
  active_challenge?: Challenge | null
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
  user?: User
}

export interface Challenge {
  id: string
  group_id: string
  created_by: string
  title: string
  description?: string | null
  habit_category: HabitCategory
  frequency: ChallengeFrequency
  duration_days: 7 | 30 | 90
  start_date?: string | null
  end_date?: string | null
  reward_description?: string | null
  status: ChallengeStatus
  ghost_mode: boolean
  created_at: string
  participant_count?: number
  my_participation?: ChallengeParticipant | null
}

export interface ChallengeParticipant {
  id: string
  challenge_id: string
  user_id: string
  streak_current: number
  streak_longest: number
  total_checkins: number
  rank?: number | null
  joined_at: string
  user?: User
}

export interface Checkin {
  id: string
  challenge_id: string
  user_id: string
  checked_in_at: string
  photo_url?: string | null
  lat?: number | null
  lng?: number | null
  notes?: string | null
  verified: boolean
  created_at: string
  user?: User
  reactions?: CheckinReaction[]
}

export interface CheckinReaction {
  emoji: string
  user_id: string
  user?: User
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  avatar_url?: string | null
  streak_current: number
  total_checkins: number
  score: number
  is_ghost?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

// API request/response types
export interface CreateGroupBody {
  name: string
  avatar_url?: string
}

export interface CreateChallengeBody {
  group_id: string
  title: string
  description?: string
  habit_category: HabitCategory
  frequency: ChallengeFrequency
  duration_days: 7 | 30 | 90
  reward_description?: string
  ghost_mode?: boolean
  start_date?: string
}

export interface CreateCheckinBody {
  challenge_id: string
  photo_url?: string
  lat?: number
  lng?: number
  notes?: string
}

export interface UpdateUserBody {
  username?: string
  display_name?: string
  avatar_url?: string
  timezone?: string
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export interface UserSearchResult {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  friendship_status: FriendshipStatus
  friendship_id?: string | null
}

export interface Friend {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
}

export interface FriendRequest {
  id: string
  requester: Friend
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
