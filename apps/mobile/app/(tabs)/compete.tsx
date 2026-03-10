import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { usersApi, leaderboardApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft } from '../../constants'
import type { Challenge } from '@doit/shared'

// ─── Types ───────────────────────────────────────────────────────────────────

type LbEntry = {
  rank: number
  user_id: string
  username: string
  display_name?: string | null
  streak_current: number
  total_checkins: number
  completion_pct: number
  is_me: boolean
}

// ─── Medal config ─────────────────────────────────────────────────────────────

const MEDALS = [
  { color: '#FF7A00', label: '1°', icon: 'trophy' as const, size: 60, elevated: true },
  { color: '#9A9A9A', label: '2°', icon: 'medal' as const, size: 52, elevated: false },
  { color: '#C8A060', label: '3°', icon: 'medal' as const, size: 52, elevated: false },
]

// ─── Podium card ─────────────────────────────────────────────────────────────

function PodiumCard({ entry, position }: { entry: LbEntry; position: 0 | 1 | 2 }) {
  const medal = MEDALS[position]
  return (
    <View style={[podStyles.wrap, medal.elevated && podStyles.wrapFirst]}>
      {/* Medal badge */}
      <View style={[podStyles.medalBadge, { backgroundColor: medal.color + '22', borderColor: medal.color + '55' }]}>
        <MaterialCommunityIcons name={medal.icon} size={14} color={medal.color} />
        <Text style={[podStyles.medalLabel, { color: medal.color }]}>{medal.label}</Text>
      </View>

      {/* Avatar */}
      <View style={[
        podStyles.avatar,
        { backgroundColor: medal.color + '22', borderColor: medal.color },
        medal.elevated && podStyles.avatarFirst,
      ]}>
        <Text style={[podStyles.avatarText, { color: medal.color, fontSize: medal.elevated ? 26 : 22 }]}>
          {entry.username[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      {/* Name */}
      <Text style={podStyles.name} numberOfLines={1}>
        {entry.display_name ?? entry.username}
        {entry.is_me ? <Text style={podStyles.youTag}> (tú)</Text> : null}
      </Text>

      {/* Points */}
      <View style={[podStyles.ptsBadge, { backgroundColor: medal.color + '18' }]}>
        <Text style={[podStyles.ptsText, { color: medal.color }]}>{entry.total_checkins}</Text>
        <Text style={[podStyles.ptsLabel, { color: medal.color + 'aa' }]}>pts</Text>
      </View>
    </View>
  )
}

// ─── Leaderboard row (rank 4+) ───────────────────────────────────────────────

function LeaderboardRow({ entry }: { entry: LbEntry }) {
  return (
    <View style={[rowStyles.row, entry.is_me && rowStyles.rowMe]}>
      <Text style={[rowStyles.rank, entry.is_me && rowStyles.rankMe]}>#{entry.rank}</Text>

      <View style={[rowStyles.avatar, entry.is_me && rowStyles.avatarMe]}>
        <Text style={[rowStyles.avatarText, entry.is_me && rowStyles.avatarTextMe]}>
          {entry.username[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>

      <View style={rowStyles.info}>
        <Text style={[rowStyles.name, entry.is_me && rowStyles.nameMe]} numberOfLines={1}>
          {entry.display_name ?? entry.username}
          {entry.is_me ? <Text style={rowStyles.youTag}> (tú)</Text> : null}
        </Text>
        <View style={rowStyles.progressTrack}>
          <View
            style={[
              rowStyles.progressFill,
              {
                width: `${Math.min(100, entry.completion_pct)}%` as `${number}%`,
                backgroundColor: entry.is_me ? Colors.primary : Colors.textMuted + '60',
              },
            ]}
          />
        </View>
      </View>

      <Text style={[rowStyles.pts, entry.is_me && { color: Colors.primary }]}>
        {entry.total_checkins} pts
      </Text>
    </View>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconBox}>
        <MaterialCommunityIcons name="trophy-outline" size={36} color={Colors.primary} />
      </View>
      <Text style={emptyStyles.title}>Sin retos activos</Text>
      <Text style={emptyStyles.subtitle}>Únete o crea un reto desde un grupo para competir</Text>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CompeteScreen() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: challengesData, isLoading: challengesLoading } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
  })

  const challenges = (challengesData?.challenges ?? []) as Challenge[]
  const activeChallenges = challenges.filter((c) => c.status === 'active')

  // Auto-select first active challenge (dep on first challenge id so it re-runs if the list changes)
  useEffect(() => {
    if (activeChallenges.length > 0 && !selectedId) {
      setSelectedId(activeChallenges[0].id)
    }
  }, [activeChallenges[0]?.id])

  const selected = activeChallenges.find((c) => c.id === selectedId) ?? activeChallenges[0]
  const cat = selected?.habit_category as keyof typeof HABIT_CATEGORY_CONFIG | undefined
  const catCfg = cat ? HABIT_CATEGORY_CONFIG[cat] : HABIT_CATEGORY_CONFIG.custom

  const {
    data: lbData,
    isLoading: lbLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['leaderboard', selected?.id],
    queryFn: () => leaderboardApi.get(selected!.id),
    enabled: !!selected?.id,
    staleTime: 30_000,
    refetchInterval: 120_000,
  })

  const leaderboard = (lbData?.leaderboard ?? []) as LbEntry[]
  const isGhost = !!lbData?.ghost_mode

  // Podium order: 2nd | 1st | 3rd
  const top3 = leaderboard.slice(0, 3)
  const podiumOrder: (LbEntry | undefined)[] = [top3[1], top3[0], top3[2]]
  const podiumPositions: (0 | 1 | 2)[] = [1, 0, 2]
  const restEntries = leaderboard.slice(3)

  const showPodium = leaderboard.length >= 2 && !isGhost

  if (challengesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  if (activeChallenges.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ── Challenge selector ────────────────────────────────── */}
      <View style={styles.selectorWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {activeChallenges.map((c) => {
            const cfg = HABIT_CATEGORY_CONFIG[c.habit_category as keyof typeof HABIT_CATEGORY_CONFIG] ?? HABIT_CATEGORY_CONFIG.custom
            const active = selected?.id === c.id
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  active && { backgroundColor: cfg.color + '22', borderColor: cfg.color },
                ]}
                onPress={() => setSelectedId(c.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: active ? cfg.color : Colors.textMuted }]} />
                <Text style={[styles.chipText, active && { color: cfg.color }]} numberOfLines={1}>
                  {c.title}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Challenge header ──────────────────────────────────── */}
        {selected && (
          <View style={[styles.challengeHeader, { borderLeftColor: catCfg.color }]}>
            <View style={[styles.challengeIconWrap, { backgroundColor: catCfg.color + '20' }]}>
              <MaterialCommunityIcons name="flag-checkered" size={20} color={catCfg.color} />
            </View>
            <View style={styles.challengeHeaderInfo}>
              <Text style={styles.challengeTitle}>{selected.title}</Text>
              <View style={styles.challengeMeta}>
                <View style={[styles.categoryDot, { backgroundColor: catCfg.color }]} />
                <Text style={[styles.categoryLabel, { color: catCfg.color }]}>{catCfg.label}</Text>
                {selected.end_date && (
                  <>
                    <Text style={styles.metaSep}>·</Text>
                    <Text style={styles.daysLeft}>{formatDaysLeft(selected.end_date)}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Ghost mode banner ─────────────────────────────────── */}
        {isGhost && (
          <View style={styles.ghostBanner}>
            <MaterialCommunityIcons name="ghost-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.ghostText}>Modo Fantasma — clasificación oculta hasta que termine el reto</Text>
          </View>
        )}

        {/* ── Loading leaderboard ───────────────────────────────── */}
        {lbLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}

        {/* ── Podium top 3 ─────────────────────────────────────── */}
        {!lbLoading && showPodium && (
          <>
            <Text style={styles.sectionLabel}>TOP 3</Text>
            <View style={styles.podium}>
              {podiumOrder.map((entry, i) =>
                entry ? (
                  <PodiumCard key={entry.user_id} entry={entry} position={podiumPositions[i]} />
                ) : (
                  <View key={i} style={podStyles.wrap} />
                )
              )}
            </View>
          </>
        )}

        {/* ── Rest of the leaderboard ───────────────────────────── */}
        {!lbLoading && restEntries.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>CLASIFICACIÓN</Text>
            {restEntries.map((entry) => (
              <LeaderboardRow key={entry.user_id} entry={entry} />
            ))}
          </>
        )}

        {/* ── Empty leaderboard ─────────────────────────────────── */}
        {!lbLoading && leaderboard.length === 0 && (
          <View style={styles.emptyInlineWrap}>
            <MaterialCommunityIcons name="timer-sand" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyInline}>Sin clasificación aún</Text>
            <Text style={styles.emptyInlineSub}>Haz check-in para aparecer aquí</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const podStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  wrapFirst: {
    transform: [{ translateY: -16 }],
  },
  medalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  medalLabel: { fontSize: 11, fontWeight: '800' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarFirst: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarText: { fontWeight: '900' },
  name: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 90,
  },
  youTag: { color: Colors.textMuted, fontWeight: '400', fontSize: 11 },
  ptsBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ptsText: { fontSize: 16, fontWeight: '900' },
  ptsLabel: { fontSize: 11, fontWeight: '600' },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  rowMe: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '0d',
  },
  rank: { color: Colors.textMuted, fontSize: 15, fontWeight: '700', minWidth: 26 },
  rankMe: { color: Colors.primary },
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
  avatarMe: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  avatarText: { color: Colors.textSecondary, fontWeight: '800', fontSize: 15 },
  avatarTextMe: { color: '#000' },
  info: { flex: 1 },
  name: { color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 6 },
  nameMe: { color: Colors.primary },
  youTag: { color: Colors.textSecondary, fontWeight: '400', fontSize: 13 },
  progressTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  pts: { color: Colors.text, fontWeight: '800', fontSize: 14 },
})

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 80,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  // Challenge selector
  selectorWrap: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectorScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxWidth: 200,
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  // Challenge header card
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    gap: 12,
  },
  challengeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeHeaderInfo: { flex: 1 },
  challengeTitle: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  challengeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  categoryDot: { width: 7, height: 7, borderRadius: 3.5 },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  metaSep: { color: Colors.textMuted, fontSize: 12 },
  daysLeft: { color: Colors.textMuted, fontSize: 12 },

  // Ghost banner
  ghostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },

  // Section labels
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },

  // Podium
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 36,
    paddingTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Empty inline
  emptyInlineWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyInline: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  emptyInlineSub: { color: Colors.textMuted, fontSize: 13 },
})
