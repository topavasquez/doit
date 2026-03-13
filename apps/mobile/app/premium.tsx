import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { User } from '@doit/shared'
import { Colors } from '../constants/colors'

type View_ = 'compare' | 'plans'

const TABLE_ROWS = [
  { label: 'Retos personales',    free: '1',       pro: 'Ilimitados' },
  { label: 'Retos en grupos',     free: '1/grupo', pro: 'Ilimitados' },
  { label: 'Retos familiares',    free: false,     pro: true },
  { label: 'Grupos',              free: '1',       pro: 'Ilimitados' },
  { label: 'Check-ins con foto',  free: true,      pro: true },
  { label: 'Chat de grupo',       free: true,      pro: true },
  { label: 'Modo Fantasma',       free: false,     pro: true },
  { label: 'Medallas',            free: true,      pro: true },
  { label: 'Soporte prioritario', free: false,     pro: true },
]

const PRO_FEATURES = [
  'Retos personales ilimitados',
  'Grupos ilimitados',
  'Retos grupales ilimitados',
  'Retos familiares ilimitados',
  'Modo Fantasma',
  'Historial y estadísticas completas',
]

export default function PremiumScreen() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [view, setView] = useState<View_>('compare')

  const subscribeMutation = useMutation({
    mutationFn: () => usersApi.subscribe(user!.id),
    onSuccess: (res) => {
      setUser(res.user as User)
      router.back()
    },
  })

  // ── Compare view ──────────────────────────────────────────────────────────

  if (view === 'compare') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.crownWrap}>
              <MaterialCommunityIcons name="crown" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>
              DoIt <Text style={{ color: Colors.primary }}>Pro</Text>
            </Text>
            <Text style={styles.subtitle}>
              Todo lo que necesitas para convertir tus hábitos en resultados reales
            </Text>
          </View>

          {/* Comparison table */}
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <View style={styles.featureCol} />
              <View style={styles.planCol}>
                <Text style={styles.planLabelFree}>Gratis</Text>
              </View>
              <View style={styles.planCol}>
                <View style={styles.premiumBadge}>
                  <Text style={styles.planLabelPremium}>Pro</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Rows */}
            {TABLE_ROWS.map((row, i) => (
              <View key={i} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.planCol}>
                  {typeof row.free === 'boolean'
                    ? <MaterialCommunityIcons
                        name={row.free ? 'check' : 'close'}
                        size={18}
                        color={row.free ? Colors.textSecondary : Colors.textMuted}
                      />
                    : <Text style={styles.rowValueFree}>{row.free}</Text>
                  }
                </View>
                <View style={styles.planCol}>
                  {typeof row.pro === 'boolean'
                    ? <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />
                    : <Text style={styles.rowValuePremium}>{row.pro}</Text>
                  }
                </View>
              </View>
            ))}
          </View>

          {/* CTA → plans */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => setView('plans')}
          >
            <Text style={styles.primaryBtnText}>Ver planes</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#000" />
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Ahora no</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    )
  }

  // ── Plans view ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Back header */}
        <View style={styles.plansHeader}>
          <TouchableOpacity style={styles.backArrow} onPress={() => setView('compare')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.plansTitle}>Elige tu plan</Text>
            <Text style={styles.plansSubtitle}>Sin permanencia. Cancela cuando quieras.</Text>
          </View>
          {/* spacer to center title */}
          <View style={{ width: 40 }} />
        </View>

        {/* Plan Familiar — mostrado primero por precio */}
        <View style={styles.planCardFeatured}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
          </View>
          <View style={styles.planCardInner}>
            <View style={styles.planTopRow}>
              <View>
                <Text style={styles.planName}>Familiar</Text>
                <Text style={styles.planSubtitle}>Hasta 6 personas</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>33% descuento</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$24.990</Text>
              <Text style={styles.priceUnit}> / $3.990 por persona</Text>
            </View>
            <Text style={styles.priceNote}>Invita a tu familia · cada uno paga su suscripción</Text>

            <View style={styles.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.planBtn, subscribeMutation.isPending && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
            >
              <Text style={styles.planBtnText}>
                {subscribeMutation.isPending ? 'Activando...' : 'Suscribirse'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Individual */}
        <View style={styles.planCard}>
          <View style={styles.planCardInner}>
            <Text style={styles.planName}>Individual</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$5.990</Text>
              <Text style={styles.priceUnit}>/mes</Text>
            </View>

            <View style={styles.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.planBtnOutline, subscribeMutation.isPending && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={() => subscribeMutation.mutate()}
              disabled={subscribeMutation.isPending}
            >
              <Text style={styles.planBtnOutlineText}>
                {subscribeMutation.isPending ? 'Activando...' : 'Suscribirse'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dismiss */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Ahora no</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingBottom: 48 },

  // ── Compare header ───────────────────────────────────────────────────────
  header: { alignItems: 'center', marginBottom: 32, gap: 12 },
  crownWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { color: Colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // ── Table ────────────────────────────────────────────────────────────────
  table: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 28,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceElevated,
  },
  featureCol: { flex: 1 },
  planCol: { width: 88, alignItems: 'center' },
  planLabelFree: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  premiumBadge: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  planLabelPremium: { color: Colors.primary, fontWeight: '800', fontSize: 13 },
  divider: { height: 1, backgroundColor: Colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowAlt: { backgroundColor: Colors.surfaceElevated + '80' },
  rowLabel: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '600' },
  rowValueFree: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  rowValuePremium: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  // ── Buttons ──────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },

  // ── Plans header ─────────────────────────────────────────────────────────
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backArrow: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  plansTitle: { color: Colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  plansSubtitle: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 2 },

  // ── Plan cards ───────────────────────────────────────────────────────────
  planCardFeatured: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 16,
    overflow: 'hidden',
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  popularBadge: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 6,
  },
  popularBadgeText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planCardInner: { padding: 24, gap: 20 },
  planTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  discountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discountBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  planName: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  planSubtitle: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  priceAmount: { color: Colors.primary, fontSize: 40, fontWeight: '900', lineHeight: 44 },
  priceUnit: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', paddingBottom: 6 },
  priceNote: { color: Colors.textMuted, fontSize: 12, fontWeight: '500', marginTop: -10 },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: Colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  planBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  planBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  planBtnOutline: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  planBtnOutlineText: { color: Colors.primary, fontSize: 16, fontWeight: '900' },
})
