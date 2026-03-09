import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { friendsApi } from '../../lib/api'
import { FriendRow } from '../../components/FriendRow'
import { Colors } from '../../constants/colors'
import type { Friend, FriendRequest } from '@doit/shared'

type Tab = 'friends' | 'requests'

export default function FriendsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('friends')

  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list(),
  })

  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => friendsApi.getRequests(),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      friendsApi.respond(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friend-count'] })
    },
  })

  const friends = (friendsData?.friends ?? []) as Friend[]
  const requests = (requestsData?.requests ?? []) as FriendRequest[]
  const pendingCount = requests.length

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
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            Solicitudes{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Friends tab */}
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

      {/* Requests tab */}
      {tab === 'requests' && (
        loadingRequests
          ? <ActivityIndicator style={styles.loader} color={Colors.primary} />
          : requests.length === 0
            ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-clock-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text>
              </View>
            )
            : (
              <FlatList
                data={requests}
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
                        style={styles.btnAccept}
                        onPress={() => respondMutation.mutate({ id: item.id, action: 'accept' })}
                        disabled={respondMutation.isPending}
                      >
                        <Text style={styles.btnAcceptText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnReject}
                        onPress={() => respondMutation.mutate({ id: item.id, action: 'reject' })}
                        disabled={respondMutation.isPending}
                      >
                        <Text style={styles.btnRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBtnText: { color: Colors.textMuted, fontSize: 15 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },

  loader: { marginTop: 40 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

  requestRow: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  btnAccept: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnAcceptText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnReject: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnRejectText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
})
