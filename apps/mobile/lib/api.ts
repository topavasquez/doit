import { supabase } from './supabase'
import { API_URL } from '../constants'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader()

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new ApiError(response.status, error.message ?? 'Request failed', error)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Auth
export const authApi = {
  syncUser: (body: { username: string; display_name?: string; timezone?: string }) =>
    request<{ user: unknown; created: boolean }>('/auth/sync-user', { method: 'POST', body: JSON.stringify(body) }),

  checkUsername: (username: string) =>
    request<{ available: boolean }>('/auth/check-username', { method: 'POST', body: JSON.stringify({ username }) }),

  me: () => request<{ user: unknown }>('/auth/me'),
}

// Users
export const usersApi = {
  getUser: (id: string) => request<{ user: unknown }>(`/users/${id}`),
  getStats: (id: string) => request<{ stats: unknown }>(`/users/${id}/stats`),
  updateUser: (id: string, body: object) =>
    request<{ user: unknown }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getChallenges: (id: string, status?: string) =>
    request<{ challenges: unknown[] }>(`/users/${id}/challenges${status ? `?status=${status}` : ''}`),
}

// Groups
export const groupsApi = {
  list: () => request<{ groups: unknown[] }>('/groups'),
  get: (id: string) => request<{ group: unknown; my_role: string }>(`/groups/${id}`),
  create: (body: { name: string; avatar_url?: string }) =>
    request<{ group: unknown }>('/groups', { method: 'POST', body: JSON.stringify(body) }),
  join: (inviteCode: string) =>
    request<{ group: unknown }>(`/groups/join/${inviteCode}`, { method: 'POST' }),
  getInvite: (id: string) =>
    request<{ invite_code: string; invite_link: string }>(`/groups/${id}/invite`, { method: 'POST' }),
  removeMember: (groupId: string, userId: string) =>
    request<void>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  getFeed: (id: string, limit = 30, offset = 0) =>
    request<{ checkins: unknown[]; total: number }>(`/groups/${id}/feed?limit=${limit}&offset=${offset}`),
}

// Challenges
export async function uploadCheckinPhoto(uri: string, mimeType = 'image/jpeg', base64?: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const extMatch = uri.split('?')[0].match(/\.([a-zA-Z]{2,5})$/)
  const ext = extMatch ? extMatch[1].toLowerCase() : (mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg')
  const filename = `${session.user.id}/${Date.now()}.${ext}`

  if (base64) {
    // Decode base64 → Uint8Array and upload via Supabase JS client (most reliable in RN)
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const { error } = await supabase.storage
      .from('checkin-photos')
      .upload(filename, bytes, { contentType: mimeType, upsert: false })
    if (error) throw new Error(error.message)
  } else {
    // Fallback: FormData REST upload
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
    const formData = new FormData()
    formData.append('file', { uri, name: filename, type: mimeType } as any)
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/checkin-photos/${filename}`,
      { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? `Upload failed (${res.status})`)
    }
  }

  const { data } = supabase.storage.from('checkin-photos').getPublicUrl(filename)
  return data.publicUrl
}

export const challengesApi = {
  get: (id: string) => request<{ challenge: unknown; my_participation: unknown; has_checked_in_today: boolean }>(`/challenges/${id}`),
  create: (body: object) =>
    request<{ challenge: unknown }>('/challenges', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: object) =>
    request<{ challenge: unknown }>(`/challenges/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  start: (id: string) =>
    request<{ challenge: unknown }>(`/challenges/${id}/start`, { method: 'POST' }),
  cancel: (id: string) =>
    request<{ challenge: unknown }>(`/challenges/${id}/cancel`, { method: 'POST' }),
  join: (id: string) =>
    request<{ participant: unknown }>(`/challenges/${id}/join`, { method: 'POST' }),
}

// Checkins
export const checkinsApi = {
  create: (body: { challenge_id: string; photo_url?: string; lat?: number; lng?: number; notes?: string }) =>
    request<{ checkin: unknown; streak: number; total_checkins: number }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  list: (challengeId: string, userId?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams({ challengeId })
    if (userId) params.set('userId', userId)
    if (limit) params.set('limit', String(limit))
    if (offset) params.set('offset', String(offset))
    return request<{ checkins: unknown[]; total: number }>(`/checkins?${params}`)
  },
  react: (id: string, emoji: string) =>
    request<{ reactions: unknown[] }>(`/checkins/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
}

// Leaderboard
export const leaderboardApi = {
  get: (challengeId: string) =>
    request<{ leaderboard: unknown[]; ghost_mode: boolean; days_elapsed: number; total_expected: number }>(
      `/leaderboard/${challengeId}`
    ),
}

// Notifications
export const notificationsApi = {
  list: (userId: string, unreadOnly?: boolean) =>
    request<{ notifications: unknown[]; unread_count: number }>(
      `/notifications/${userId}${unreadOnly ? '?unread_only=true' : ''}`
    ),
  markRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<void>('/notifications/mark-all-read', { method: 'PATCH' }),
}
