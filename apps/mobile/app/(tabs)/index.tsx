import { useState, useCallback, useLayoutEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter, useFocusEffect, useNavigation } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { usersApi, groupsApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG } from '../../constants'
import type { Challenge, ChallengeParticipant } from '@doit/shared'

type DayTab = 'today' | 'upcoming' | 'completed'

type ActiveChallenge = Challenge & {
  my_participation?: Pick<ChallengeParticipant, 'streak_current' | 'total_checkins'> | null
  has_checked_in_today?: boolean
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  icon, value, label, color,
}: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={[statStyles.card, { backgroundColor: color + '1a' }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '28' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 24, fontWeight: '900' },
  label: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
})

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const navigation = useNavigation()
  const [dayTab, setDayTab] = useState<DayTab>('today')

  const { data: statsData, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  const { data: challengesData, refetch: refetchChallenges, isLoading: isLoadingChallenges } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
    staleTime: 60_000,
  })

  // Refetch on every focus (e.g. returning from create challenge or check-in)
  useFocusEffect(
    useCallback(() => {
      refetchChallenges()
      refetchStats()
    }, [])
  )

  const stats = (statsData?.stats as {
    total_challenges: number
    total_checkins: number
    current_streaks: number
    daily_streak: number
    longest_streak: number
    active_challenges: number
  }) ?? null

  const allChallenges = (challengesData?.challenges ?? []) as ActiveChallenge[]
  const activeChallenges = allChallenges.filter((c) => c.status === 'active')
  const pendingChallenges = allChallenges.filter((c) => c.status === 'pending')
  const groupCount = (groupsData?.groups ?? []).length

  // Daily progress
  const totalActive = activeChallenges.length
  const doneToday = activeChallenges.filter((c) => c.has_checked_in_today).length
  const progressPct = totalActive > 0 ? Math.min(100, (doneToday / totalActive) * 100) : 0

  // Tab filters
  const todayChallenges = activeChallenges.filter((c) => !c.has_checked_in_today)
  const completedTodayChallenges = activeChallenges.filter((c) => c.has_checked_in_today)
  const upcomingChallenges = pendingChallenges

  const currentStreak = stats?.daily_streak ?? 0

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          {currentStreak > 0 && (
            <View style={styles.headerStreak}>
              <MaterialCommunityIcons name="fire" size={18} color={Colors.streakFire} />
              <Text style={styles.headerStreakText}>{currentStreak}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ),
    })
  }, [currentStreak])

  const tabChallenges =
    dayTab === 'today'
      ? todayChallenges
      : dayTab === 'upcoming'
        ? upcomingChallenges
        : completedTodayChallenges

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetchStats(); refetchChallenges() }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting row ──────────────────────────────────── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingHello}>
            Hola, {user?.display_name ?? user?.username ?? 'ahí'}!
          </Text>
          <Text style={styles.greetingSubtitle}>Mantengamos la racha viva hoy</Text>
        </View>

        {/* ── Daily Progress ────────────────────────────────── */}
        {totalActive > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progreso Diario</Text>
              <Text style={[styles.progressCount, { color: progressPct === 100 ? Colors.success : Colors.primary }]}>
                {doneToday}/{totalActive} retos
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPct}%` as `${number}%`,
                    backgroundColor: progressPct === 100 ? Colors.success : Colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressPctLabel}>0%</Text>
              <Text style={styles.progressPctLabel}>100%</Text>
            </View>
          </View>
        )}

        {/* ── Stats row ─────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="check-circle-outline"
            value={stats?.total_checkins ?? 0}
            label="Tareas Hechas"
            color={Colors.primarySoft}
          />
          <StatCard
            icon="trophy-outline"
            value={user?.xp ?? 0}
            label="Puntos"
            color={Colors.success}
          />
          <StatCard
            icon="account-group-outline"
            value={groupCount}
            label="Grupos"
            color={Colors.primary}
          />
        </View>

        {/* ── Day tabs ──────────────────────────────────────── */}
        <View style={styles.dayTabs}>
          {(['today', 'upcoming', 'completed'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.dayTab, dayTab === t && styles.dayTabActive]}
              onPress={() => setDayTab(t)}
            >
              <Text style={[styles.dayTabText, dayTab === t && styles.dayTabTextActive]}>
                {t === 'today' ? 'Hoy' : t === 'upcoming' ? 'Próximos' : 'Completados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Challenge list ────────────────────────────────── */}
        {isLoadingChallenges ? (
          <View style={styles.emptyDay}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : tabChallenges.length === 0 ? (
          <View style={styles.emptyDay}>
            <MaterialCommunityIcons
              name={dayTab === 'completed' ? 'check-all' : 'flag-outline'}
              size={28}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyDayText}>
              {dayTab === 'today' && totalActive === 0
                ? 'Sin retos activos — ¡únete a un grupo para empezar!'
                : dayTab === 'today'
                  ? '¡Todo listo por hoy! Buen trabajo.'
                  : dayTab === 'upcoming'
                    ? 'Sin retos pendientes'
                    : 'Sin check-ins hoy'}
            </Text>
          </View>
        ) : (
          tabChallenges.map((c) => {
            const cfg = HABIT_CATEGORY_CONFIG[c.habit_category as keyof typeof HABIT_CATEGORY_CONFIG] ?? HABIT_CATEGORY_CONFIG.custom
            const streak = c.my_participation?.streak_current ?? 0

            return (
              <View key={c.id} style={styles.taskRow}>
                <View style={[styles.taskIcon, { backgroundColor: cfg.color + '20' }]}>
                  <MaterialCommunityIcons name="flag-outline" size={20} color={cfg.color} />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={[styles.taskSub, { color: cfg.color }]}>
                    {cfg.label}{streak > 0 ? ` · ${streak}-day streak` : ''}
                  </Text>
                </View>

                {dayTab === 'today' && (
                  <TouchableOpacity
                    style={styles.doItBtn}
                    onPress={() => router.push({
                      pathname: '/challenge/photo-checkin',
                      params: { challengeId: c.id, challengeTitle: c.title, groupId: c.group_id },
                    })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.doItBtnText}>Hazlo</Text>
                  </TouchableOpacity>
                )}
                {dayTab === 'completed' && (
                  <View style={styles.doneIndicator}>
                    <MaterialCommunityIcons name="check-circle" size={22} color={Colors.success} />
                  </View>
                )}
                {dayTab === 'upcoming' && (
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => router.push(`/challenge/${c.id}`)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}

        {/* ── Bottom CTAs ───────────────────────────────────── */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnGroups]}
            onPress={() => router.navigate('/(tabs)/groups')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="account-group-outline" size={18} color="#fff9f9" />
            <Text style={styles.ctaBtnText}>Mis Grupos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnCompete]}
            onPress={() => router.navigate('/(tabs)/compete')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#fff9f9" />
            <Text style={styles.ctaBtnText}>Competiciones</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },

  // Header
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 },
  headerStreak: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '20', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  headerStreakText: { color: Colors.streakFire, fontWeight: '900', fontSize: 15 },

  // Greeting
  greeting: { marginBottom: 20 },
  greetingHello: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  greetingSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },

  // Daily progress
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    gap: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  progressCount: { fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPctLabel: { color: Colors.textMuted, fontSize: 11 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

  // Day tabs
  dayTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  dayTabActive: { backgroundColor: Colors.primary },
  dayTabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  dayTabTextActive: { color: '#000' },

  // Challenge task rows
  taskRow: {
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
  taskIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  taskInfo: { flex: 1 },
  taskTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  taskSub: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  doItBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  doItBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  doneIndicator: { paddingHorizontal: 4 },
  viewBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },

  // Empty state
  emptyDay: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyDayText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // CTAs
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaBtnGroups: { backgroundColor: '#3B82F6' },
  ctaBtnCompete: { backgroundColor: Colors.primary },
  ctaBtnText: { color: '#fff9f9', fontWeight: '700', fontSize: 15 },

})
