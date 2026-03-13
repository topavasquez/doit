import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, ActivityIndicator, ImageStyle, Modal, Alert, Dimensions, SafeAreaView, Platform } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { challengesApi, checkinsApi, leaderboardApi } from '../../lib/api'
import { LeaderboardItem } from '../../components/LeaderboardItem'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft, formatRelativeTime } from '../../constants'
import { useAuth } from '../../hooks/useAuth'
import type { Challenge, ChallengeParticipant, Checkin } from '@doit/shared'

type Tab = 'leaderboard' | 'activity' | 'progress'

const PODIUM_COLORS = ['#f0a500', '#9CA3AF', '#CD7C2F']
const PODIUM_LABELS = ['1°', '2°', '3°']

type LbEntry = {
  rank: number; user_id: string; username: string; display_name?: string | null; avatar_url?: string | null
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
      {entry.avatar_url ? (
        <Image source={{ uri: entry.avatar_url }} style={[podStyles.avatar, { borderColor: color + '50' }] as ImageStyle} />
      ) : (
        <View style={[podStyles.avatar, { backgroundColor: color + '25', borderColor: color + '50' }]}>
          <Text style={[podStyles.avatarText, { color }]}>
            {entry.username[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
      <Text style={podStyles.name} numberOfLines={1}>{entry.display_name ?? entry.username}</Text>
      {!ghost_mode && (
        <Text style={[podStyles.pts, { color }]}>{entry.total_checkins} pts</Text>
      )}
    </View>
  )
}

// ─── Personal Progress View ───────────────────────────────────────────────────

type PersonalProgressViewProps = {
  challenge: Challenge & { group?: { name: string } }
  myParticipation: ChallengeParticipant | null
  checkins: (Checkin & { user?: { username: string } })[]
}

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function PersonalProgressView({ challenge, myParticipation, checkins }: PersonalProgressViewProps) {
  const streakCurrent = myParticipation?.streak_current ?? 0
  const streakLongest = myParticipation?.streak_longest ?? 0
  const totalCheckins = myParticipation?.total_checkins ?? 0
  const durationDays = challenge.duration_days ?? 30

  // Build set of checked-in calendar dates
  const checkedDates = new Set(
    checkins.map((c) => {
      const d = new Date(c.checked_in_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  // Build array of all challenge days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = challenge.start_date ? new Date(challenge.start_date) : today
  startDate.setHours(0, 0, 0, 0)

  const days: { date: Date; done: boolean; isToday: boolean; isFuture: boolean }[] = []
  for (let i = 0; i < durationDays; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const isToday = d.getTime() === today.getTime()
    const isFuture = d.getTime() > today.getTime()
    days.push({ date: d, done: checkedDates.has(key), isToday, isFuture })
  }

  const completionPct = durationDays > 0 ? Math.round((totalCheckins / durationDays) * 100) : 0

  return (
    <View style={ppStyles.container}>
      {/* Stats comparison */}
      <View style={ppStyles.statsRow}>
        <View style={ppStyles.statCard}>
          <MaterialCommunityIcons name="fire" size={22} color={Colors.streakFire} />
          <Text style={ppStyles.statValue}>{streakCurrent}</Text>
          <Text style={ppStyles.statLabel}>Racha actual</Text>
        </View>
        <View style={ppStyles.statDivider} />
        <View style={ppStyles.statCard}>
          <MaterialCommunityIcons name="trophy-outline" size={22} color={Colors.primary} />
          <Text style={ppStyles.statValue}>{streakLongest}</Text>
          <Text style={ppStyles.statLabel}>Mejor racha</Text>
        </View>
        <View style={ppStyles.statDivider} />
        <View style={ppStyles.statCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={22} color={Colors.primary} />
          <Text style={ppStyles.statValue}>{completionPct}%</Text>
          <Text style={ppStyles.statLabel}>Completado</Text>
        </View>
      </View>

      {/* Streak bar comparison */}
      {streakLongest > 0 && (
        <View style={ppStyles.compareCard}>
          <Text style={ppStyles.compareTitle}>RACHA ACTUAL VS RÉCORD</Text>
          <View style={ppStyles.compareRow}>
            <Text style={ppStyles.compareLabel}>Ahora</Text>
            <View style={ppStyles.barTrack}>
              <View
                style={[
                  ppStyles.barFill,
                  {
                    width: `${Math.round((streakCurrent / streakLongest) * 100)}%` as `${number}%`,
                    backgroundColor: Colors.streakFire,
                  },
                ]}
              />
            </View>
            <Text style={ppStyles.compareNum}>{streakCurrent}</Text>
          </View>
          <View style={ppStyles.compareRow}>
            <Text style={ppStyles.compareLabel}>Récord</Text>
            <View style={ppStyles.barTrack}>
              <View
                style={[
                  ppStyles.barFill,
                  { width: '100%' as `${number}%`, backgroundColor: Colors.primary + '60' },
                ]}
              />
            </View>
            <Text style={ppStyles.compareNum}>{streakLongest}</Text>
          </View>
        </View>
      )}

      {/* Calendar grid */}
      <View style={ppStyles.calendarCard}>
        <Text style={ppStyles.calendarTitle}>DÍAS DEL RETO</Text>
        <View style={ppStyles.calendarGrid}>
          {days.map((item, idx) => {
            const dayLabel = DAY_LABELS[item.date.getDay()]
            return (
              <View key={idx} style={ppStyles.dayCell}>
                <View
                  style={[
                    ppStyles.dayCircle,
                    item.done && ppStyles.dayCircleDone,
                    item.isToday && !item.done && ppStyles.dayCircleToday,
                    item.isFuture && ppStyles.dayCircleFuture,
                  ]}
                >
                  {item.done ? (
                    <MaterialCommunityIcons name="check" size={12} color="#000" />
                  ) : (
                    <Text
                      style={[
                        ppStyles.dayNum,
                        item.isToday && ppStyles.dayNumToday,
                        item.isFuture && ppStyles.dayNumFuture,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text style={ppStyles.dayLabel}>{dayLabel}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const ppStyles = StyleSheet.create({
  container: { gap: 16 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  compareCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  compareTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compareLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', width: 44 },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5 },
  compareNum: { color: Colors.text, fontSize: 13, fontWeight: '800', width: 24, textAlign: 'right' },

  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    marginBottom: 8,
  },
  calendarTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: { alignItems: 'center', gap: 3 },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayCircleToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayCircleFuture: {
    opacity: 0.35,
  },
  dayNum: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  dayNumToday: { color: Colors.primary },
  dayNumFuture: { color: Colors.textMuted },
  dayLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '600' },
})

export default function ChallengeScreen() {
  const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: Tab }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab | null>(
    initialTab === 'activity' ? 'activity' : null
  )
  const [photoModal, setPhotoModal] = useState<{ uri: string; username: string } | null>(null)
  const [sharing, setSharing] = useState(false)
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

  async function handleSharePhoto(remoteUri: string) {
    if (sharing) return
    setSharing(true)
    try {
      const ext = remoteUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const localUri = `${FileSystem.cacheDirectory}doit_share_${Date.now()}.${ext}`
      const { uri } = await FileSystem.downloadAsync(remoteUri, localUri)
      await Sharing.shareAsync(uri, { mimeType, UTI: 'public.image', dialogTitle: 'Compartir foto de DoIt' })
    } catch (err) {
      Alert.alert('Error al compartir', err instanceof Error ? err.message : String(err))
    } finally {
      setSharing(false)
    }
  }

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
    enabled: !!id,
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const isPersonal = !challenge?.group_id
  const effectiveTab: Tab = activeTab ?? (isPersonal ? 'progress' : 'leaderboard')

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
          {isPersonal ? (
            <>
              <TouchableOpacity
                style={[styles.tab, effectiveTab === 'progress' && styles.tabActive]}
                onPress={() => setActiveTab('progress')}
              >
                <Text style={[styles.tabText, effectiveTab === 'progress' && styles.tabTextActive]}>Mi Progreso</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, effectiveTab === 'activity' && styles.tabActive]}
                onPress={() => setActiveTab('activity')}
              >
                <Text style={[styles.tabText, effectiveTab === 'activity' && styles.tabTextActive]}>Actividad</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.tab, effectiveTab === 'leaderboard' && styles.tabActive]}
                onPress={() => setActiveTab('leaderboard')}
              >
                <Text style={[styles.tabText, effectiveTab === 'leaderboard' && styles.tabTextActive]}>Clasificación</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, effectiveTab === 'activity' && styles.tabActive]}
                onPress={() => setActiveTab('activity')}
              >
                <Text style={[styles.tabText, effectiveTab === 'activity' && styles.tabTextActive]}>Actividad</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Leaderboard */}
        {effectiveTab === 'leaderboard' && (
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
                avatar_url={entry.avatar_url}
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

        {/* Personal Progress Tab */}
        {effectiveTab === 'progress' && isPersonal && (
          <PersonalProgressView
            challenge={challenge}
            myParticipation={myParticipation}
            checkins={checkins}
          />
        )}

        {/* Activity */}
        {effectiveTab === 'activity' && (
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
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setPhotoModal({ uri: c.photo_url!, username: c.user?.username ?? '' })}
                      >
                        <Image source={{ uri: c.photo_url }} style={styles.activityPhoto} resizeMode="cover" />
                        <View style={styles.photoExpandHint}>
                          <MaterialCommunityIcons name="magnify-plus-outline" size={14} color="#fff" />
                          <Text style={styles.photoExpandText}>Toca para ampliar</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.activityTime}>{formatRelativeTime(c.checked_in_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Photo fullscreen modal */}
      <Modal visible={!!photoModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPhotoModal(null)}>
        <SafeAreaView style={styles.photoModalBg}>
          {/* Close */}
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setPhotoModal(null)}>
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Photo */}
          {photoModal && (
            <Image
              source={{ uri: photoModal.uri }}
              style={styles.photoModalImg}
              resizeMode="contain"
            />
          )}

          {/* Bottom bar */}
          <View style={styles.photoModalBottom}>
            <View style={styles.photoModalBranding}>
              <Text style={styles.photoModalBrandDo}>Do</Text>
              <Text style={styles.photoModalBrandIt}>It</Text>
              <Text style={styles.photoModalBrandTag}>APP</Text>
            </View>
            {isNative && (
              <TouchableOpacity
                style={[styles.photoShareBtn, sharing && styles.photoShareBtnDisabled]}
                onPress={() => photoModal && handleSharePhoto(photoModal.uri)}
                disabled={sharing}
              >
                {sharing
                  ? <ActivityIndicator size="small" color="#000" />
                  : <MaterialCommunityIcons name="share-variant" size={20} color="#000" />
                }
                <Text style={styles.photoShareText}>{sharing ? 'Preparando...' : 'Compartir'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  activityPhoto: { width: '100%', aspectRatio: 3 / 4, borderRadius: 10, marginTop: 8 },
  photoExpandHint: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  photoExpandText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  activityTime: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Photo modal
  photoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
    justifyContent: 'space-between',
  },
  photoModalClose: {
    alignSelf: 'flex-end',
    margin: 16,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
  },
  photoModalImg: {
    width: Dimensions.get('window').width,
    aspectRatio: 3 / 4,
    maxHeight: Dimensions.get('window').height * 0.72,
  },
  photoModalBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  photoModalBranding: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  photoModalBrandDo: { color: Colors.primary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  photoModalBrandIt: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  photoModalBrandTag: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  photoShareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  photoShareBtnDisabled: { opacity: 0.6 },
  photoShareText: { color: '#000', fontWeight: '800', fontSize: 15 },
})
