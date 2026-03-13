import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { HABIT_CATEGORY_CONFIG } from '../constants'
import type { Group } from '@doit/shared'

const GROUP_COLORS = [
  '#FF7A00', '#FF9A3D', '#CC6200', '#E8A820', '#C8A060', '#8A8070',
]

// Category → icon mapping for the cover area
const CATEGORY_COVER_ICONS: Record<string, string> = {
  gym: 'dumbbell',
  reading: 'book-open-variant',
  sleep: 'sleep',
  diet: 'food-apple',
  study: 'school-outline',
  custom: 'star-outline',
}

function pickColor(name: string): string {
  return GROUP_COLORS[name.charCodeAt(0) % GROUP_COLORS.length]
}

type MemberPreview = {
  user?: { id: string; username: string; display_name?: string | null; avatar_url?: string | null }
}

interface GroupCardProps {
  group: Group & {
    member_count?: number
    my_role?: string
    members?: MemberPreview[]
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
  const memberLabel = memberCount === 1 ? '1 miembro' : `${memberCount} miembros`
  const coverIcon = cat ? (CATEGORY_COVER_ICONS[cat] ?? 'account-group') : 'account-group'

  return (
    <View style={styles.card}>

      {/* ── Cover image area ─────────────────────────────────── */}
      <View style={[styles.cover, { backgroundColor: group.cover_color ?? (groupColor + '22') }]}>
        {group.cover_image ? (
          <Image source={{ uri: group.cover_image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <>
            {/* Decorative circles for depth */}
            {!group.cover_color && (
              <>
                <View style={[styles.coverCircleLg, { backgroundColor: groupColor + '18' }]} />
                <View style={[styles.coverCircleSm, { backgroundColor: groupColor + '28' }]} />
              </>
            )}
            {/* Central icon */}
            <MaterialCommunityIcons name={coverIcon as any} size={52} color={group.cover_color ? '#ffffff88' : groupColor} style={{ opacity: 0.9 }} />
          </>
        )}
        {/* Active badge overlay */}
        {hasChallenge && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>ACTIVO</Text>
          </View>
        )}
      </View>

      {/* ── Card content ─────────────────────────────────────── */}
      <View style={styles.content}>

        {/* Name + member count */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
        </View>
        <View style={styles.membersRow}>
          <MaterialCommunityIcons name="account-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.membersText}>{memberLabel}</Text>
        </View>

        {/* Active challenge pill */}
        {catConfig && group.active_challenge && (
          <View style={[styles.challengePill, { backgroundColor: catConfig.color + '18' }]}>
            <View style={[styles.challengeDot, { backgroundColor: catConfig.color }]} />
            <Text style={[styles.challengePillText, { color: catConfig.color }]} numberOfLines={1}>
              Challenge: {group.active_challenge.title}
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
            <Text style={styles.viewBtnText}>Ver Grupo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id, openInvite: '1' } })}
            activeOpacity={0.85}
          >
            <Text style={styles.inviteBtnText}>Invitar</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // Cover
  cover: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverCircleLg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -40,
  },
  coverCircleSm: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    bottom: -20,
    left: 20,
  },
  activeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface + 'CC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.success + '50',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  activeBadgeText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Content
  content: {
    padding: 14,
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  membersText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // Challenge pill
  challengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  challengeDot: { width: 7, height: 7, borderRadius: 3.5 },
  challengePillText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Actions
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
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
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  inviteBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
})
