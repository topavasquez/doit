import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

interface LeaderboardItemProps {
  rank: number
  username: string
  display_name?: string | null
  avatar_url?: string | null
  streak_current: number
  total_checkins: number
  completion_pct: number
  is_me: boolean
  ghost_mode?: boolean
  level?: number
}

const RANK_COLORS = ['#f0a500', '#9CA3AF', '#CD7C2F']
const RANK_LABELS = ['1st', '2nd', '3rd']

export function LeaderboardItem({
  rank,
  username,
  display_name,
  streak_current,
  total_checkins,
  completion_pct,
  is_me,
  ghost_mode,
}: LeaderboardItemProps) {
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : Colors.textMuted
  const rankLabel = rank <= 3 ? RANK_LABELS[rank - 1] : `#${rank}`
  const barColor = rank === 1 ? Colors.streakGold : is_me ? Colors.primary : Colors.textMuted + '80'

  return (
    <View style={[styles.row, is_me && styles.rowMe]}>
      {/* Rank */}
      <View style={[styles.rankPill, { backgroundColor: rankColor + '20' }]}>
        <Text style={[styles.rankText, { color: rankColor }]}>{rankLabel}</Text>
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, is_me && styles.avatarMe]}>
        <Text style={[styles.avatarText, is_me && styles.avatarTextMe]}>
          {username[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, is_me && styles.nameMe]} numberOfLines={1}>
            {display_name ?? username}
            {is_me ? <Text style={styles.youTag}> (you)</Text> : null}
          </Text>
          {!ghost_mode && (
            <Text style={[styles.checkins, { color: rankColor }]}>
              {total_checkins} {total_checkins === 1 ? 'check-in' : 'check-ins'}
            </Text>
          )}
        </View>
        {!ghost_mode && (
          <>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, completion_pct)}%` as `${number}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{completion_pct.toFixed(0)}% complete</Text>
              {streak_current >= 3 && (
                <Text style={styles.streak}>{streak_current}-day streak</Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    gap: 12,
  },
  rowMe: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '0d',
  },
  rankPill: {
    minWidth: 42,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  rankText: { fontWeight: '800', fontSize: 13 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarMe: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  avatarText: { color: Colors.textSecondary, fontWeight: '800', fontSize: 16 },
  avatarTextMe: { color: '#000' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  nameMe: { color: Colors.primary },
  youTag: { color: Colors.textSecondary, fontWeight: '400', fontSize: 13 },
  checkins: { fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: Colors.textMuted, fontSize: 11 },
  streak: { color: Colors.streakFire, fontSize: 11, fontWeight: '700' },
})
