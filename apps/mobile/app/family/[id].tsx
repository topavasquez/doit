import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Share, Image, RefreshControl, Modal, FlatList,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { familyApi, friendsApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'
import type { Friend } from '@doit/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

type FamilyChallenge = {
  id: string; admin_id: string; title: string; description: string | null
  frequency: string; duration_days: number; require_photo: boolean
  reward_description: string | null; invite_code: string; status: string
  start_date: string | null; end_date: string | null; created_at: string
}

type FamilyParticipant = {
  id: string; user_id: string; total_checkins: number; joined_at: string
  username?: string; display_name?: string | null; avatar_url?: string | null
}

type FamilyCheckin = {
  id: string; user_id: string; photo_url: string | null; notes: string | null
  approved: boolean | null; checked_in_at: string
  username?: string; display_name?: string | null; avatar_url?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ uri, name, size = 36 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: Colors.primary + '22',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: Colors.primary, fontWeight: '800', fontSize: size * 0.38 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  )
}

function ApprovalBadge({ approved }: { approved: boolean | null }) {
  if (approved === true) return (
    <View style={[styles.badge, styles.badgeApproved]}>
      <MaterialCommunityIcons name="check" size={11} color={Colors.primary} />
      <Text style={[styles.badgeText, { color: Colors.primary }]}>Aprobado</Text>
    </View>
  )
  if (approved === false) return (
    <View style={[styles.badge, styles.badgeRejected]}>
      <MaterialCommunityIcons name="close" size={11} color={Colors.error} />
      <Text style={[styles.badgeText, { color: Colors.error }]}>Rechazado</Text>
    </View>
  )
  return (
    <View style={[styles.badge, styles.badgePending]}>
      <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
      <Text style={[styles.badgeText, { color: Colors.textMuted }]}>Pendiente</Text>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'progreso' | 'checkins' | 'pendiente'

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('progreso')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['family-detail', id],
    queryFn: () => familyApi.get(id!),
    enabled: !!id,
  })

  useFocusEffect(useCallback(() => { refetch() }, []))

  const { data: checkinsData } = useQuery({
    queryKey: ['family-checkins', id],
    queryFn: () => familyApi.getCheckins(id!),
    enabled: !!id,
  })

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list(),
    enabled: inviteOpen,
  })

  const inviteFriendMutation = useMutation({
    mutationFn: (friendId: string) => familyApi.inviteFriend(id!, friendId),
    onSuccess: (_res, friendId) => setInvitedIds((prev) => new Set([...prev, friendId])),
    onError: (err: any) => {
      if (err.statusCode === 409) return // already participant — treat as success
      Alert.alert('Error', err.message)
    },
  })

  const startMutation = useMutation({
    mutationFn: () => familyApi.start(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family-detail', id] }),
    onError: (err: any) => Alert.alert('Error', err.message),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ cid, action }: { cid: string; action: 'approve' | 'reject' }) =>
      familyApi.reviewCheckin(id!, cid, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['family-checkins', id] })
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  })

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!data) return null

  const challenge = data.challenge as FamilyChallenge
  const role = data.role as string
  const isAdmin = role === 'admin'
  const participants = (data.participants ?? []) as FamilyParticipant[]
  const pendingCheckins = (data.pending_checkins ?? []) as FamilyCheckin[]
  const checkins = (checkinsData?.checkins ?? []) as FamilyCheckin[]
  const hasCheckedInToday = data.has_checked_in_today

  async function handleShare() {
    const message = `Únete a mi reto familiar "${challenge.title}" con el código ${challenge.invite_code}`
    try {
      await Share.share({ title: `Únete al reto "${challenge.title}"`, message })
    } catch {
      Alert.alert('Código de invitación', `${challenge.invite_code}\n\n${message}`, [{ text: 'Cerrar' }])
    }
  }

  const participantIds = new Set(participants.map((p) => p.user_id))
  const friendsNotIn = ((friendsData?.friends ?? []) as Friend[]).filter(
    (f) => !participantIds.has(f.id) && f.id !== challenge.admin_id
  )

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', active: 'Activo', completed: 'Completado',
  }
  const statusColor: Record<string, string> = {
    pending: Colors.textMuted, active: Colors.primary, completed: Colors.textSecondary,
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/compete')}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={[styles.statusPill, { backgroundColor: statusColor[challenge.status] + '20', borderColor: statusColor[challenge.status] + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor[challenge.status] }]} />
            <Text style={[styles.statusText, { color: statusColor[challenge.status] }]}>
              {statusLabel[challenge.status] ?? challenge.status}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="account-child" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          {challenge.description ? (
            <Text style={styles.heroDesc}>{challenge.description}</Text>
          ) : null}
          <View style={styles.heroCaps}>
            <View style={styles.heroCap}>
              <MaterialCommunityIcons name="calendar-range" size={14} color={Colors.textMuted} />
              <Text style={styles.heroCapText}>{challenge.duration_days} días</Text>
            </View>
            <View style={styles.heroCap}>
              <MaterialCommunityIcons name="repeat" size={14} color={Colors.textMuted} />
              <Text style={styles.heroCapText}>{challenge.frequency === 'daily' ? 'Diario' : 'Semanal'}</Text>
            </View>
            {challenge.require_photo && (
              <View style={styles.heroCap}>
                <MaterialCommunityIcons name="camera-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.heroCapText}>Foto requerida</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reward */}
        {challenge.reward_description ? (
          <View style={styles.rewardBox}>
            <MaterialCommunityIcons name="gift-outline" size={18} color={Colors.primary} />
            <Text style={styles.rewardText} numberOfLines={2}>{challenge.reward_description}</Text>
          </View>
        ) : null}

        {/* Invite code + button */}
        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Código</Text>
            <Text style={styles.codeValue}>{challenge.invite_code}</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setInviteOpen(true)} activeOpacity={0.85}>
              <MaterialCommunityIcons name="account-plus-outline" size={18} color="#000" />
              <Text style={styles.inviteBtnText}>Invitar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participantes ({participants.length})</Text>
          <View style={styles.participantList}>
            {participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <Avatar uri={p.avatar_url} name={p.display_name ?? p.username ?? '?'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName} numberOfLines={1}>
                    {p.display_name ?? p.username}
                  </Text>
                  <Text style={styles.participantSub}>{Number(p.total_checkins) || 0} check-ins</Text>
                </View>
              </View>
            ))}
            {participants.length === 0 && (
              <Text style={styles.emptyText}>Aún no hay participantes. Comparte el código.</Text>
            )}
          </View>
        </View>

        {/* Admin: start button / participant wait */}
        {challenge.status === 'pending' && (
          isAdmin ? (
            <TouchableOpacity
              style={[styles.startBtn, startMutation.isPending && { opacity: 0.6 }]}
              onPress={() => startMutation.mutate()}
              activeOpacity={0.85}
              disabled={startMutation.isPending}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={22} color="#000" />
              <Text style={styles.startBtnText}>
                {startMutation.isPending ? 'Iniciando...' : 'Iniciar reto'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitBox}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.waitText}>Esperando a que el administrador inicie el reto.</Text>
            </View>
          )
        )}

        {/* Tabs (only when active or completed) */}
        {challenge.status !== 'pending' && (
          <>
            <View style={styles.tabBar}>
              {[
                { key: 'progreso', label: 'Progreso' },
                { key: 'checkins', label: 'Historial' },
                ...(isAdmin && pendingCheckins.length > 0 ? [{ key: 'pendiente', label: `Pendientes (${pendingCheckins.length})` }] : []),
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabPill, tab === t.key && styles.tabPillActive]}
                  onPress={() => setTab(t.key as Tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Progreso tab */}
            {tab === 'progreso' && (
              <View style={styles.tabContent}>
                {participants.map((p) => {
                  const total = challenge.frequency === 'daily' ? challenge.duration_days : Math.ceil(challenge.duration_days / 7)
                  const checkins = Number(p.total_checkins) || 0
                  const pct = total > 0 ? Math.min(1, checkins / total) : 0
                  return (
                    <View key={p.id} style={styles.progressRow}>
                      <Avatar uri={p.avatar_url} name={p.display_name ?? p.username ?? '?'} size={32} />
                      <View style={{ flex: 1, gap: 5 }}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressName} numberOfLines={1}>
                            {p.display_name ?? p.username}
                          </Text>
                          <Text style={styles.progressCount}>{checkins}/{total}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Historial tab */}
            {tab === 'checkins' && (
              <View style={styles.tabContent}>
                {checkins.length === 0 && (
                  <Text style={styles.emptyText}>Aún no hay check-ins.</Text>
                )}
                {checkins.map((c) => (
                  <View key={c.id} style={styles.checkinRow}>
                    <Avatar uri={c.avatar_url} name={c.display_name ?? c.username ?? '?'} size={32} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.checkinMeta}>
                        <Text style={styles.checkinName} numberOfLines={1}>
                          {c.display_name ?? c.username}
                        </Text>
                        <ApprovalBadge approved={c.approved} />
                      </View>
                      <Text style={styles.checkinDate}>
                        {new Date(c.checked_in_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {c.photo_url ? (
                        <Image source={{ uri: c.photo_url }} style={styles.checkinPhoto} />
                      ) : null}
                      {c.notes ? (
                        <Text style={styles.checkinNotes}>{c.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pendientes tab (admin only) */}
            {tab === 'pendiente' && isAdmin && (
              <View style={styles.tabContent}>
                {pendingCheckins.length === 0 && (
                  <Text style={styles.emptyText}>Sin check-ins pendientes.</Text>
                )}
                {pendingCheckins.map((c) => (
                  <View key={c.id} style={styles.pendingCard}>
                    <View style={styles.pendingTop}>
                      <Avatar uri={c.avatar_url} name={c.display_name ?? c.username ?? '?'} size={34} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkinName} numberOfLines={1}>
                          {c.display_name ?? c.username}
                        </Text>
                        <Text style={styles.checkinDate}>
                          {new Date(c.checked_in_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    {c.photo_url ? (
                      <Image source={{ uri: c.photo_url }} style={styles.pendingPhoto} />
                    ) : null}
                    {c.notes ? (
                      <Text style={styles.checkinNotes}>{c.notes}</Text>
                    ) : null}
                    <View style={styles.reviewBtns}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => reviewMutation.mutate({ cid: c.id, action: 'reject' })}
                        activeOpacity={0.8}
                        disabled={reviewMutation.isPending}
                      >
                        <MaterialCommunityIcons name="close" size={18} color={Colors.error} />
                        <Text style={styles.rejectBtnText}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => reviewMutation.mutate({ cid: c.id, action: 'approve' })}
                        activeOpacity={0.8}
                        disabled={reviewMutation.isPending}
                      >
                        <MaterialCommunityIcons name="check" size={18} color="#000" />
                        <Text style={styles.approveBtnText}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Participant: check-in button */}
        {!isAdmin && challenge.status === 'active' && (
          <TouchableOpacity
            style={[styles.checkinBtn, hasCheckedInToday && styles.checkinBtnDone]}
            activeOpacity={0.85}
            disabled={hasCheckedInToday}
            onPress={() => router.push({
              pathname: '/family/checkin',
              params: { challengeId: id, requirePhoto: challenge.require_photo ? '1' : '0', challengeTitle: challenge.title },
            })}
          >
            <MaterialCommunityIcons
              name={hasCheckedInToday ? 'check-circle-outline' : 'camera-outline'}
              size={22}
              color={hasCheckedInToday ? Colors.primary : '#000'}
            />
            <Text style={[styles.checkinBtnText, hasCheckedInToday && { color: Colors.primary }]}>
              {hasCheckedInToday ? 'Ya hiciste check-in hoy' : 'Confirmar tarea de hoy'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Invite modal ─────────────────────────────────────────── */}
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInviteOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Invitar al reto</Text>

          {/* Code display */}
          <View style={styles.modalCodeBox}>
            <Text style={styles.modalCodeLabel}>Código de invitación</Text>
            <Text style={styles.modalCodeValue}>{challenge.invite_code}</Text>
            <Text style={styles.modalCodeHint}>Comparte este código para que otros se unan</Text>
          </View>

          {/* Share link */}
          <TouchableOpacity style={styles.shareLinkBtn} onPress={() => { setInviteOpen(false); handleShare() }} activeOpacity={0.8}>
            <View style={styles.shareLinkIcon}>
              <MaterialCommunityIcons name="link-variant" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shareLinkTitle}>Compartir código</Text>
              <Text style={styles.shareLinkSub}>Cualquiera con el código puede unirse</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.modalSection}>Tus amigos</Text>
          {friendsNotIn.length === 0 ? (
            <Text style={styles.modalEmpty}>
              {(friendsData?.friends ?? []).length === 0
                ? 'Aún no tienes amigos en la app'
                : 'Todos tus amigos ya están en este reto'}
            </Text>
          ) : (
            <FlatList
              data={friendsNotIn}
              keyExtractor={(f) => f.id}
              style={styles.modalList}
              renderItem={({ item }) => {
                const sent = invitedIds.has(item.id)
                return (
                  <View style={styles.modalFriendRow}>
                    <View style={styles.modalAvatar}>
                      {item.avatar_url
                        ? <Image source={{ uri: item.avatar_url }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                        : <Text style={styles.modalAvatarText}>{(item.display_name ?? item.username)[0].toUpperCase()}</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalFriendName}>{item.display_name ?? item.username}</Text>
                      <Text style={styles.modalFriendUser}>@{item.username}</Text>
                    </View>
                    {sent ? (
                      <View style={styles.invitedBadge}>
                        <Text style={styles.invitedBadgeText}>Enviado</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.inviteFriendBtn}
                        onPress={() => inviteFriendMutation.mutate(item.id)}
                        disabled={inviteFriendMutation.isPending}
                      >
                        <Text style={styles.inviteFriendBtnText}>Invitar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  hero: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 10 },
  heroIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { color: Colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  heroDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  heroCaps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  heroCap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroCapText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },

  rewardBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.primary + '12',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.primary + '30',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rewardText: { color: Colors.text, fontSize: 14, fontWeight: '600', flex: 1 },

  codeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
  },
  codeBox: {
    flex: 1,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  codeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  codeValue: { color: Colors.primary, fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  inviteBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, maxHeight: '80%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '900', paddingHorizontal: 20, marginBottom: 16 },
  modalCodeBox: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.surfaceElevated, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, alignItems: 'center',
  },
  modalCodeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  modalCodeValue: { color: Colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: 5, marginBottom: 4 },
  modalCodeHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  shareLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  shareLinkIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1, borderColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  shareLinkTitle: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  shareLinkSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  modalSection: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 10,
  },
  modalEmpty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  modalList: { maxHeight: 320 },
  modalFriendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  modalFriendName: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  modalFriendUser: { color: Colors.textMuted, fontSize: 12 },
  inviteFriendBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.primary,
  },
  inviteFriendBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  invitedBadge: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
  },
  invitedBadgeText: { color: Colors.textMuted, fontWeight: '700', fontSize: 12 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3 },

  participantList: { gap: 10 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  participantName: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  participantSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16,
    marginHorizontal: 20, marginBottom: 20, paddingVertical: 17,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },

  waitBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.surfaceElevated, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  waitText: { color: Colors.textMuted, fontSize: 14, flex: 1 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabPill: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tabPillActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#000' },

  tabContent: { paddingHorizontal: 20, gap: 12 },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressName: { color: Colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
  progressCount: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  checkinRow: {
    flexDirection: 'row', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  checkinMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  checkinName: { color: Colors.text, fontWeight: '700', fontSize: 14, flex: 1 },
  checkinDate: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  checkinPhoto: { width: '100%', aspectRatio: 1, borderRadius: 10, marginTop: 8 },
  checkinNotes: { color: Colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1,
  },
  badgeApproved: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' },
  badgeRejected: { backgroundColor: Colors.error + '15', borderColor: Colors.error + '40' },
  badgePending: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border },
  badgeText: { fontSize: 10, fontWeight: '700' },

  pendingCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 10,
  },
  pendingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingPhoto: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  reviewBtns: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 13,
    backgroundColor: Colors.error + '15',
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  rejectBtnText: { color: Colors.error, fontWeight: '800', fontSize: 14 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 13,
    backgroundColor: Colors.primary,
  },
  approveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  checkinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16,
    marginHorizontal: 20, marginTop: 8, paddingVertical: 17,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  checkinBtnDone: {
    backgroundColor: Colors.primary + '18',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  checkinBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
})
