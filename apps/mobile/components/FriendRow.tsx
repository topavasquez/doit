import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../constants/colors'
import type { FriendshipStatus } from '@doit/shared'

interface Props {
  id: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
  friendship_status?: FriendshipStatus
  onAdd?: (id: string) => void
  onAccept?: (id: string) => void
  loading?: boolean
}

export function FriendRow({ id, username, display_name, avatar_url, friendship_status = 'none', onAdd, onAccept, loading }: Props) {
  const router = useRouter()
  const initial = (display_name ?? username)[0].toUpperCase()

  function renderAction() {
    if (loading) return <ActivityIndicator size="small" color={Colors.primary} />

    if (friendship_status === 'accepted') {
      return (
        <View style={[styles.badge, styles.badgeAccepted]}>
          <Text style={styles.badgeAcceptedText}>Amigos</Text>
        </View>
      )
    }
    if (friendship_status === 'pending_sent') {
      return (
        <View style={[styles.badge, styles.badgePending]}>
          <Text style={styles.badgePendingText}>Enviado</Text>
        </View>
      )
    }
    if (friendship_status === 'pending_received' && onAccept) {
      return (
        <TouchableOpacity style={styles.btnAccept} onPress={() => onAccept(id)}>
          <Text style={styles.btnAcceptText}>Aceptar</Text>
        </TouchableOpacity>
      )
    }
    if (friendship_status === 'none' && onAdd) {
      return (
        <TouchableOpacity style={styles.btnAdd} onPress={() => onAdd(id)}>
          <Text style={styles.btnAddText}>Agregar</Text>
        </TouchableOpacity>
      )
    }
    return null
  }

  return (
    <TouchableOpacity style={styles.row} onPress={() => router.push(`/user/${id}`)} activeOpacity={0.7}>
      {avatar_url ? (
        <Image source={{ uri: avatar_url }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.displayName}>{display_name ?? username}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
      {renderAction()}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontWeight: '800', fontSize: 18 },
  info: { flex: 1, gap: 2 },
  displayName: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  username: { color: Colors.textMuted, fontSize: 13 },

  btnAdd: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.primary,
  },
  btnAddText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },

  btnAccept: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.primary,
  },
  btnAcceptText: { color: '#000', fontWeight: '700', fontSize: 13 },

  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  badgeAccepted: { backgroundColor: Colors.primary + '22' },
  badgeAcceptedText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  badgePending: { backgroundColor: Colors.surfaceElevated },
  badgePendingText: { color: Colors.textMuted, fontWeight: '600', fontSize: 12 },
})
