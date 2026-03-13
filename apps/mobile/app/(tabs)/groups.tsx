import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, TextInput, Modal, Alert, ActivityIndicator, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '../../lib/api'
import { GroupCard } from '../../components/GroupCard'
import { Colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import type { Group, GroupInviteNotification } from '@doit/shared'

type TabId = 'my' | 'join'

export default function GroupsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('my')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.list,
  })

  const { data: invitesData, refetch: refetchInvites } = useQuery({
    queryKey: ['group-invites'],
    queryFn: groupsApi.getInvites,
  })

  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null)

  async function handleInviteAccept(invite: GroupInviteNotification) {
    if (respondingInviteId) return
    setRespondingInviteId(invite.id)
    try {
      const res = await groupsApi.acceptInvite(invite.id)
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['group-invites'] })
      router.push({ pathname: '/group/[id]', params: { id: res.group.id, openInvite: '1' } })
    } catch {
      Alert.alert('Error', 'No se pudo aceptar la invitación')
    } finally {
      setRespondingInviteId(null)
    }
  }

  async function handleInviteDecline(inviteId: string) {
    if (respondingInviteId) return
    setRespondingInviteId(inviteId)
    try {
      await groupsApi.declineInvite(inviteId)
      qc.invalidateQueries({ queryKey: ['group-invites'] })
    } catch {
      Alert.alert('Error', 'No se pudo rechazar la invitación')
    } finally {
      setRespondingInviteId(null)
    }
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => groupsApi.create({ name }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      setShowCreateModal(false)
      setGroupName('')
      router.push(`/group/${(res.group as Group).id}`)
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Error al crear el grupo'),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => groupsApi.join(code),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      setInviteCode('')
      setTab('my')
      router.push(`/group/${(res.group as Group).id}`)
    },
    onError: () => Alert.alert('Error', 'Código de invitación inválido o el grupo está lleno'),
  })

  const groups = (data?.groups ?? []) as (Group & { member_count?: number; my_role?: string })[]
  const filtered = groups.filter(
    (g) => search.trim() === '' || g.name.toLowerCase().includes(search.toLowerCase()),
  )
  const invites = (invitesData?.invites ?? []) as GroupInviteNotification[]

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchInvites() }} tintColor={Colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar grupos..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === 'my' && styles.tabActive]} onPress={() => setTab('my')}>
            <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>Mis Grupos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'join' && styles.tabActive]} onPress={() => setTab('join')}>
            <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>Descubrir</Text>
          </TouchableOpacity>
        </View>

        {/* Group invites */}
        {tab === 'my' && invites.length > 0 && (
          <View style={styles.invitesSection}>
            <Text style={styles.invitesTitle}>
              Invitaciones pendientes
              <Text style={styles.invitesBadge}> {invites.length}</Text>
            </Text>
            {invites.map((invite) => {
              const isResponding = respondingInviteId === invite.id
              const inviterName = invite.inviter?.display_name ?? invite.inviter?.username ?? 'Alguien'
              return (
                <View key={invite.id} style={styles.inviteCard}>
                  <View style={styles.inviteHeader}>
                    {invite.inviter?.avatar_url ? (
                      <Image source={{ uri: invite.inviter.avatar_url }} style={styles.inviteAvatar} />
                    ) : (
                      <View style={[styles.inviteAvatar, styles.inviteAvatarFallback]}>
                        <Text style={styles.inviteAvatarInitial}>
                          {(invite.inviter?.display_name ?? invite.inviter?.username ?? '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.inviteInfo}>
                      <Text style={styles.inviteGroupName}>{invite.group_name}</Text>
                      <Text style={styles.inviteSubtext}>{inviterName} te invitó a unirte</Text>
                    </View>
                    <MaterialCommunityIcons name="account-group" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      style={[styles.inviteDeclineBtn, isResponding && styles.btnDisabled]}
                      onPress={() => handleInviteDecline(invite.id)}
                      disabled={!!respondingInviteId}
                    >
                      <Text style={styles.inviteDeclineText}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inviteAcceptBtn, isResponding && styles.btnDisabled]}
                      onPress={() => handleInviteAccept(invite)}
                      disabled={!!respondingInviteId}
                    >
                      {isResponding
                        ? <ActivityIndicator size="small" color="#000" />
                        : <Text style={styles.inviteAcceptText}>Aceptar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* My Groups */}
        {tab === 'my' && (
          <>
            {isLoading ? (
              <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <MaterialCommunityIcons name="account-group-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>{search ? 'Sin resultados' : 'Sin grupos aún'}</Text>
                <Text style={styles.emptySubtext}>
                  {search ? `Sin grupos que coincidan con "${search}"` : 'Crea un grupo con tus amigos.\nEl que pierde invita el brunch.'}
                </Text>
                {!search && (
                  <TouchableOpacity style={styles.emptyAction} onPress={() => setShowCreateModal(true)}>
                    <Text style={styles.emptyActionText}>Crea tu primer grupo</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filtered.map((group) => <GroupCard key={group.id} group={group} />)
            )}
          </>
        )}

        {/* Discover / Join */}
        {tab === 'join' && (
          <View style={styles.joinPanel}>
            <View style={styles.joinCard}>
              <MaterialCommunityIcons name="key-variant" size={28} color={Colors.primary} style={styles.joinIcon} />
              <Text style={styles.joinTitle}>Unirse con Código de Invitación</Text>
              <Text style={styles.joinSubtitle}>Pide a un amigo su código de grupo de 8 caracteres</Text>
              <TextInput
                style={styles.codeInput}
                placeholder="CREW1234"
                placeholderTextColor={Colors.textMuted}
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity
                style={[styles.joinBtn, (!inviteCode.trim() || joinMutation.isPending) && styles.btnDisabled]}
                onPress={() => joinMutation.mutate(inviteCode.trim())}
                disabled={!inviteCode.trim() || joinMutation.isPending}
              >
                <Text style={styles.joinBtnText}>{joinMutation.isPending ? 'Uniéndose...' : 'Unirse al Grupo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (!user?.is_pro && groups.length >= 1) { router.push('/premium'); return }
          setShowCreateModal(true)
        }}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#000" />
      </TouchableOpacity>

      {/* Create group modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Crear un Grupo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del grupo (ej. Equipo Mañanero)"
              placeholderTextColor={Colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateModal(false); setGroupName('') }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!groupName.trim() || createMutation.isPending) && styles.btnDisabled]}
                onPress={() => createMutation.mutate(groupName.trim())}
                disabled={!groupName.trim() || createMutation.isPending}
              >
                <Text style={styles.confirmText}>{createMutation.isPending ? 'Creando...' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14, gap: 10,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 12, padding: 4, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  emptySubtext: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyAction: { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyActionText: { color: '#000', fontWeight: '700', fontSize: 15 },
  joinPanel: { paddingTop: 8 },
  joinCard: {
    backgroundColor: Colors.surface, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 10,
  },
  joinIcon: { marginBottom: 4 },
  joinTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  joinSubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  codeInput: {
    width: '100%', backgroundColor: Colors.surfaceElevated,
    borderRadius: 14, paddingVertical: 18, paddingHorizontal: 20,
    color: Colors.text, fontSize: 26, fontWeight: '800',
    letterSpacing: 8, textAlign: 'center',
    borderWidth: 1, borderColor: Colors.border, marginTop: 6,
  },
  joinBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  joinBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  invitesSection: { marginBottom: 20, gap: 10 },
  invitesTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  invitesBadge: { color: Colors.primary },
  inviteCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.primary + '40',
    padding: 16, gap: 14,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteAvatar: { width: 44, height: 44, borderRadius: 22 },
  inviteAvatarFallback: { backgroundColor: Colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
  inviteAvatarInitial: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  inviteInfo: { flex: 1 },
  inviteGroupName: { color: Colors.text, fontWeight: '800', fontSize: 15 },
  inviteSubtext: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 10 },
  inviteDeclineBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  inviteDeclineText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  inviteAcceptBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  inviteAcceptText: { color: '#000', fontWeight: '700', fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 44, gap: 16,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  modalInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '800', fontSize: 15 },
})
