import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert,
  Image, RefreshControl, ActivityIndicator, Modal, FlatList,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { groupsApi, challengesApi, friendsApi, usersApi, uploadGroupCoverPhoto } from '../../lib/api'
import { ChallengeCard } from '../../components/ChallengeCard'
import { ChallengeRetoCard } from '../../components/ChallengeRetoCard'
import { Colors } from '../../constants/colors'
import { useAuth } from '../../hooks/useAuth'
import { formatRelativeTime } from '../../constants'
import type { Group, GroupMember, Challenge, GroupMessage } from '@doit/shared'

type GroupTab = 'challenges' | 'chat'

const COVER_COLORS = [
  '#FF7A00', '#FF9A3D', '#E84444', '#f87858',
  '#C8A060', '#E8A820', '#8A8070', '#9A9A9A',
  '#5A3E2B', '#2D2D2D', '#1A1A2E', '#16213E',
]

const GROUP_COLORS = [Colors.primary, '#3B82F6', '#8B5CF6', '#22C55E', '#f0a500', '#EC4899']
function pickColor(name: string) { return GROUP_COLORS[name.charCodeAt(0) % GROUP_COLORS.length] }

export default function GroupScreen() {
  const { id, initialTab, openInvite } = useLocalSearchParams<{ id: string; initialTab?: string; openInvite?: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<GroupTab>(initialTab === 'chat' ? 'chat' : 'challenges')
  const [inviteModalOpen, setInviteModalOpen] = useState(openInvite === '1')

  useEffect(() => {
    if (openInvite === '1') setInviteModalOpen(true)
  }, [])
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [savingCover, setSavingCover] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsApi.get(id),
  })

  const { data: messagesData, refetch: refetchMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['group-messages', id],
    queryFn: () => groupsApi.getMessages(id),
    enabled: activeTab === 'chat',
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  const startMutation = useMutation({
    mutationFn: (challengeId: string) => challengesApi.start(challengeId),
    onSuccess: () => refetch(),
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar al miembro'),
  })

  function confirmRemoveMember(userId: string, name: string) {
    Alert.alert(
      'Eliminar miembro',
      `¿Eliminar a ${name} del grupo? Se borrará su progreso en todos los retos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeMemberMutation.mutate(userId) },
      ],
    )
  }

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list(),
    enabled: inviteModalOpen,
  })

  const { data: myChallengesData } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const group = data?.group as (Group & { members: GroupMember[]; challenges: Challenge[] }) | undefined
  const myRole = data?.my_role
  const messages = (messagesData?.messages ?? []) as GroupMessage[]

  const groupColor = group ? pickColor(group.name) : Colors.primary
  const memberIds = new Set((group?.members ?? []).map((m) => m.user_id))
  const friendsNotInGroup = (friendsData?.friends ?? []).filter((f) => !memberIds.has(f.id))

  // ── Stable callbacks (must be before any early return) ──────────────────────
  const renderMessage = useCallback(({ item: msg }: { item: GroupMessage }) => {
    const isMe = msg.user_id === user?.id
    const name = msg.user?.display_name ?? msg.user?.username ?? '?'
    const initial = name[0]?.toUpperCase() ?? '?'
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && (
          msg.user?.avatar_url ? (
            <Image source={{ uri: msg.user.avatar_url }} style={styles.bubbleAvatar} />
          ) : (
            <View style={[styles.bubbleAvatar, styles.bubbleAvatarPlaceholder]}>
              <Text style={styles.bubbleAvatarText}>{initial}</Text>
            </View>
          )
        )}
        <View style={[styles.bubbleBody, isMe ? styles.bubbleBodyMe : styles.bubbleBodyThem]}>
          {!isMe && <Text style={[styles.bubbleName, { color: groupColor }]}>{name}</Text>}
          <Text style={styles.bubbleText}>{msg.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {formatRelativeTime(msg.created_at)}
          </Text>
        </View>
      </View>
    )
  }, [user?.id, groupColor])

  async function handleInviteFriend(friendId: string) {
    try {
      await groupsApi.inviteFriend(group!.id, friendId)
      setInvitedIds((prev) => new Set([...prev, friendId]))
    } catch {
      Alert.alert('Error', 'No se pudo enviar la invitación')
    }
  }

  async function handleSend() {
    const text = messageText.trim()
    if (!text || sending) return
    setSending(true)
    setMessageText('')
    try {
      await groupsApi.sendMessage(id, text)
      qc.invalidateQueries({ queryKey: ['group-messages', id] })
    } catch {
      setMessageText(text)
      Alert.alert('Error', 'No se pudo enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  async function handleShare() {
    Share.share({
      message: `¡Únete a mi grupo DoIt "${group!.name}"! Usa el código de invitación: ${group!.invite_code}\n\nDescarga DoIt para competir en hábitos reales con apuestas reales.`,
    })
  }

  async function handlePickCoverImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    })
    if (result.canceled || !result.assets?.[0]) return
    setSavingCover(true)
    try {
      const url = await uploadGroupCoverPhoto(result.assets[0].uri)
      await groupsApi.updateCover(id, { cover_image: url, cover_color: null })
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      setCoverModalOpen(false)
    } catch {
      Alert.alert('Error', 'No se pudo subir la imagen')
    } finally {
      setSavingCover(false)
    }
  }

  async function handleSaveColor() {
    if (!selectedColor) return
    setSavingCover(true)
    try {
      await groupsApi.updateCover(id, { cover_color: selectedColor, cover_image: null })
      qc.invalidateQueries({ queryKey: ['group', id] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      setCoverModalOpen(false)
      setSelectedColor(null)
    } catch {
      Alert.alert('Error', 'No se pudo guardar')
    } finally {
      setSavingCover(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading || !group) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const activeChallenges = group.challenges?.filter((c) => c.status === 'active') ?? []
  const pendingChallenges = group.challenges?.filter((c) => c.status === 'pending') ?? []

  // ── Shared JSX pieces ───────────────────────────────────────────────────────
  const inviteModal = (
    <Modal visible={inviteModalOpen} transparent animationType="slide" onRequestClose={() => setInviteModalOpen(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInviteModalOpen(false)} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Invitar al grupo</Text>

        {/* Invite code display */}
        <View style={styles.inviteCodeBox}>
          <Text style={styles.inviteCodeLabel}>Código de invitación</Text>
          <Text style={styles.inviteCodeText}>{group.invite_code}</Text>
          <Text style={styles.inviteCodeHint}>Comparte este código para que otros se unan</Text>
        </View>

        <TouchableOpacity style={styles.shareLinkBtn} onPress={() => { setInviteModalOpen(false); handleShare() }}>
          <View style={styles.shareLinkIcon}>
            <MaterialCommunityIcons name="link-variant" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareLinkTitle}>Compartir enlace</Text>
            <Text style={styles.shareLinkSub}>Cualquiera con el enlace puede unirse</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.modalSection}>Tus amigos</Text>
        {friendsNotInGroup.length === 0 ? (
          <Text style={styles.modalEmpty}>
            {(friendsData?.friends ?? []).length === 0
              ? 'Aún no tienes amigos en la app'
              : 'Todos tus amigos ya están en este grupo'}
          </Text>
        ) : (
          <FlatList
            data={friendsNotInGroup}
            keyExtractor={(f) => f.id}
            style={styles.modalList}
            renderItem={({ item }) => {
              const alreadyInvited = invitedIds.has(item.id)
              return (
                <View style={styles.modalFriendRow}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{(item.display_name ?? item.username)[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFriendName}>{item.display_name ?? item.username}</Text>
                    <Text style={styles.modalFriendUser}>@{item.username}</Text>
                  </View>
                  {alreadyInvited ? (
                    <View style={styles.invitedBadge}>
                      <Text style={styles.invitedBadgeText}>Enviado</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.inviteFriendBtn} onPress={() => handleInviteFriend(item.id)}>
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
  )

  const heroCard = (
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
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: groupColor + '20', borderColor: groupColor + '40' }]}
          onPress={() => setInviteModalOpen(true)}
        >
          <MaterialCommunityIcons name="account-plus-outline" size={16} color={groupColor} />
          <Text style={[styles.inviteBtnText, { color: groupColor }]}>Invitar</Text>
        </TouchableOpacity>
        {myRole === 'admin' && (
          <TouchableOpacity
            style={styles.heroEditBtn}
            onPress={() => setCoverModalOpen(true)}
          >
            <MaterialCommunityIcons name="pencil" size={16} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
        {group.members?.map((m) => {
          const u = m.user as { id?: string; username: string; display_name?: string | null; avatar_url?: string | null } | undefined
          const name = u?.display_name ?? u?.username ?? '?'
          const isAdmin = m.role === 'admin'
          const canRemove = myRole === 'admin' && m.user_id !== user?.id
          return (
            <View key={m.id} style={styles.memberChip}>
              {u?.avatar_url ? (
                <Image source={{ uri: u.avatar_url }} style={[styles.memberAvatar, styles.memberAvatarImg]} />
              ) : (
                <View style={[styles.memberAvatar, isAdmin && { backgroundColor: groupColor }]}>
                  <Text style={styles.memberAvatarText}>{name[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View>
                <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                {isAdmin && <Text style={[styles.adminTag, { color: groupColor }]}>Admin</Text>}
              </View>
              {canRemove && (
                <TouchableOpacity
                  onPress={() => confirmRemoveMember(m.user_id, name)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MaterialCommunityIcons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )

  const tabPill = (
    <View style={styles.tabPill}>
      <TouchableOpacity
        style={[styles.tabOption, activeTab === 'challenges' && styles.tabOptionActive]}
        onPress={() => setActiveTab('challenges')}
      >
        <Text style={[styles.tabOptionText, activeTab === 'challenges' && styles.tabOptionTextActive]}>Retos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabOption, activeTab === 'chat' && styles.tabOptionActive]}
        onPress={() => setActiveTab('chat')}
      >
        <Text style={[styles.tabOptionText, activeTab === 'chat' && styles.tabOptionTextActive]}>Chat</Text>
      </TouchableOpacity>
    </View>
  )

  // ── Retos tab ───────────────────────────────────────────────────────────────
  if (activeTab === 'challenges') {
    return (
      <>
        <Stack.Screen options={{ title: group.name }} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        >
          {heroCard}
          {tabPill}

          {activeChallenges.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Activos</Text>
              </View>
              {activeChallenges.map((c) => {
                const cc = c as Challenge & { _count?: { participants?: number }; participants?: { total_checkins?: number }[] }
                return (
                  <ChallengeRetoCard
                    key={c.id}
                    variant="group"
                    challenge={c}
                    participantCount={cc._count?.participants}
                    rewardDescription={c.reward_description}
                    onPress={() => router.push(`/challenge/${c.id}`)}
                  />
                )
              })}
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
            onPress={() => {
              const total = (myChallengesData?.challenges ?? []).length
              if (!user?.is_pro && total >= 1) { router.push('/premium'); return }
              router.push({ pathname: '/challenge/create', params: { groupId: id } })
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.createBtnText}>Crear nuevo reto</Text>
          </TouchableOpacity>
        </ScrollView>
        {inviteModal}
        <Modal visible={coverModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.coverSheet}>
              <View style={styles.coverSheetHandle} />
              <Text style={styles.coverSheetTitle}>Personalizar grupo</Text>

              {/* Image option */}
              <TouchableOpacity style={styles.coverImageBtn} onPress={handlePickCoverImage} disabled={savingCover}>
                <MaterialCommunityIcons name="image-plus" size={22} color={Colors.primary} />
                <Text style={styles.coverImageBtnText}>Cambiar foto de portada</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.coverDivider}>
                <View style={styles.coverDividerLine} />
                <Text style={styles.coverDividerText}>o elige un color</Text>
                <View style={styles.coverDividerLine} />
              </View>

              {/* Color palette */}
              <View style={styles.colorGrid}>
                {COVER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <MaterialCommunityIcons name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.coverActions}>
                <TouchableOpacity
                  style={styles.coverCancelBtn}
                  onPress={() => { setCoverModalOpen(false); setSelectedColor(null) }}
                >
                  <Text style={styles.coverCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.coverSaveBtn, (!selectedColor || savingCover) && { opacity: 0.4 }]}
                  onPress={handleSaveColor}
                  disabled={!selectedColor || savingCover}
                >
                  {savingCover
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={styles.coverSaveText}>Guardar color</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    )
  }

  // ── Chat tab ────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <KeyboardAvoidingView
        style={styles.chatScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Fixed header */}
        <View style={styles.chatHeader}>
          {heroCard}
          {tabPill}
        </View>

        {/* Messages */}
        {isMessagesLoading ? (
          <View style={styles.chatLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.chatEmpty}>
            <MaterialCommunityIcons name="chat-outline" size={48} color={Colors.border} />
            <Text style={styles.chatEmptyTitle}>Sin mensajes aún</Text>
            <Text style={styles.chatEmptySub}>Sé el primero en escribir algo</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onRefresh={refetchMessages}
            refreshing={false}
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={Colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#000" />
              : <MaterialCommunityIcons name="send" size={20} color="#000" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {inviteModal}
      <Modal visible={coverModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.coverSheet}>
            <View style={styles.coverSheetHandle} />
            <Text style={styles.coverSheetTitle}>Personalizar grupo</Text>

            {/* Image option */}
            <TouchableOpacity style={styles.coverImageBtn} onPress={handlePickCoverImage} disabled={savingCover}>
              <MaterialCommunityIcons name="image-plus" size={22} color={Colors.primary} />
              <Text style={styles.coverImageBtnText}>Cambiar foto de portada</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.coverDivider}>
              <View style={styles.coverDividerLine} />
              <Text style={styles.coverDividerText}>o elige un color</Text>
              <View style={styles.coverDividerLine} />
            </View>

            {/* Color palette */}
            <View style={styles.colorGrid}>
              {COVER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.coverActions}>
              <TouchableOpacity
                style={styles.coverCancelBtn}
                onPress={() => { setCoverModalOpen(false); setSelectedColor(null) }}
              >
                <Text style={styles.coverCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.coverSaveBtn, (!selectedColor || savingCover) && { opacity: 0.4 }]}
                onPress={handleSaveColor}
                disabled={!selectedColor || savingCover}
              >
                {savingCover
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.coverSaveText}>Guardar color</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '70%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalSection: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  modalEmpty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  modalList: { maxHeight: 280 },
  inviteCodeBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  inviteCodeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  inviteCodeText: { color: Colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  inviteCodeHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  shareLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surfaceElevated, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  shareLinkIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  shareLinkTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  shareLinkSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  modalFriendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '25', alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  modalFriendName: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  modalFriendUser: { color: Colors.textMuted, fontSize: 12 },
  inviteFriendBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.primary },
  inviteFriendBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  invitedBadge: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
  },
  invitedBadgeText: { color: Colors.textMuted, fontWeight: '600', fontSize: 12 },

  heroCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 3, marginBottom: 16, gap: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { fontWeight: '900', fontSize: 22 },
  heroInfo: { flex: 1 },
  groupName: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  memberCountText: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1,
  },
  inviteBtnText: { fontWeight: '700', fontSize: 13 },
  membersScroll: { gap: 10 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceElevated, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border,
  },
  memberAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarImg: { backgroundColor: 'transparent' },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  memberName: { color: Colors.text, fontSize: 13, fontWeight: '600', maxWidth: 70 },
  adminTag: { fontSize: 10, fontWeight: '700', marginTop: 1 },

  tabPill: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 12, padding: 4, marginBottom: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabOptionActive: { backgroundColor: Colors.primary },
  tabOptionText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabOptionTextActive: { color: '#000' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  sectionTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  startBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    marginTop: -2, marginBottom: 12,
  },
  startBtnLoading: { opacity: 0.6 },
  startBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  createBtn: {
    borderWidth: 1.5, borderColor: Colors.primary + '60', borderStyle: 'dashed',
    borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 18,
  },
  createBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 15 },

  chatScreen: { flex: 1, backgroundColor: Colors.background },
  chatHeader: { paddingHorizontal: 20, paddingTop: 20 },
  chatLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  chatEmptyTitle: { color: Colors.textSecondary, fontSize: 17, fontWeight: '700' },
  chatEmptySub: { color: Colors.textMuted, fontSize: 14 },
  messageList: { padding: 16, gap: 10 },

  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 4 },
  bubbleMe: { justifyContent: 'flex-end' },
  bubbleThem: { justifyContent: 'flex-start' },
  bubbleAvatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 4, flexShrink: 0 },
  bubbleAvatarPlaceholder: { backgroundColor: Colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
  bubbleAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  bubbleBody: { maxWidth: '78%', borderRadius: 18, padding: 12, gap: 4 },
  bubbleBodyThem: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4,
  },
  bubbleBodyMe: {
    backgroundColor: Colors.primary + '22', borderWidth: 1, borderColor: Colors.primary + '44', borderBottomRightRadius: 4,
  },
  bubbleName: { fontSize: 12, fontWeight: '800' },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: Colors.textMuted, fontSize: 11, alignSelf: 'flex-start' },
  bubbleTimeMe: { alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  messageInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.text, fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  heroEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    gap: 16,
  },
  coverSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  coverSheetTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  coverImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coverImageBtnText: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  coverDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coverDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  coverDividerText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  coverActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  coverCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  coverCancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  coverSaveBtn: {
    flex: 2, backgroundColor: Colors.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  coverSaveText: { color: '#000', fontWeight: '800', fontSize: 15 },
})
