import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, TextInput, Image, Alert,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usersApi, friendsApi, authApi, ApiError } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'
import { INTRO_STORAGE_KEY } from '../../hooks/useAuth'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'
import { ChallengeCard } from '../../components/ChallengeCard'
import { AvatarPicker } from '../../components/AvatarPicker'
import { ProBadge } from '../../components/ProBadge'
import { LEVEL_THRESHOLDS } from '../../constants'
import type { Challenge, User } from '@doit/shared'

type ProfileTab = 'active' | 'medals'

// ─── Medal definitions ─────────────────────────────────────────────────────
type Medal = {
  id: string
  title: string
  subtitle: string
  icon: string
  threshold: number
  iconColor: string
  glowColor: string
}

const STREAK_MEDALS: Medal[] = [
  {
    id: 'streak_3',
    title: '3 días',
    subtitle: 'Primera chispa',
    icon: 'fire',
    threshold: 3,
    iconColor: Colors.primary,
    glowColor: Colors.primary,
  },
  {
    id: 'streak_31',
    title: '31 días',
    subtitle: 'Un mes en llamas',
    icon: 'fire',
    threshold: 31,
    iconColor: Colors.primarySoft,
    glowColor: Colors.primarySoft,
  },
  {
    id: 'streak_90',
    title: '90 días',
    subtitle: 'Hábito forjado',
    icon: 'shield-check',
    threshold: 90,
    iconColor: Colors.study,
    glowColor: Colors.study,
  },
  {
    id: 'streak_365',
    title: '365 días',
    subtitle: 'Leyenda',
    icon: 'crown',
    threshold: 365,
    iconColor: Colors.streakGold,
    glowColor: Colors.streakGold,
  },
]

