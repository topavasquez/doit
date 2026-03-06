import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert, Image, RefreshControl, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi, challengesApi } from '../../lib/api'
import { ChallengeCard } from '../../components/ChallengeCard'
import { Colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import { formatRelativeTime } from '../../constants'
import type { Group, GroupMember, Challenge, Checkin } from '@doit/shared'

type GroupTab = 'challenges' | 'feed'

type FeedCheckin = Checkin & {
  user?: { id: string; username: string; display_name?: string | null; avatar_url?: string | null }
  challenge?: { id: string; title: string; habit_category: string }
}

const GROUP_COLORS = [Colors.primary, '#3B82F6', '#8B5CF6', '#22C55E', '#f0a500', '#EC4899']
function pickColor(name: string) { return GROUP_COLORS[name.charCodeAt(0) % GROUP_COLORS.length] }

export default function GroupScreen() {
  const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<GroupTab>(initialTab === 'feed' ? 'feed' : 'challenges')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.get(id),
  })

  const { data: feedData, refetch: refetchFeed, isRefetching: isFeedRefetching, isLoading: isFeedLoading } = useQuery({
    queryKey: ['group-feed', id],
    queryFn: () => groupsApi.getFeed(id),
    enabled: activeTab === 'feed',
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const startMutation = useMutation({
    mutationFn: (challengeId: string) => challengesApi.start(challengeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] })
      Alert.alert('Challenge Started', 'All participants have been notified. Game on!')
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const group = data?.group as (Group & { members: GroupMember[]; challenges: Challenge[] }) | undefined
  const myRole = data?.my_role
  const feedCheckins = (feedData?.checkins ?? []) as FeedCheckin[]

  if (isLoading || !group) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  const groupColor = pickColor(group.name)
  const activeChallenges = group.challenges?.filter((c) => c.status === 'active') ?? []
  const pendingChallenges = group.challenges?.filter((c) => c.status === 'pending') ?? []

  async function handleShare() {
    const { invite_code } = await groupsApi.getInvite(group!.id)
    Share.share({
      message: `Join my DoIt group "${group!.name}"! Use invite code: ${invite_code}\n\nDownload DoIt to compete on real habits with real stakes.`,
    })
  }

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'feed' ? isFeedRefetching : isRefetching}
            onRefresh={() => activeTab === 'feed' ? refetchFeed() : refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Group hero card */}
        <View style={[styles.heroCard, { borderTopColor: groupColor }]}>
          <View style={styles.heroRow}>
            <View style={[styles.groupAvatar, { backgroundColor: groupColor + '22' }]}>
              <Text style={[styles.groupAvatarText, { color: groupColor }]}>
                {group.name[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.memberCountText}>{group.members?.length ?? 0} miembros</Text>
            </View>
            <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: groupColor + '20', borderColor: groupColor + '40' }]} onPress={handleShare}>
              <MaterialCommunityIcons name="account-plus-outline" size={16} color={groupColor} />
              <Text style={[styles.inviteBtnText, { color: groupColor }]}>Invitar</Text>
            </TouchableOpacity>
          </View>

          {/* Members row */}
          <View style={styles.membersWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
              {group.members?.map((m) => {
                const username = (m.user as { username: string })?.username ?? '?'
                const isAdmin = m.role === 'admin'
                return (
                  <View key={m.id} style={styles.memberChip}>
                    <View style={[styles.memberAvatar, isAdmin && { backgroundColor: groupColor }]}>
                      <Text style={styles.memberAvatarText}>{username[0]?.toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.memberName} numberOfLines={1}>{username}</Text>
                      {isAdmin && <Text style={[styles.adminTag, { color: groupColor }]}>Admin</Text>}
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabPill}>
          <TouchableOpacity
            style={[styles.tabOption, activeTab === 'challenges' && styles.tabOptionActive]}
            onPress={() => setActiveTab('challenges')}
          >
            <Text style={[styles.tabOptionText, activeTab === 'challenges' && styles.tabOptionTextActive]}>Retos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabOption, activeTab === 'feed' && styles.tabOptionActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabOptionText, activeTab === 'feed' && styles.tabOptionTextActive]}>Feed</Text>
          </TouchableOpacity>
        </View>

        {/* --- CHALLENGES TAB --- */}
        {activeTab === 'challenges' && (
          <>
            {activeChallenges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Activos</Text>
                </View>
                {activeChallenges.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} />
                ))}
              </View>
            )}

            {pendingChallenges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pendientes</Text>
                </View>
                {pendingChallenges.map((c) => (
                  <View key={c.id}>
                    <ChallengeCard challenge={c} />
                    {(c.created_by === user?.id || myRole === 'admin') && (
                      <TouchableOpacity
                        style={[styles.startBtn, startMutation.isPending && styles.startBtnLoading]}
                        onPress={() => startMutation.mutate(c.id)}
                        disabled={startMutation.isPending}
                      >
                        <MaterialCommunityIcons name="play-circle-outline" size={18} color="#000" />
                        <Text style={styles.startBtnText}>
                          {startMutation.isPending ? 'Iniciando...' : 'Iniciar Reto'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {activeChallenges.length === 0 && pendingChallenges.length === 0 && (
              <Text style={styles.emptyText}>No hay retos todavia. Crea uno!</Text>
            )}

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push({ pathname: '/challenge/create', params: { groupId: id } })}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.createBtnText}>Crear nuevo reto</Text>
            </TouchableOpacity>
          </>
        )}

        {/* --- FEED TAB (WhatsApp-style) --- */}
        {activeTab === 'feed' && (
          <View style={styles.feedContainer}>
            {isFeedRefetching && feedCheckins.length > 0 && (
              <View style={styles.feedRefreshing}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.feedRefreshingText}>Actualizando...</Text>
              </View>
            )}
            {isFeedLoading ? (
              <View style={styles.emptyFeed}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : feedCheckins.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyFeedIcon}>📸</Text>
                <Text style={styles.emptyFeedTitle}>Sin fotos aun</Text>
                <Text style={styles.emptyFeedSub}>Cuando alguien haga check-in, su foto aparecera aqui</Text>
              </View>
            ) : (
              feedCheckins.map((c) => {
                const isMe = c.user?.id === user?.id
                const username = c.user?.display_name ?? c.user?.username ?? '?'
                const initial = username[0]?.toUpperCase() ?? '?'
                return (
                  <View key={c.id} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {!isMe && (
                      <View style={styles.bubbleAvatar}>
                        <Text style={styles.bubbleAvatarText}>{initial}</Text>
                      </View>
                    )}
                    <View style={[styles.bubbleBody, isMe ? styles.bubbleBodyMe : styles.bubbleBodyThem]}>
                      {!isMe && (
                        <Text style={[styles.bubbleName, { color: groupColor }]}>{username}</Text>
                      )}
                      {c.challenge && (
                        <Text style={styles.bubbleChallenge}>{c.challenge.title}</Text>
                      )}
                      {c.photo_url ? (
                        <Image source={{ uri: c.photo_url }} style={styles.bubblePhoto} resizeMode="cover" />
                      ) : null}
                      {c.notes ? (
                        <Text style={styles.bubbleNote}>{c.notes}</Text>
                      ) : !c.photo_url ? (
                        <Text style={styles.bubbleNote}>Hizo check-in</Text>
                      ) : null}
                      <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                        {formatRelativeTime(c.checked_in_at)}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
    marginBottom: 24,
    gap: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { fontWeight: '900', fontSize: 22 },
  heroInfo: { flex: 1 },
  groupName: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  memberCountText: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  inviteBtnText: { fontWeight: '700', fontSize: 13 },

  membersWrap: {},
  membersScroll: { gap: 10 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#000', fontWeight: '700', fontSize: 12 },
  memberName: { color: Colors.text, fontSize: 13, fontWeight: '600', maxWidth: 70 },
  adminTag: { fontSize: 10, fontWeight: '700', marginTop: 1 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  sectionTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },

  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: -2,
    marginBottom: 12,
  },
  startBtnLoading: { opacity: 0.6 },
  startBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  createBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
    borderStyle: 'dashed',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  createBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },

  tabPill: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabOptionActive: { backgroundColor: Colors.primary },
  tabOptionText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabOptionTextActive: { color: '#000' },

  emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 15 },

  // Feed styles
  feedContainer: { gap: 12, paddingBottom: 20 },
  feedRefreshing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  feedRefreshingText: { color: Colors.textMuted, fontSize: 12 },
  emptyFeed: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyFeedIcon: { fontSize: 40 },
  emptyFeedTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  emptyFeedSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },

  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 4 },
  bubbleMe: { justifyContent: 'flex-end' },
  bubbleThem: { justifyContent: 'flex-start' },

  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    flexShrink: 0,
  },
  bubbleAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 13 },

  bubbleBody: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  bubbleBodyThem: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleBodyMe: {
    backgroundColor: Colors.primary + '22',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    borderBottomRightRadius: 4,
  },

  bubbleName: { fontSize: 12, fontWeight: '800' },
  bubbleChallenge: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  bubblePhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, minWidth: 200 },
  bubbleNote: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: Colors.textMuted, fontSize: 11, alignSelf: 'flex-start' },
  bubbleTimeMe: { alignSelf: 'flex-end' },
})
