import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { challengesApi } from '../../lib/api'
import { Colors } from '../../constants/colors'
import { HABIT_CATEGORY_CONFIG } from '../../constants'
import type { HabitCategory, ChallengeFrequency, Challenge } from '@doit/shared'

const DURATIONS = [7, 30, 90] as const
const FREQUENCIES: { value: ChallengeFrequency; label: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', desc: 'Check in every day' },
  { value: 'weekly', label: 'Weekly', desc: 'Check in once per week' },
]

export default function CreateChallengeScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<HabitCategory>('gym')
  const [duration, setDuration] = useState<7 | 30 | 90>(30)
  const [frequency, setFrequency] = useState<ChallengeFrequency>('daily')
  const [reward, setReward] = useState('')
  const [ghostMode, setGhostMode] = useState(false)

  const createMutation = useMutation({
    mutationFn: () =>
      challengesApi.create({
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        habit_category: category,
        frequency,
        duration_days: duration,
        reward_description: reward.trim() || undefined,
        ghost_mode: ghostMode,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['group', groupId] })
      const c = res.challenge as Challenge
      router.replace(`/challenge/${c.id}`)
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const canSubmit = title.trim().length >= 3 && !createMutation.isPending

  return (
    <>
      <Stack.Screen options={{ title: 'New Challenge' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Challenge Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30-Day Gym Grind"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are the rules? What counts as a check-in?"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* Habit Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Habit Category *</Text>
          <View style={styles.categoryGrid}>
            {(Object.entries(HABIT_CATEGORY_CONFIG) as [HabitCategory, typeof HABIT_CATEGORY_CONFIG[HabitCategory]][]).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[styles.categoryOption, category === key && styles.categoryOptionActive, category === key && { borderColor: config.color }]}
                onPress={() => setCategory(key)}
              >
                <View style={[styles.categoryDot, { backgroundColor: config.color }]} />
                <Text style={[styles.categoryLabel, category === key && { color: config.color }]}>{config.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.field}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.optionRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.optionBtn, duration === d && styles.optionBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.optionBtnText, duration === d && styles.optionBtnTextActive]}>{d} days</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.field}>
          <Text style={styles.label}>Check-in Frequency</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.freqOption, frequency === f.value && styles.freqOptionActive]}
                onPress={() => setFrequency(f.value)}
              >
                <Text style={[styles.freqLabel, frequency === f.value && styles.freqLabelActive]}>{f.label}</Text>
                <Text style={styles.freqDesc}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reward */}
        <View style={styles.field}>
          <Text style={styles.label}>Reward / Stake</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Losers buy brunch for the whole group"
            placeholderTextColor={Colors.textMuted}
            value={reward}
            onChangeText={setReward}
            maxLength={200}
          />
          <Text style={styles.hint}>Keep it social — dinner, chores, coffee, bragging rights</Text>
        </View>

        {/* Ghost Mode */}
        <View style={styles.field}>
          <TouchableOpacity style={styles.toggleRow} onPress={() => setGhostMode(!ghostMode)}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Ghost Mode</Text>
              <Text style={styles.toggleDesc}>Hide completion % — only show rank. Adds tension.</Text>
            </View>
            <View style={[styles.toggle, ghostMode && styles.toggleOn]}>
              <View style={[styles.toggleKnob, ghostMode && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={() => createMutation.mutate()}
          disabled={!canSubmit}
        >
          <Text style={styles.submitBtnText}>
            {createMutation.isPending ? 'Creating...' : 'Create Challenge'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.submitHint}>You'll need at least 2 participants before starting</Text>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  field: { marginBottom: 24 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { color: Colors.textMuted, fontSize: 12, marginTop: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { width: '30%', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border },
  categoryOptionActive: { backgroundColor: Colors.surfaceElevated },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  optionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  optionBtnTextActive: { color: '#000' },
  freqRow: { flexDirection: 'row', gap: 10 },
  freqOption: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: Colors.border },
  freqOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  freqLabel: { color: Colors.textSecondary, fontWeight: '800', fontSize: 15, marginBottom: 4 },
  freqLabelActive: { color: Colors.primary },
  freqDesc: { color: Colors.textMuted, fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  toggleDesc: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.border, padding: 3 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff9f9' },
  toggleKnobOn: { transform: [{ translateX: 22 }] },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  submitBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  submitBtnText: { color: '#000', fontSize: 17, fontWeight: '800' },
  submitHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
})
