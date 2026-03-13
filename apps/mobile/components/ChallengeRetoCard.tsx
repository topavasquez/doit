import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { HABIT_CATEGORY_CONFIG, formatDaysLeft } from '../constants'

// ─── Category icon map ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  gym: 'dumbbell',
  reading: 'book-open-variant',
  sleep: 'sleep',
  diet: 'food-apple',
  study: 'school-outline',
  custom: 'star-outline',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysElapsedPct(startDate?: string | Date | null, durationDays?: number): number {
  if (!startDate || !durationDays) return 0
  const start = new Date(startDate)
  const now = new Date()
  const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000))
  return Math.min(100, (elapsed / durationDays) * 100)
}

function checkinPct(totalCheckins: number, durationDays?: number): number {
  if (!durationDays) return 0
  return Math.min(100, (totalCheckins / durationDays) * 100)
}

function motivationalMessage(
  streakCurrent: number,
  streakLongest: number,
  checkedInToday: boolean,
): string | null {
  if (checkedInToday && streakCurrent > 0 && streakCurrent === streakLongest && streakLongest > 1) {
    return '¡Nuevo récord de racha! ¡Sigue así!'
  }
  if (!checkedInToday && streakCurrent > 0) {
    const gap = streakLongest - streakCurrent
    if (gap === 0 && streakLongest > 1) return '¡Haz check-in hoy para superar tu récord!'
    if (gap > 0 && gap <= 3) return `¡Estás a ${gap} ${gap === 1 ? 'día' : 'días'} de superar tu mejor racha!`
  }
  if (checkedInToday) return '¡Completado hoy! Vuelve mañana para continuar la racha.'
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BaseChallenge = {
  id: string
  title: string
  habit_category: string
  start_date?: string | Date | null
  end_date?: string | null
  duration_days?: number
  reward_description?: string | null
}

type PersonalVariant = {
  variant: 'personal'
  streakCurrent: number
  streakLongest: number
  totalCheckins: number
  checkedInToday: boolean
}

type GroupVariant = {
  variant: 'group'
  participantCount?: number
  rewardDescription?: string | null
}

type ChallengeRetoCardProps = {
  challenge: BaseChallenge
  onPress: () => void
} & (PersonalVariant | GroupVariant)

// ─── Component ────────────────────────────────────────────────────────────────

export function ChallengeRetoCard(props: ChallengeRetoCardProps) {
  const router = useRouter()
  const { challenge, onPress } = props
  const cat = challenge.habit_category as keyof typeof HABIT_CATEGORY_CONFIG
  const cfg = HABIT_CATEGORY_CONFIG[cat] ?? HABIT_CATEGORY_CONFIG.custom
  const icon = CATEGORY_ICONS[cat] ?? 'flag-outline'

  const isPersonal = props.variant === 'personal'
  const checkedInToday = isPersonal ? (props as PersonalVariant).checkedInToday : false

  const progressPct = isPersonal
    ? checkinPct((props as PersonalVariant).totalCheckins, challenge.duration_days)
    : daysElapsedPct(challenge.start_date, challenge.duration_days)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>

      {/* ── Cover ────────────────────────────────────────────── */}
      <View style={[styles.cover, { backgroundColor: cfg.color + '18' }]}>
        <View style={[styles.coverCircle, { backgroundColor: cfg.color + '20' }]} />
        <MaterialCommunityIcons
          name={icon as any}
          size={48}
          color={cfg.color}
          style={{ opacity: 0.85 }}
        />
        {checkedInToday && (
          <View style={styles.doneBadge}>
            <MaterialCommunityIcons name="check" size={12} color="#000" />
            <Text style={styles.doneBadgeText}>HECHO</Text>
          </View>
        )}
      </View>

      {/* ── Content ──────────────────────────────────────────── */}
      <View style={styles.content}>

        {/* Category + days left */}
        <View style={styles.categoryRow}>
          <View style={[styles.catDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.catLabel, { color: cfg.color }]}>{cfg.label}</Text>
          {challenge.end_date && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaText}>{formatDaysLeft(challenge.end_date)}</Text>
            </>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>

        {/* ── Stats section: personal vs group ─────────────── */}
        {isPersonal ? (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="fire" size={16} color={Colors.streakFire} />
              <Text style={styles.statValue}>{(props as PersonalVariant).streakCurrent}</Text>
              <Text style={styles.statLabel}>racha actual</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy-outline" size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{(props as PersonalVariant).streakLongest}</Text>
              <Text style={styles.statLabel}>mejor racha</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group-outline" size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{(props as GroupVariant).participantCount ?? 0}</Text>
              <Text style={styles.statLabel}>participantes</Text>
            </View>
            {((props as GroupVariant).rewardDescription ?? challenge.reward_description) && (
              <>
                <View style={styles.statDivider} />
                <View style={[styles.statItem, { flex: 2 }]}>
                  <MaterialCommunityIcons name="gift-outline" size={16} color={Colors.primary} />
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {(props as GroupVariant).rewardDescription ?? challenge.reward_description}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {isPersonal ? 'TU PROGRESO' : 'PROGRESO DEL RETO'}
            </Text>
            <Text style={[styles.progressPct, { color: cfg.color }]}>{Math.round(progressPct)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%` as `${number}%`, backgroundColor: cfg.color },
              ]}
            />
          </View>
        </View>

        {/* Motivational message (personal only) */}
        {isPersonal && (() => {
          const p = props as PersonalVariant
          const msg = motivationalMessage(p.streakCurrent, p.streakLongest, p.checkedInToday)
          return msg ? (
            <View style={[styles.motivationPill, { backgroundColor: cfg.color + '14' }]}>
              <Text style={[styles.motivationText, { color: cfg.color }]}>{msg}</Text>
            </View>
          ) : null
        })()}

        {/* Actions: personal only shows Do It button */}
        {isPersonal && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.doItBtn,
                checkedInToday && styles.doItBtnDone,
                { backgroundColor: checkedInToday ? Colors.surface : cfg.color },
              ]}
              onPress={() => {
                if (!checkedInToday) {
                  router.push({
                    pathname: '/challenge/photo-checkin',
                    params: { challengeId: challenge.id, challengeTitle: challenge.title },
                  })
                }
              }}
              activeOpacity={checkedInToday ? 1 : 0.85}
            >
              <MaterialCommunityIcons
                name={checkedInToday ? 'check-circle' : 'camera-outline'}
                size={16}
                color={checkedInToday ? Colors.success : '#000'}
              />
              <Text style={[styles.doItBtnText, checkedInToday && { color: Colors.textSecondary }]}>
                {checkedInToday ? 'Check-in hecho' : 'Do It'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewBtn} onPress={onPress} activeOpacity={0.8}>
              <MaterialCommunityIcons name="chart-line" size={16} color={Colors.textSecondary} />
              <Text style={styles.viewBtnText}>Ver</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // Cover
  cover: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -40,
    right: -30,
  },
  doneBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  doneBadgeText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Content
  content: { padding: 16, gap: 12 },

  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 7, height: 7, borderRadius: 3.5 },
  catLabel: { fontSize: 12, fontWeight: '700' },
  metaSep: { color: Colors.textMuted, fontSize: 12 },
  metaText: { color: Colors.textMuted, fontSize: 12 },

  title: { color: Colors.text, fontSize: 17, fontWeight: '800', lineHeight: 22 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '500', flex: 1 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },

  // Progress
  progressSection: { gap: 6 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressPct: { fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 7,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  // Motivation
  motivationPill: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  motivationText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Actions (personal)
  actions: { flexDirection: 'row', gap: 10 },
  doItBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
  doItBtnDone: { borderWidth: 1, borderColor: Colors.border },
  doItBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  viewBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
})
