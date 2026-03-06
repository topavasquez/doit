import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { usersApi, leaderboardApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft } from '../../constants'
import type { Challenge } from '@doit/shared'

type MainTab = 'leaderboard' | 'challenges' | 'history'

const PODIUM_COLORS = ['#f0a500', '#9CA3AF', '#CD7C2F']
const PODIUM_LABELS = ['1st', '2nd', '3rd']

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

// ─── Podium card ────────────────────────────────────────────────────────────
function PodiumCard({ entry, rank }: { entry: LbEntry; rank: 1 | 2 | 3 }) {
  const color = PODIUM_COLORS[rank - 1]
  const isFirst = rank === 1
  return (
    <View style={[podStyles.card, isFirst && podStyles.cardFirst, { borderColor: color + '50' }]}>
      <View style={[podStyles.medalWrap, { backgroundColor: color + '20' }]}>
        <Text style={[podStyles.medalLabel, { color }]}>{PODIUM_LABELS[rank - 1]}</Text>
      </View>
      <View style={[podStyles.avatar, { backgroundColor: color + '22', borderColor: color + '60' }]}>
        <Text style={[podStyles.avatarText, { color }]}>{entry.username[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={podStyles.name} numberOfLines={1}>{entry.display_name ?? entry.username}</Text>
      <Text style={[podStyles.pts, { color }]}>{entry.total_checkins} pts</Text>
    </View>
  )
}

// ─── Leaderboard row (rank 4+) ───────────────────────────────────────────────
function LeaderboardRow({ entry }: { entry: LbEntry }) {
  const barColor = entry.is_me ? Colors.primary : Colors.textMuted + '60'
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
          {entry.is_me ? <Text style={rowStyles.youTag}> (you)</Text> : null}
        </Text>
        <View style={rowStyles.progressTrack}>
          <View
            style={[
              rowStyles.progressFill,
              { width: `${Math.min(100, entry.completion_pct)}%` as `${number}%`, backgroundColor: barColor },
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

// ─── Challenge row ───────────────────────────────────────────────────────────
function ChallengeRow({ challenge, onPress }: { challenge: Challenge; onPress: () => void }) {
  const cfg = HABIT_CATEGORY_CONFIG[challenge.habit_category as keyof typeof HABIT_CATEGORY_CONFIG] ?? HABIT_CATEGORY_CONFIG.custom
  const isActive = challenge.status === 'active'
  return (
    <TouchableOpacity style={chalStyles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[chalStyles.iconWrap, { backgroundColor: cfg.color + '20' }]}>
        <MaterialCommunityIcons name="flag-outline" size={20} color={cfg.color} />
      </View>
      <View style={chalStyles.info}>
        <Text style={chalStyles.title} numberOfLines={1}>{challenge.title}</Text>
        <Text style={[chalStyles.sub, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <View style={[chalStyles.statusBadge, { backgroundColor: isActive ? Colors.success + '22' : Colors.textMuted + '22' }]}>
        <Text style={[chalStyles.statusText, { color: isActive ? Colors.success : Colors.textMuted }]}>
          {isActive ? 'Active' : 'Done'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.iconBox}>
        <MaterialCommunityIcons name={icon as any} size={32} color={Colors.primary} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CompeteScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<MainTab>('leaderboard')
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)

  const { data: challengesData } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
  })

  const challenges = (challengesData?.challenges ?? []) as Challenge[]
  const activeChallenges = challenges.filter((c) => c.status === 'active')
  const completedChallenges = challenges.filter((c) => c.status === 'completed')

  // Auto-select first active challenge
  useEffect(() => {
    if (!challengesData) return
    const active = (challengesData.challenges as Challenge[]).filter((c) => c.status === 'active')
    if (active.length > 0 && !selectedChallengeId) {
      setSelectedChallengeId(active[0].id)
    }
  }, [challengesData, selectedChallengeId])

  const selectedChallenge = activeChallenges.find((c) => c.id === selectedChallengeId) ?? activeChallenges[0]
  const cat = selectedChallenge?.habit_category as keyof typeof HABIT_CATEGORY_CONFIG | undefined
  const catConfig = cat ? HABIT_CATEGORY_CONFIG[cat] : HABIT_CATEGORY_CONFIG.custom

  const { data: lbData } = useQuery({
    queryKey: ['leaderboard', selectedChallenge?.id],
    queryFn: () => leaderboardApi.get(selectedChallenge!.id),
    enabled: !!selectedChallenge?.id && tab === 'leaderboard',
    refetchInterval: 60_000,
  })

  const leaderboard = (lbData?.leaderboard ?? []) as LbEntry[]
  const isGhost = !!lbData?.ghost_mode
  const showPodium = leaderboard.length >= 2 && !isGhost
  const podiumEntries = leaderboard.slice(0, 3)
  const restEntries = leaderboard.slice(3)

  const showBottomSelector = tab === 'leaderboard' && activeChallenges.length > 0

  return (
    <View style={styles.container}>
      {/* Top tabs */}
      <View style={styles.topTabs}>
        {(['leaderboard', 'challenges', 'history'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.topTab, tab === t && styles.topTabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.topTabText, tab === t && styles.topTabTextActive]}>
              {t === 'leaderboard' ? 'Leaderboard' : t === 'challenges' ? 'Challenges' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, showBottomSelector && styles.scrollWithBottom]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Leaderboard tab ────────────────────────────────────── */}
        {tab === 'leaderboard' && (
          <>
            {activeChallenges.length === 0 ? (
              <EmptyState
                icon="trophy-outline"
                title="No active challenges"
                subtitle="Join or create a challenge to start competing"
              />
            ) : (
              <>
                {/* Selected challenge info card */}
                {selectedChallenge && (
                  <View style={[styles.activeCard, { borderLeftColor: catConfig.color }]}>
                    <View style={[styles.activeCardIcon, { backgroundColor: catConfig.color + '20' }]}>
                      <MaterialCommunityIcons name="trophy-outline" size={22} color={catConfig.color} />
                    </View>
                    <View style={styles.activeCardInfo}>
                      <Text style={styles.activeCardTitle} numberOfLines={1}>{selectedChallenge.title}</Text>
                      <Text style={[styles.activeCardSub, { color: catConfig.color }]}>
                        {selectedChallenge.frequency === 'daily' ? 'Daily Challenge' : 'Weekly Challenge'}
                      </Text>
                    </View>
                    {selectedChallenge.end_date && (
                      <View style={styles.daysLeftRow}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.daysLeftText}>{formatDaysLeft(selectedChallenge.end_date)}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Ghost mode banner */}
                {isGhost && (
                  <View style={styles.ghostBanner}>
                    <Text style={styles.ghostText}>Ghost Mode — ranks hidden until the challenge ends</Text>
                  </View>
                )}

                {/* Podium */}
                {showPodium && (
                  <View style={styles.podium}>
                    {podiumEntries[1] && <PodiumCard entry={podiumEntries[1]} rank={2} />}
                    <PodiumCard entry={podiumEntries[0]} rank={1} />
                    {podiumEntries[2] && <PodiumCard entry={podiumEntries[2]} rank={3} />}
                  </View>
                )}

                {/* Leaderboard list */}
                {(showPodium ? restEntries : leaderboard).map((entry) => (
                  <LeaderboardRow key={entry.user_id} entry={entry} />
                ))}

                {leaderboard.length === 0 && (
                  <Text style={styles.emptyInline}>No rankings yet — check-in to appear here</Text>
                )}
              </>
            )}
          </>
        )}

        {/* ── Challenges tab ─────────────────────────────────────── */}
        {tab === 'challenges' && (
          <>
            {activeChallenges.length === 0 ? (
              <EmptyState
                icon="flag-outline"
                title="No active challenges"
                subtitle="Create or join one from a group"
              />
            ) : (
              activeChallenges.map((c) => (
                <ChallengeRow
                  key={c.id}
                  challenge={c}
                  onPress={() => router.push(`/challenge/${c.id}`)}
                />
              ))
            )}
          </>
        )}

        {/* ── History tab ────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {completedChallenges.length === 0 ? (
              <EmptyState
                icon="history"
                title="No history yet"
                subtitle="Completed challenges will appear here"
              />
            ) : (
              completedChallenges.map((c) => (
                <ChallengeRow
                  key={c.id}
                  challenge={c}
                  onPress={() => router.push(`/challenge/${c.id}`)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ── Bottom classification selector ─────────────────────── */}
      {showBottomSelector && (
        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarLabel}>Viewing</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomBarScroll}
          >
            {activeChallenges.map((c) => {
              const isSelected = selectedChallenge?.id === c.id
              const cfg = HABIT_CATEGORY_CONFIG[c.habit_category as keyof typeof HABIT_CATEGORY_CONFIG] ?? HABIT_CATEGORY_CONFIG.custom
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.selectorChip,
                    isSelected && { backgroundColor: cfg.color + '22', borderColor: cfg.color },
                  ]}
                  onPress={() => setSelectedChallengeId(c.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.selectorDot, { backgroundColor: isSelected ? cfg.color : Colors.textMuted }]} />
                  <Text
                    style={[styles.selectorChipText, isSelected && { color: cfg.color }]}
                    numberOfLines={1}
                  >
                    {c.title}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const podStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 7,
  },
  cardFirst: {
    backgroundColor: Colors.surfaceElevated,
    transform: [{ translateY: -10 }],
    paddingTop: 18,
    paddingBottom: 18,
  },
  medalWrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  medalLabel: { fontSize: 12, fontWeight: '800' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: 22, fontWeight: '900' },
  name: { color: Colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  pts: { fontSize: 13, fontWeight: '800' },
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
  rowMe: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '0d' },
  rank: { color: Colors.textMuted, fontSize: 15, fontWeight: '700', minWidth: 26 },
  rankMe: { color: Colors.primary },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
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

const chalStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
})

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 56, gap: 12 },
  iconBox: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  topTabActive: { backgroundColor: Colors.primary },
  topTabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  topTabTextActive: { color: '#000' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  scrollWithBottom: { paddingBottom: 110 },

  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    gap: 12,
  },
  activeCardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  activeCardInfo: { flex: 1 },
  activeCardTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  activeCardSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  daysLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  daysLeftText: { color: Colors.textMuted, fontSize: 12 },

  ghostBanner: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 24,
    paddingTop: 10,
  },

  emptyInline: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 14 },

  // Bottom selector
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  bottomBarLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  bottomBarScroll: { gap: 8 },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    maxWidth: 180,
  },
  selectorDot: { width: 7, height: 7, borderRadius: 3.5 },
  selectorChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
})