export default function ProfileScreen() {
  const { user, reset, isLoading, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [tab, setTab] = useState<ProfileTab>('active')
  const [editOpen, setEditOpen] = useState(false)

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: statsData } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user?.id,
  })

  const { data: friendCountData } = useQuery({
    queryKey: ['friend-count', user?.id],
    queryFn: () => friendsApi.getCount(user!.id),
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
const longestStreak = stats?.longest_streak ?? 0

  function openEdit() {
    setEditDisplayName(user?.display_name ?? '')
    setEditUsername(user?.username ?? '')
    setEditAvatarUrl(user?.avatar_url ?? null)
    setUsernameAvailable(null)
    setEditOpen(true)
  }

  async function checkUsername(val: string) {
    if (val === user?.username) { setUsernameAvailable(true); return }
    if (val.length < 3) { setUsernameAvailable(null); return }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameAvailable(false); return }
    setCheckingUsername(true)
    try {
      const res = await authApi.checkUsername(val)
      setUsernameAvailable(res.available)
    } finally {
      setCheckingUsername(false)
    }
  }

  function handleEditUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setEditUsername(clean)
    setUsernameAvailable(null)
    if (clean.length >= 3) {
      const timer = setTimeout(() => checkUsername(clean), 400)
      return () => clearTimeout(timer)
    }
  }

  async function handleSave() {
    if (!user) return
    if (editUsername.length < 3 || usernameAvailable === false) return
    setSaving(true)
    try {
      const res = await usersApi.updateUser(user.id, {
        display_name: editDisplayName || undefined,
        username: editUsername !== user.username ? editUsername : undefined,
        avatar_url: editAvatarUrl,
      })
      setUser(res.user as User)
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['user-stats', user.id] })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al guardar los cambios'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    await AsyncStorage.removeItem(INTRO_STORAGE_KEY)
    queryClient.clear()
    reset()
    router.replace('/')
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUserText}>No hay sesión activa</Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={async () => { await supabase.auth.signOut(); queryClient.clear(); reset() }}
        >
          <Text style={styles.signInBtnText}>Ir a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const initial = (user.display_name ?? user.username)[0].toUpperCase()

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{user.display_name ?? user.username}</Text>
            {user.is_pro && <ProBadge size="md" />}
          </View>
          <Text style={styles.username}>@{user.username}</Text>

          <View style={styles.badgeRow}>
            {(stats?.longest_streak ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Mejor Racha: {stats!.longest_streak} días</Text>
              </View>
            )}
            <View style={[styles.badge, styles.levelBadge]}>
              <Text style={[styles.badgeText, styles.levelBadgeText]}>Nivel {user.level}</Text>
            </View>
          </View>

        </View>

        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Text style={styles.editBtnText}>Editar perfil</Text>
        </TouchableOpacity>
        {!user.is_pro && (
          <TouchableOpacity style={styles.proBtn} onPress={() => router.push('/premium')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="crown" size={14} color="#000" />
            <Text style={styles.proBtnText}>Hazte Pro</Text>
          </TouchableOpacity>
        )}

        {/* XP bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>{user.xp} XP</Text>
            {xpForNext && <Text style={styles.xpNext}>Siguiente nivel: {xpForNext} XP</Text>}
          </View>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${xpProgress}%` as `${number}%` }]} />
          </View>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="Retos" value={stats.total_challenges} color={Colors.primary} />
            <StatCard label="Check-ins" value={stats.total_checkins} color="#FF9A3D" />
            <StatCard label="Mejor Racha" value={stats.longest_streak} color="#E8A820" />
          </View>
        )}

        {/* Friends button */}
        <TouchableOpacity style={styles.friendsBtn} onPress={() => router.push('/friends')}>
          <Text style={styles.friendsBtnLabel}>Amigos</Text>
          <Text style={styles.friendsBtnCount}>{friendCountData?.count ?? 0}</Text>
        </TouchableOpacity>

        {/* Challenge tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'active' && styles.tabActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
              Activos{activeChallenges.length > 0 ? ` (${activeChallenges.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'medals' && styles.tabActive]}
            onPress={() => setTab('medals')}
          >
            <Text style={[styles.tabText, tab === 'medals' && styles.tabTextActive]}>Medallas</Text>
          </TouchableOpacity>
        </View>

        {tab === 'active' && (
          <View style={styles.tabContent}>
            {activeChallenges.length === 0 ? (
              <Text style={styles.emptyTabText}>Sin retos activos</Text>
            ) : (
              activeChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)
            )}
          </View>
        )}

        {tab === 'medals' && (
          <View style={styles.medalsGrid}>
            {STREAK_MEDALS.map((medal) => {
              const earned = longestStreak >= medal.threshold
              return (
                <View
                  key={medal.id}
                  style={[styles.medalCard, earned && { borderColor: medal.glowColor + '50' }]}
                >
                  <View style={[
                    styles.medalIconWrap,
                    earned
                      ? { backgroundColor: medal.glowColor + '20', borderColor: medal.glowColor + '40' }
                      : styles.medalIconWrapLocked,
                  ]}>
                    <MaterialCommunityIcons
                      name={medal.icon as any}
                      size={36}
                      color={earned ? medal.iconColor : Colors.textMuted}
                      style={earned ? {
                        textShadowColor: medal.glowColor,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 12,
                      } : undefined}
                    />
                  </View>
                  <Text style={[styles.medalTitle, earned && { color: Colors.text }]}>
                    {medal.title}
                  </Text>
                  <Text style={styles.medalSubtitle}>{medal.subtitle}</Text>
                  <View style={[styles.medalStatus, earned && styles.medalStatusEarned]}>
                    <MaterialCommunityIcons
                      name={earned ? 'check-circle' : 'lock-outline'}
                      size={11}
                      color={earned ? medal.iconColor : Colors.textMuted}
                    />
                    <Text style={[styles.medalStatusText, earned && { color: medal.iconColor }]}>
                      {earned ? 'Desbloqueada' : `${medal.threshold} días`}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>

            {/* Avatar picker */}
            <View style={styles.modalAvatarRow}>
              <AvatarPicker
                size={84}
                initial={(editDisplayName || editUsername || 'U')[0].toUpperCase()}
                currentUrl={editAvatarUrl}
                onUpload={setEditAvatarUrl}
              />
            </View>

            <Text style={styles.fieldLabel}>Nombre para mostrar</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tu nombre"
              placeholderTextColor={Colors.textMuted}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              maxLength={50}
            />

            <Text style={styles.fieldLabel}>Nombre de usuario</Text>
            <TextInput
              style={[
                styles.modalInput,
                usernameAvailable === true && styles.inputSuccess,
                usernameAvailable === false && styles.inputError,
              ]}
              placeholder="usuario"
              placeholderTextColor={Colors.textMuted}
              value={editUsername}
              onChangeText={handleEditUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {checkingUsername ? (
              <Text style={styles.fieldHint}>Verificando...</Text>
            ) : usernameAvailable === false ? (
              <Text style={[styles.fieldHint, { color: Colors.error }]}>No disponible</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditOpen(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (saving || usernameAvailable === false || editUsername.length < 3) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving || usernameAvailable === false || editUsername.length < 3}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  centered: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  noUserText: { color: Colors.textSecondary, fontSize: 16 },
  signInBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  signInBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },

  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatarWrap: { marginBottom: 14 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primaryDim },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primaryDim,
  },
  avatarText: { color: '#000', fontWeight: '900', fontSize: 38 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  displayName: { color: Colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  username: { color: Colors.textSecondary, fontSize: 15, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  badge: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border,
  },
  badgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  levelBadge: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary + '44' },
  levelBadgeText: { color: Colors.primary },
  editBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    marginBottom: 24,
    alignSelf: 'center',
  },
  editBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  proBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  xpSection: { marginBottom: 20, gap: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  xpNext: { color: Colors.textMuted, fontSize: 13 },
  xpBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  friendsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
  },
  friendsBtnLabel: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  friendsBtnCount: { color: Colors.primary, fontWeight: '800', fontSize: 15 },

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  tabContent: {},
  emptyTabText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 36, fontSize: 15 },

  // Medals
  medalsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  medalCard: {
    width: '47.5%',
    backgroundColor: Colors.surface,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    padding: 16, alignItems: 'center', gap: 8,
  },
  medalIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  medalIconWrapLocked: {
    backgroundColor: Colors.surfaceElevated, borderColor: Colors.border,
  },
  medalTitle: { color: Colors.textMuted, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  medalSubtitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  medalStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  medalStatusEarned: { borderColor: 'transparent' },
  medalStatusText: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },

  signOutBtn: {
    marginTop: 24, backgroundColor: Colors.surface, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '40',
  },
  signOutText: { color: Colors.error, fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, gap: 12,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalAvatarRow: { alignItems: 'center', paddingVertical: 8 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border,
  },
  inputSuccess: { borderColor: Colors.success },
  inputError: { borderColor: Colors.error },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
})
