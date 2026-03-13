import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { usersApi, friendsApi } from '../../lib/api'
import { ProBadge } from '../../components/ProBadge'
import { Colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import type { User } from '@doit/shared'

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user: me } = useAuth()

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUser(id),
    enabled: !!id,
  })

  const { data: statsData } = useQuery({
    queryKey: ['user-stats', id],
    queryFn: () => usersApi.getStats(id),
    enabled: !!id,
  })

  const { data: friendCountData } = useQuery({
    queryKey: ['friend-count', id],
    queryFn: () => friendsApi.getCount(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const user = userData?.user as User | undefined
  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Usuario no encontrado</Text>
      </View>
    )
  }

  const isMe = user.id === me?.id
  const initial = (user.display_name ?? user.username)[0].toUpperCase()
  const stats = statsData?.stats as {
    total_challenges: number
    total_checkins: number
    longest_streak: number
  } | undefined

  return (
    <>
      <Stack.Screen options={{ title: user.display_name ?? user.username }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.displayName}>{user.display_name ?? user.username}</Text>
            {(user as any).is_pro && <ProBadge size="md" />}
          </View>
          <Text style={styles.username}>@{user.username}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.levelBadge]}>
              <Text style={[styles.badgeText, styles.levelBadgeText]}>Nivel {user.level}</Text>
            </View>
            {(stats?.longest_streak ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Mejor Racha: {stats!.longest_streak} días</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="Retos" value={stats.total_challenges} color={Colors.primary} />
            <StatCard label="Check-ins" value={stats.total_checkins} color="#FF9A3D" />
            <StatCard label="Mejor Racha" value={stats.longest_streak} color="#E8A820" />
          </View>
        )}

        {/* Friends count */}
        <View style={styles.friendsCard}>
          <Text style={styles.friendsLabel}>Amigos</Text>
          <Text style={styles.friendsCount}>{friendCountData?.count ?? 0}</Text>
        </View>
      </ScrollView>
    </>
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
  card: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
  value: { fontSize: 26, fontWeight: '900' },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, fontSize: 16 },

  hero: { alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  avatarImg: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: Colors.primaryDim, marginBottom: 14,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primaryDim, marginBottom: 14,
  },
  avatarText: { color: '#000', fontWeight: '900', fontSize: 42 },
  displayName: { color: Colors.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  username: { color: Colors.textSecondary, fontSize: 15, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border,
  },
  badgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  levelBadge: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '44' },
  levelBadgeText: { color: Colors.primary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  friendsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  friendsLabel: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  friendsCount: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
})
