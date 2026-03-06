import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { HABIT_CATEGORY_CONFIG } from '../constants'
import type { Group } from '@doit/shared'

const GROUP_COLORS = [
  Colors.primary, '#3B82F6', '#8B5CF6', '#22C55E', '#f0a500', '#EC4899',
]
const AVATAR_TINTS = ['#4B5563', '#374151', '#6B7280', '#1F2937', '#9CA3AF']

function pickColor(name: string): string {
  return GROUP_COLORS[name.charCodeAt(0) % GROUP_COLORS.length]
}

interface GroupCardProps {
  group: Group & {
    member_count?: number
    my_role?: string
    active_challenge?: { id: string; title: string; habit_category: string; end_date?: string | null } | null
  }
}

export function GroupCard({ group }: GroupCardProps) {
  const router = useRouter()
  const cat = group.active_challenge?.habit_category as keyof typeof HABIT_CATEGORY_CONFIG | undefined
  const catConfig = cat ? HABIT_CATEGORY_CONFIG[cat] : null
  const groupColor = pickColor(group.name)
  const memberCount = group.member_count ?? 0
  const hasChallenge = !!group.active_challenge

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: groupColor + '22' }]}>
          <Text style={[styles.avatarText, { color: groupColor }]}>
            {group.name[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.meta}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={[styles.statusBadge, hasChallenge ? styles.statusActive : styles.statusIdle]}>
          {hasChallenge && <View style={styles.statusDot} />}
          <Text style={[styles.statusText, hasChallenge ? styles.statusTextActive : styles.statusTextIdle]}>
            {hasChallenge ? 'Active' : 'Idle'}
          </Text>
        </View>
      </View>

      {/* Member avatar bubbles */}
      {memberCount > 0 && (
        <View style={styles.memberRow}>
          {Array.from({ length: Math.min(memberCount, 5) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.memberBubble,
                { marginLeft: i === 0 ? 0 : -9, zIndex: 10 - i, backgroundColor: AVATAR_TINTS[i % AVATAR_TINTS.length] },
              ]}
            />
          ))}
          {memberCount > 5 && (
            <View style={[styles.memberBubble, styles.memberBubbleExtra, { marginLeft: -9 }]}>
              <Text style={styles.memberBubbleExtraText}>+{memberCount - 5}</Text>
            </View>
          )}
          <Text style={styles.memberCountLabel}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Active challenge pill */}
      {catConfig && group.active_challenge && (
        <View style={[styles.challengePill, { backgroundColor: catConfig.color + '18' }]}>
          <View style={[styles.challengeDot, { backgroundColor: catConfig.color }]} />
          <Text style={[styles.challengePillText, { color: catConfig.color }]} numberOfLines={1}>
            {group.active_challenge.title}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: groupColor }]}
          onPress={() => router.push(`/group/${group.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.viewBtnText}>View Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => router.push(`/group/${group.id}`)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-plus-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 20 },
  headerInfo: { flex: 1 },
  name: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusActive: { backgroundColor: Colors.success + '20' },
  statusIdle: { backgroundColor: Colors.border },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextActive: { color: Colors.success },
  statusTextIdle: { color: Colors.textMuted },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  memberBubbleExtra: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBubbleExtraText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  memberCountLabel: { color: Colors.textMuted, fontSize: 12, marginLeft: 10 },
  challengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  challengeDot: { width: 7, height: 7, borderRadius: 3.5 },
  challengePillText: { fontSize: 13, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  inviteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  inviteBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
})
