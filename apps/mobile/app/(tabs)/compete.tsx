import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, familyApi } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'
import { ChallengeRetoCard } from '../../components/ChallengeRetoCard'
import type { Challenge, ChallengeParticipant } from '@doit/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonalChallenge = Challenge & {
  my_participation?: Pick<
    ChallengeParticipant,
    'streak_current' | 'streak_longest' | 'total_checkins'
  > | null
  has_checked_in_today?: boolean
}

// ─── Family types & card ──────────────────────────────────────────────────────

type FamilyChallenge = {
  id: string; title: string; description: string | null
  status: string; frequency: string; duration_days: number
  reward_description: string | null; invite_code: string
  role: string; participant_count: number; my_checkins: number
}

function FamilyCard({ challenge, onPress }: { challenge: FamilyChallenge; onPress: () => void }) {
  const isAdmin = challenge.role === 'admin'
  const total = challenge.frequency === 'daily' ? challenge.duration_days : Math.ceil(challenge.duration_days / 7)
  const pct = total > 0 ? Math.min(1, challenge.my_checkins / total) : 0

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.cardCover, { backgroundColor: Colors.primary + '15' }]}>
        <View style={[styles.coverCircle, { backgroundColor: Colors.primary + '18' }]} />
        <MaterialCommunityIcons name="account-child" size={48} color={Colors.primary} style={{ opacity: 0.85 }} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.familyMeta}>
          <View style={[styles.rolePill, { backgroundColor: isAdmin ? Colors.primary + '20' : Colors.surfaceElevated }]}>
            <MaterialCommunityIcons
              name={isAdmin ? 'shield-account-outline' : 'account-outline'}
              size={12}
              color={isAdmin ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.roleText, { color: isAdmin ? Colors.primary : Colors.textMuted }]}>
              {isAdmin ? 'Admin' : 'Participante'}
            </Text>
          </View>
          <View style={[styles.statusDotWrap, { backgroundColor: challenge.status === 'active' ? Colors.primary + '20' : Colors.surfaceElevated }]}>
            <View style={[styles.statusDot, { backgroundColor: challenge.status === 'active' ? Colors.primary : Colors.textMuted }]} />
            <Text style={[styles.statusDotText, { color: challenge.status === 'active' ? Colors.primary : Colors.textMuted }]}>
              {challenge.status === 'active' ? 'Activo' : challenge.status === 'pending' ? 'Pendiente' : 'Completado'}
            </Text>
          </View>
        </View>
        <Text style={styles.familyTitle} numberOfLines={2}>{challenge.title}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{challenge.my_checkins}/{total}</Text>
        </View>
        {challenge.reward_description ? (
          <View style={styles.rewardRow}>
            <MaterialCommunityIcons name="gift-outline" size={14} color={Colors.primary} />
            <Text style={styles.rewardText} numberOfLines={1}>{challenge.reward_description}</Text>
          </View>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={styles.participantsBadge}>
            <MaterialCommunityIcons name="account-multiple-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.participantsText}>{challenge.participant_count} participante{challenge.participant_count !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.codeChip}>
            <Text style={styles.codeChipText}>{challenge.invite_code}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyTab({
  icon, title, subtitle, onPress,
}: {
  icon: string; title: string; subtitle: string; onPress?: () => void
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <MaterialCommunityIcons name={icon as any} size={36} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {onPress && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onPress} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={16} color="#000" />
          <Text style={styles.emptyBtnText}>Crear reto</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'personal' | 'familia'

export default function RetosScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('personal')

  const {
    data: challengesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-challenges', user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const {
    data: familyData,
    isLoading: familyLoading,
    refetch: familyRefetch,
    isRefetching: familyRefetching,
  } = useQuery({
    queryKey: ['family-challenges'],
    queryFn: () => familyApi.list(),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  const {
    data: familyInvitesData,
    refetch: refetchFamilyInvites,
  } = useQuery({
    queryKey: ['family-invites'],
    queryFn: () => familyApi.getInvites(),
    enabled: !!user?.id && tab === 'familia',
    staleTime: 15_000,
  })

  const acceptFamilyInviteMutation = useMutation({
    mutationFn: (nid: string) => familyApi.acceptInvite(nid),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['family-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['family-invites'] })
      router.push(`/family/${res.challenge.id}`)
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  })

  const declineFamilyInviteMutation = useMutation({
    mutationFn: (nid: string) => familyApi.declineInvite(nid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family-invites'] }),
  })

  useFocusEffect(
    useCallback(() => { refetch(); familyRefetch(); refetchFamilyInvites() }, []),
  )

  const allChallenges = (challengesData?.challenges ?? []) as PersonalChallenge[]
  // Personal tab: only challenges with no group (group_id === null)
  const personalChallenges = allChallenges.filter((c) => !(c as any).group_id)
  const activeChallenges = personalChallenges.filter((c) => c.status === 'active')
  const familyChallenges = (familyData?.challenges ?? []) as FamilyChallenge[]

  function handleFab() {
    if (tab === 'familia') {
      router.push('/family/create')
      return
    }
    if (!user?.is_pro && activeChallenges.length >= 1) {
      router.push('/premium')
      return
    }
    router.push('/challenge/create')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user?.is_pro) {
    return (
      <View style={styles.container}>
        <View style={styles.paywallWrap}>
          {/* Crown icon */}
          <View style={styles.paywallCrownCircle}>
            <MaterialCommunityIcons name="crown" size={40} color={Colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.paywallTitle}>Retos</Text>

          {/* PRO badge */}
          <View style={styles.paywallProBadge}>
            <MaterialCommunityIcons name="crown" size={12} color={Colors.primary} />
            <Text style={styles.paywallProBadgeText}>PRO</Text>
          </View>

          {/* Heading */}
          <Text style={styles.paywallHeading}>
            Lleva tus hábitos al siguiente nivel
          </Text>

          {/* Subtitle */}
          <Text style={styles.paywallSubtitle}>
            Los retos personales y familiares son exclusivos para suscriptores. Elige el plan que mejor se adapte a ti.
          </Text>

          {/* Benefits */}
          <View style={styles.paywallBenefits}>
            {[
              'Retos personales ilimitados',
              'Retos familiares para toda la familia',
              'Compite sin límites con tus amigos',
            ].map((b) => (
              <View key={b} style={styles.paywallBenefitRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                <Text style={styles.paywallBenefitText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.paywallCta}
            activeOpacity={0.85}
            onPress={() => router.push('/premium')}
          >
            <Text style={styles.paywallCtaText}>Ver planes</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.paywallDismiss} onPress={() => router.back()}>
            <Text style={styles.paywallDismissText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>

      {/* ── Tab pills ────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabPill, tab === 'personal' && styles.tabPillActive]}
          onPress={() => setTab('personal')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="account-outline"
            size={15}
            color={tab === 'personal' ? '#000' : Colors.textSecondary}
          />
          <Text style={[styles.tabPillText, tab === 'personal' && styles.tabPillTextActive]}>
            Personal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, tab === 'familia' && styles.tabPillActive]}
          onPress={() => setTab('familia')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="account-group-outline"
            size={15}
            color={tab === 'familia' ? '#000' : Colors.textSecondary}
          />
          <Text style={[styles.tabPillText, tab === 'familia' && styles.tabPillTextActive]}>
            Familia
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ──────────────────────────────────────────────── */}
      {(isLoading && tab === 'personal') || (familyLoading && tab === 'familia') ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={tab === 'personal' ? isRefetching : familyRefetching}
              onRefresh={tab === 'personal' ? refetch : familyRefetch}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Personal tab */}
          {tab === 'personal' && (
            activeChallenges.length === 0 ? (
              <EmptyTab
                icon="flag-outline"
                title="Sin retos personales"
                subtitle="Crea tu primer reto personal y compite contra ti mismo"
                onPress={handleFab}
              />
            ) : (
              <>
                <Text style={styles.sectionHint}>
                  {activeChallenges.length} {activeChallenges.length === 1 ? 'reto activo' : 'retos activos'}
                </Text>
                {activeChallenges.map((c) => (
                  <ChallengeRetoCard
                    key={c.id}
                    variant="personal"
                    challenge={c}
                    streakCurrent={c.my_participation?.streak_current ?? 0}
                    streakLongest={c.my_participation?.streak_longest ?? 0}
                    totalCheckins={c.my_participation?.total_checkins ?? 0}
                    checkedInToday={c.has_checked_in_today ?? false}
                    onPress={() => router.push(`/challenge/${c.id}`)}
                  />
                ))}
              </>
            )
          )}

          {/* Familia tab */}
          {tab === 'familia' && (
            <>
            {/* Pending family invites */}
            {(familyInvitesData?.invites ?? []).length > 0 && (
              <View style={styles.invitesSection}>
                <Text style={styles.invitesSectionTitle}>INVITACIONES PENDIENTES</Text>
                {familyInvitesData!.invites.map((inv) => (
                  <View key={inv.id} style={styles.inviteCard}>
                    <View style={styles.inviteAvatarWrap}>
                      {inv.inviter?.avatar_url
                        ? <Image source={{ uri: inv.inviter.avatar_url }} style={styles.inviteAvatar} />
                        : <View style={styles.inviteAvatar}>
                            <Text style={styles.inviteAvatarText}>
                              {(inv.inviter?.display_name ?? inv.inviter?.username ?? '?')[0].toUpperCase()}
                            </Text>
                          </View>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inviteTitle} numberOfLines={1}>{inv.challenge_title}</Text>
                      <Text style={styles.inviteFrom}>
                        {inv.inviter?.display_name ?? inv.inviter?.username ?? 'Alguien'} te invitó
                      </Text>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => declineFamilyInviteMutation.mutate(inv.id)}
                        disabled={declineFamilyInviteMutation.isPending}
                      >
                        <MaterialCommunityIcons name="close" size={16} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => acceptFamilyInviteMutation.mutate(inv.id)}
                        disabled={acceptFamilyInviteMutation.isPending}
                      >
                        <Text style={styles.acceptBtnText}>Aceptar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {familyChallenges.length === 0 ? (
              <>
                <EmptyTab
                  icon="account-child-outline"
                  title="Sin retos familiares"
                  subtitle="Crea un reto para tus hijos o únete con un código"
                  onPress={() => router.push('/family/create')}
                />
                <TouchableOpacity
                  style={styles.joinCodeBtn}
                  onPress={() => router.push('/family/join')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color={Colors.textSecondary} />
                  <Text style={styles.joinCodeText}>Unirse con código FAM-XXXX</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionHint}>
                  {familyChallenges.length} {familyChallenges.length === 1 ? 'reto familiar' : 'retos familiares'}
                </Text>
                {familyChallenges.map((c) => (
                  <FamilyCard key={c.id} challenge={c} onPress={() => router.push(`/family/${c.id}`)} />
                ))}
                {/* Join by code */}
                <TouchableOpacity
                  style={styles.joinCodeBtn}
                  onPress={() => router.push('/family/join')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={16} color={Colors.textSecondary} />
                  <Text style={styles.joinCodeText}>Unirse con código FAM-XXXX</Text>
                </TouchableOpacity>
              </>
            )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={28} color="#000" />
      </TouchableOpacity>

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabBar: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabPillActive: { backgroundColor: Colors.primary },
  tabPillText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  tabPillTextActive: { color: '#000' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },

  sectionHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  // Family card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardCover: { height: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -40,
    right: -30,
  },
  cardContent: { padding: 16, gap: 10 },
  familyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  roleText: { fontSize: 11, fontWeight: '700' },
  statusDotWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusDotText: { fontSize: 11, fontWeight: '700' },
  familyTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rewardText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  participantsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantsText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  codeChip: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  codeChipText: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Invite cards
  invitesSection: { marginBottom: 20 },
  invitesSectionTitle: {
    color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1,
    marginBottom: 10,
  },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.primary + '30',
    padding: 12, marginBottom: 8,
  },
  inviteAvatarWrap: {},
  inviteAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  inviteAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  inviteTitle: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  inviteFrom: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  inviteActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  declineBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  joinCodeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 13, marginTop: 4,
  },
  joinCodeText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 64, gap: 12, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  emptySubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 8,
  },
  emptyBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // Paywall
  paywallWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  paywallCrownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
  },
  paywallProBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary + '18',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  paywallProBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paywallHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  paywallBenefits: { gap: 12, alignSelf: 'stretch', marginTop: 4 },
  paywallBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paywallBenefitText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  paywallCta: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  paywallCtaText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '900',
  },
  paywallDismiss: { paddingVertical: 8 },
  paywallDismissText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // FAB — idéntico al de groups.tsx
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },

})
