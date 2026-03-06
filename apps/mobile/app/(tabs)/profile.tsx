import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'
import { Colors } from '../../constants/colors'
import { ChallengeCard } from '../../components/ChallengeCard'
import { LEVEL_THRESHOLDS } from '../../constants'
import type { Challenge } from '@doit/shared'

type ProfileTab = 'active' | 'history'

export default function ProfileScreen() {
  const { user, reset } = useAuthStore()
  const [tab, setTab] = useState<ProfileTab>('active')

  const { data: statsData } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user?.id,
  })

  const { data: challengesData } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
  })

  const stats = (statsData?.stats as {
    total_challenges: number
    total_checkins: number
    current_streaks: number
    longest_streak: number
    active_challenges: number
  }) ?? null

  const challenges = (challengesData?.challenges ?? []) as Challenge[]
  const xpForNext = LEVEL_THRESHOLDS[(user?.level ?? 1)] ?? null
  const xpProgress = xpForNext && user ? Math.min(100, (user.xp / xpForNext) * 100) : 100

  const activeChallenges = challenges.filter((c) => c.status === 'active')
  const completedChallenges = challenges.filter((c) => c.status === 'completed')

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); reset() },
      },
    ])
  }

  if (!user) return null

  const initial = (user.display_name ?? user.username)[0].toUpperCase()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.displayName}>{user.display_name ?? user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>

        <View style={styles.badgeRow}>
          {(stats?.longest_streak ?? 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats!.longest_streak}-Day Best Streak</Text>
            </View>
          )}
          <View style={[styles.badge, styles.levelBadge]}>
            <Text style={[styles.badgeText, styles.levelBadgeText]}>Level {user.level}</Text>
          </View>
        </View>
      </View>

      {/* XP bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>{user.xp} XP</Text>
          {xpForNext && <Text style={styles.xpNext}>Next level: {xpForNext} XP</Text>}
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpProgress}%` as `${number}%` }]} />
        </View>
      </View>

      {/* Stats row */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Challenges" value={stats.total_challenges} color={Colors.primary} />
          <StatCard label="Check-ins" value={stats.total_checkins} color="#3B82F6" />
          <StatCard label="Best Streak" value={stats.longest_streak} color="#8B5CF6" />
        </View>
      )}

      {/* Challenge tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Active{activeChallenges.length > 0 ? ` (${activeChallenges.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'active' && (
        <View style={styles.tabContent}>
          {activeChallenges.length === 0 ? (
            <Text style={styles.emptyTabText}>No active challenges</Text>
          ) : (
            activeChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)
          )}
        </View>
      )}

      {tab === 'history' && (
        <View style={styles.tabContent}>
          {completedChallenges.length === 0 ? (
            <Text style={styles.emptyTabText}>No completed challenges yet</Text>
          ) : (
            completedChallenges.slice(0, 10).map((c) => <ChallengeCard key={c.id} challenge={c} />)
          )}
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[statStyles.card, { backgroundColor: color + '20' }]}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  value: { fontSize: 26, fontWeight: '900' },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },

  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatarWrap: { marginBottom: 14 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryDim,
  },
  avatarText: { color: '#000', fontWeight: '900', fontSize: 38 },
  displayName: { color: Colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  username: { color: Colors.textSecondary, fontSize: 15, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  levelBadge: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '44' },
  levelBadgeText: { color: Colors.primary },

  xpSection: { marginBottom: 20, gap: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  xpNext: { color: Colors.textMuted, fontSize: 13 },
  xpBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  tabContent: {},
  emptyTabText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 36, fontSize: 15 },

  signOutBtn: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  signOutText: { color: Colors.error, fontWeight: '700', fontSize: 16 },
})
