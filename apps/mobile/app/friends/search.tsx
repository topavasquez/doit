import { useState, useEffect, useRef } from 'react'
import { View, TextInput, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { friendsApi } from '../../lib/api'
import { FriendRow } from '../../components/FriendRow'
import { Colors } from '../../constants/colors'
import type { UserSearchResult } from '@doit/shared'

export default function FriendsSearchScreen() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await friendsApi.search(query.trim())
        setResults(res.users)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function handleAdd(userId: string) {
    setLoadingId(userId)
    try {
      await friendsApi.sendRequest(userId)
      setResults((prev) =>
        prev.map((u) => u.id === userId ? { ...u, friendship_status: 'pending_sent' } : u)
      )
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    } catch {
      // keep state unchanged on error
    } finally {
      setLoadingId(null)
    }
  }

  async function handleAccept(friendshipId: string, userId: string) {
    setLoadingId(userId)
    try {
      await friendsApi.respond(friendshipId, 'accept')
      setResults((prev) =>
        prev.map((u) => u.id === userId ? { ...u, friendship_status: 'accepted' } : u)
      )
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friend-count'] })
    } catch {
      // keep state unchanged on error
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre de usuario..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoFocus
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <Text style={styles.hint}>Escribe al menos 2 caracteres</Text>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <Text style={styles.empty}>No se encontraron usuarios</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <FriendRow
            id={item.id}
            username={item.username}
            display_name={item.display_name}
            avatar_url={item.avatar_url}
            friendship_status={item.friendship_status}
            onAdd={handleAdd}
            onAccept={item.friendship_id ? (userId) => handleAccept(item.friendship_id!, userId) : undefined}
            loading={loadingId === item.id}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.text, fontSize: 16 },
  hint: { color: Colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 14 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
})
