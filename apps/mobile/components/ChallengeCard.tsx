import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft } from '../constants'
import type { Challenge, ChallengeParticipant } from '@doit/shared'

interface ChallengeCardProps {
  challenge: Challenge & { my_participation?: ChallengeParticipant | null; participant_count?: number }
  showGroup?: boolean
  groupName?: string
}

const STATUS_CONFIG = {
  active: { label: 'Active', bg: Colors.success + '25', text: Colors.success },
  pending: { label: 'Pending', bg: Colors.warning + '25', text: Colors.warning },
  completed: { label: 'Done', bg: Colors.textMuted + '25', text: Colors.textMuted },
  cancelled: { label: 'Cancelled', bg: Colors.error + '25', text: Colors.error },
}

export function ChallengeCard({ challenge, showGroup, groupName }: ChallengeCardProps) {
  const router = useRouter()
  const cat = challenge.habit_category as keyof typeof HABIT_CATEGORY_CONFIG
  const config = HABIT_CATEGORY_CONFIG[cat] ?? HABIT_CATEGORY_CONFIG.custom
  const participation = challenge.my_participation
  const completionPct = participation
    ? Math.min(100, (participation.total_checkins / challenge.duration_days) * 100)
    : 0
  const statusCfg = STATUS_CONFIG[challenge.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/challenge/${challenge.id}`)}
      activeOpacity={0.85}
    >
      {/* Top row: category badge + status */}
      <View style={styles.topRow}>
        <View style={[styles.catBadge, { backgroundColor: config.color + '20' }]}>
          <View style={[styles.catDot, { backgroundColor: config.color }]} />
          <Text style={[styles.catLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>

      {showGroup && groupName && (
        <Text style={styles.groupName}>{groupName}</Text>
      )}

      {/* Reward */}
      {challenge.reward_description && (
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>REWARD</Text>
          <Text style={styles.rewardText} numberOfLines={1}>{challenge.reward_description}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerStat}>{challenge.duration_days}d</Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={styles.footerStat}>{challenge.participant_count ?? 0} participants</Text>
          {challenge.end_date && (
            <>
              <Text style={styles.footerDot}>·</Text>
              <Text style={styles.footerStat}>{formatDaysLeft(challenge.end_date)}</Text>
            </>
          )}
        </View>
        {participation && participation.streak_current > 0 && (
          <Text style={styles.streakText}>{participation.streak_current} streak</Text>
        )}
      </View>

      {/* Progress bar */}
      {participation && challenge.status === 'active' && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${completionPct}%` as `${number}%`, backgroundColor: config.color },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 8,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catDot: { width: 7, height: 7, borderRadius: 3.5 },
  catLabel: { fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  title: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  groupName: { color: Colors.textSecondary, fontSize: 13 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rewardLabel: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  rewardText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  footerStat: { color: Colors.textMuted, fontSize: 12 },
  footerDot: { color: Colors.textMuted, fontSize: 12 },
  streakText: { color: Colors.streakFire, fontWeight: '700', fontSize: 13 },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: { height: '100%', borderRadius: 2 },
})
