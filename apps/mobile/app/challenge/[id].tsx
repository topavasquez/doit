import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { challengesApi, checkinsApi, leaderboardApi } from '../../lib/api'
import { LeaderboardItem } from '../../components/LeaderboardItem'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft, formatRelativeTime } from '../../constants'
import { useAuth } from '../../hooks/useAuth'
import type { Challenge, ChallengeParticipant, Checkin } from '@doit/shared'

type Tab = 'leaderboard' | 'activity'

const PODIUM_COLORS = ['#f0a500', '#9CA3AF', '#CD7C2F']
const PODIUM_LABELS = ['1°', '2°', '3°']

type LbEntry = {
  rank: number; user_id: string; username: string; display_name?: string | null
  streak_current: number; total_checkins: number; completion_pct: number; is_me: boolean
}

function PodiumCard({ entry, rank, ghost_mode }: { entry: LbEntry; rank: 1 | 2 | 3; ghost_mode?: boolean }) {
  const color = PODIUM_COLORS[rank - 1]
  const isFirst = rank === 1
  return (
    <View style={[podStyles.card, isFirst && podStyles.cardFirst, { borderColor: color + '50' }]}>
      <View style={[podStyles.medalWrap, { backgroundColor: color + '20' }]}>
        <Text style={[podStyles.medalText, { color }]}>{PODIUM_LABELS[rank - 1]}</Text>
      </View>
      <View style={[podStyles.avatar, { backgroundColor: color + '25', borderColor: color + '50' }]}>
        <Text style={[podStyles.avatarText, { color }]}>
          {entry.username[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={podStyles.name} numberOfLines={1}>{entry.display_name ?? entry.username}</Text>
      {!ghost_mode && (
        <Text style={[podStyles.pts, { color }]}>{entry.total_checkins} pts</Text>
      )}
    </View>
  )
}

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard')

  const { data: challengeData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => challengesApi.get(id),
  })

  const { data: lbData, refetch: refetchLb } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: () => leaderboardApi.get(id),
    enabled: !!id,
    refetchInterval: 60_000,
  })

  const { data: checkinsData, refetch: refetchCheckins } = useQuery({
    queryKey: ['checkins', id],
    queryFn: () => checkinsApi.list(id, undefined, 20),
    enabled: activeTab === 'activity',
  })

  const challenge = challengeData?.challenge as (Challenge & { group?: { name: string } }) | undefined
  const myParticipation = challengeData?.my_participation as ChallengeParticipant | null

  const cat = challenge?.habit_category as keyof typeof HABIT_CATEGORY_CONFIG | undefined
  const catConfig = cat ? HABIT_CATEGORY_CONFIG[cat] : HABIT_CATEGORY_CONFIG.custom

  const leaderboard = (lbData?.leaderboard ?? []) as LbEntry[]
  const checkins = (checkinsData?.checkins ?? []) as (Checkin & { user?: { username: string } })[]

  const hasCheckedInToday = challengeData?.has_checked_in_today ?? false

  if (isLoading || !challenge) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando reto...</Text>
      </View>
    )
  }

  const daysLeft = challenge.end_date ? formatDaysLeft(challenge.end_date) : `${challenge.duration_days}d`
  const isGhost = lbData?.ghost_mode

  // Build podium: arrange as [2nd, 1st, 3rd] for display
  const podiumEntries = leaderboard.slice(0, 3)
  const restEntries = leaderboard.slice(3)
  const showPodium = podiumEntries.length >= 2 && !isGhost

  return (
    <>
      <Stack.Screen options={{ title: challenge.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); refetchLb(); refetchCheckins() }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header card */}
        <View style={[styles.headerCard, { borderLeftColor: catConfig.color }]}>
          <View style={styles.headerTop}>
            <View style={[styles.catBadge, { backgroundColor: catConfig.color + '20' }]}>
              <View style={[styles.catDot, { backgroundColor: catConfig.color }]} />
              <Text style={[styles.catLabel, { color: catConfig.color }]}>{catConfig.label}</Text>
            </View>
            <Text style={styles.daysLeft}>{daysLeft}</Text>
          </View>

          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          {challenge.description && (
            <Text style={styles.description}>{challenge.description}</Text>
          )}

          {challenge.reward_description && (
            <View style={styles.rewardBox}>
              <Text style={styles.rewardLabel}>RECOMPENSA</Text>
              <Text style={styles.rewardText}>{challenge.reward_description}</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>{challenge.frequency === 'daily' ? 'Diario' : 'Semanal'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaItem}>{challenge.duration_days} days</Text>
            {challenge.ghost_mode && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaItem}>Modo Fantasma</Text>
              </>
            )}
          </View>
        </View>

        {/* Check-in */}
        {challenge.status === 'active' && myParticipation && (
          <View style={styles.checkinSection}>
            {hasCheckedInToday ? (
              <View style={styles.doneContainer}>
                <View style={styles.doneButton}>
                  <Text style={styles.doneIcon}>✓</Text>
                  <Text style={styles.doneText}>Ya hiciste check-in hoy</Text>
                </View>
                {myParticipation.streak_current > 0 && (
                  <Text style={styles.streakLabel}>{myParticipation.streak_current} dias de racha</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.doItBtn}
                onPress={() => router.push({
                  pathname: '/challenge/photo-checkin',
                  params: { challengeId: id, challengeTitle: challenge.title, groupId: challenge.group_id },
                })}
                activeOpacity={0.85}
              >
                <Text style={styles.doItText}>Do It</Text>
                {myParticipation.streak_current > 0 && (
                  <Text style={styles.doItStreak}>{myParticipation.streak_current}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Clasificación</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Actividad</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard */}
        {activeTab === 'leaderboard' && (
          <View>
            {isGhost && (
              <View style={styles.ghostBanner}>
                <Text style={styles.ghostText}>Modo Fantasma — rangos ocultos hasta que el reto termine</Text>
              </View>
            )}

            {/* Podium for top 3 */}
            {showPodium && (
              <View style={styles.podium}>
                {podiumEntries[1] && (
                  <PodiumCard entry={podiumEntries[1]} rank={2} ghost_mode={isGhost} />
                )}
                <PodiumCard entry={podiumEntries[0]} rank={1} ghost_mode={isGhost} />
                {podiumEntries[2] && (
                  <PodiumCard entry={podiumEntries[2]} rank={3} ghost_mode={isGhost} />
                )}
              </View>
            )}

            {/* Rest of leaderboard */}
            {(showPodium ? restEntries : leaderboard).map((entry) => (
              <LeaderboardItem
                key={entry.user_id}
                rank={entry.rank}
                username={entry.username}
                display_name={entry.display_name}
                streak_current={entry.streak_current}
                total_checkins={entry.total_checkins}
                completion_pct={entry.completion_pct}
                is_me={entry.user_id === user?.id}
                ghost_mode={isGhost}
              />
            ))}

            {leaderboard.length === 0 && (
              <Text style={styles.emptyText}>Sin participantes aún</Text>
            )}
          </View>
        )}

        {/* Activity */}
        {activeTab === 'activity' && (
          <View>
            {checkins.length === 0 ? (
              <Text style={styles.emptyText}>Sin check-ins aún. ¡Sé el primero!</Text>
            ) : (
              checkins.map((c) => (
                <View key={c.id} style={styles.activityItem}>
                  <View style={styles.activityAvatar}>
                    <Text style={styles.activityAvatarText}>
                      {c.user?.username?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>
                      <Text style={styles.activityUsername}>{c.user?.username}</Text>
                      {' hizo check-in'}
                      {c.notes ? ` — "${c.notes}"` : ''}
                    </Text>
                    {c.photo_url && (
                      <Image source={{ uri: c.photo_url }} style={styles.activityPhoto} resizeMode="cover" />
                    )}
                    <Text style={styles.activityTime}>{formatRelativeTime(c.checked_in_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </>
  )
}

const podStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 6,
  },
  cardFirst: {
    backgroundColor: Colors.surfaceElevated,
    transform: [{ translateY: -8 }],
    paddingTop: 16,
    paddingBottom: 16,
  },
  medalWrap: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  medalText: { fontSize: 12, fontWeight: '800' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  name: { color: Colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  pts: { fontSize: 13, fontWeight: '800' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary },

  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    marginBottom: 20,
    gap: 8,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  catDot: { width: 7, height: 7, borderRadius: 3.5 },
  catLabel: { fontSize: 12, fontWeight: '700' },
  daysLeft: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  challengeTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  description: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
  },
  rewardLabel: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, paddingTop: 1 },
  rewardText: { color: Colors.text, fontSize: 14, flex: 1, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { color: Colors.textMuted, fontSize: 13 },
  metaDot: { color: Colors.textMuted },

  checkinSection: { marginBottom: 24 },
  doItBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  doItText: { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  doItStreak: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  doneContainer: { alignItems: 'center', gap: 8 },
  doneButton: {
    backgroundColor: Colors.success + '22',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.success + '44',
    width: '100%',
  },
  doneIcon: { fontSize: 22, color: Colors.success },
  doneText: { color: Colors.success, fontSize: 17, fontWeight: '700' },
  streakLabel: { color: Colors.streakFire, fontWeight: '700', fontSize: 16 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },

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
    marginBottom: 20,
    paddingTop: 8,
  },

  emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 40, fontSize: 15 },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  activityInfo: { flex: 1 },
  activityText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  activityUsername: { color: Colors.text, fontWeight: '700' },
  activityPhoto: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  activityTime: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
})
