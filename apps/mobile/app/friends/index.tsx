import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { friendsApi } from '../../lib/api'
import { FriendRow } from '../../components/FriendRow'
import { Colors } from '../../constants/colors'
import type { Friend, FriendRequest, SentFriendRequest } from '@doit/shared'

type Tab = 'friends' | 'received' | 'sent'

export default function FriendsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('friends')

  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list(),
  })

  const { data: receivedData, isLoading: loadingReceived } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => friendsApi.getRequests(),
  })

  const { data: sentData, isLoading: loadingSent } = useQuery({
    queryKey: ['friend-requests-sent'],
    queryFn: () => friendsApi.getSentRequests(),
  })

  const [respondingId, setRespondingId] = useState<string | null>(null)

  async function handleRespond(id: string, action: 'accept' | 'reject') {
    if (respondingId) return
    setRespondingId(id)
    try {
      await friendsApi.respond(id, action)
    } catch (err: any) {
      // 409 means already processed — still refresh
      if (err?.statusCode !== 409) return
    } finally {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friend-count'] })
      setRespondingId(null)
    }
  }

  const friends = (friendsData?.friends ?? []) as Friend[]
  const received = (receivedData?.requests ?? []) as FriendRequest[]
  const sent = (sentData?.requests ?? []) as SentFriendRequest[]

  const receivedCount = received.length
  const sentCount = sent.length

  return (
    <View style={styles.container}>
      {/* Search button */}
      <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/friends/search')}>
        <MaterialCommunityIcons name="magnify" size={18} color={Colors.textSecondary} />
        <Text style={styles.searchBtnText}>Buscar amigos por usuario...</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'friends' && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            Amigos{friends.length > 0 ? ` (${friends.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'received' && styles.tabActive]}
          onPress={() => setTab('received')}
        >
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>Recibidas</Text>
            {receivedCount > 0 && (
              <View style={[styles.badge, tab === 'received' && styles.badgeActive]}>
                <Text style={[styles.badgeText, tab === 'received' && styles.badgeTextActive]}>{receivedCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'sent' && styles.tabActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            Enviadas{sentCount > 0 ? ` (${sentCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amigos */}
      {tab === 'friends' && (
        loadingFriends
          ? <ActivityIndicator style={styles.loader} color={Colors.primary} />
          : friends.length === 0
            ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-group-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Aún no tienes amigos</Text>
                <Text style={styles.emptySubtitle}>Busca a tus amigos por su nombre de usuario</Text>
              </View>
            )
            : (
              <FlatList
                data={friends}
                keyExtractor={(f) => f.id}
                renderItem={({ item }) => (
                  <FriendRow
                    id={item.id}
                    username={item.username}
                    display_name={item.display_name}
                    avatar_url={item.avatar_url}
                    friendship_status="accepted"
                  />
                )}
              />
            )
      )}

      {/* Solicitudes recibidas */}
      {tab === 'received' && (
        loadingReceived
          ? <ActivityIndicator style={styles.loader} color={Colors.primary} />
          : received.length === 0
            ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-clock-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Sin solicitudes recibidas</Text>
                <Text style={styles.emptySubtitle}>Cuando alguien te agregue, aparecerá aquí</Text>
              </View>
            )
            : (
              <FlatList
                data={received}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <View style={styles.requestRow}>
                    <FriendRow
                      id={item.requester.id}
                      username={item.requester.username}
                      display_name={item.requester.display_name}
                      avatar_url={item.requester.avatar_url}
                    />
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.btnAccept, respondingId === item.id && styles.btnDisabled]}
                        onPress={() => handleRespond(item.id, 'accept')}
                        disabled={!!respondingId}
                      >
                        {respondingId === item.id
                          ? <ActivityIndicator size="small" color="#000" />
                          : <Text style={styles.btnAcceptText}>Aceptar</Text>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnReject, respondingId === item.id && styles.btnDisabled]}
                        onPress={() => handleRespond(item.id, 'reject')}
                        disabled={!!respondingId}
                      >
                        <Text style={styles.btnRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )
      )}

      {/* Solicitudes enviadas */}
      {tab === 'sent' && (
        loadingSent
          ? <ActivityIndicator style={styles.loader} color={Colors.primary} />
          : sent.length === 0
            ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-arrow-right-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Sin solicitudes enviadas</Text>
                <Text style={styles.emptySubtitle}>Busca usuarios y agrégalos como amigos</Text>
              </View>
            )
            : (
              <FlatList
                data={sent}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <FriendRow
                    id={item.addressee.id}
                    username={item.addressee.username}
                    display_name={item.addressee.display_name}
                    avatar_url={item.addressee.avatar_url}
                    friendship_status="pending_sent"
                  />
                )}
              />
            )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchBtnText: { color: Colors.textMuted, fontSize: 15 },

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 4, marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#000' },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  badgeActive: { backgroundColor: '#000' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  badgeTextActive: { color: Colors.primary },

  loader: { marginTop: 40 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  requestRow: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  requestActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 14 },
  btnAccept: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  btnAcceptText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnReject: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnRejectText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
})
