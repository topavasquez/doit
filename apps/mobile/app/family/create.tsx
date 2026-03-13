import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { familyApi } from '../../lib/api'
import { Colors } from '../../constants/colors'

const DURATIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
] as const

const FREQUENCIES = [
  { label: 'Diario', value: 'daily' as const },
  { label: 'Semanal', value: 'weekly' as const },
]

export default function FamilyCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState<7 | 30 | 90>(30)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [reward, setReward] = useState('')
  const [requirePhoto, setRequirePhoto] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => familyApi.create({
      title: title.trim(),
      description: description.trim() || undefined,
      duration_days: duration,
      frequency,
      reward_description: reward.trim() || undefined,
      require_photo: requirePhoto,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['family-challenges'] })
      router.replace(`/family/${res.challenge.id}`)
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'No se pudo crear el reto')
    },
  })

  function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para el reto')
      return
    }
    createMutation.mutate()
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/compete')}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Reto Familiar</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre del reto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Leer 20 minutos al día"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Cuéntales de qué trata el reto..."
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </View>

        {/* Duration */}
        <View style={styles.field}>
          <Text style={styles.label}>Duración</Text>
          <View style={styles.optionRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.optionBtn, duration === d.value && styles.optionBtnActive]}
                onPress={() => setDuration(d.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, duration === d.value && styles.optionTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.field}>
          <Text style={styles.label}>Frecuencia</Text>
          <View style={styles.optionRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.optionBtn, frequency === f.value && styles.optionBtnActive]}
                onPress={() => setFrequency(f.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, frequency === f.value && styles.optionTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reward */}
        <View style={styles.field}>
          <Text style={styles.label}>Recompensa <Text style={styles.optional}>(opcional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Helado de premio el fin de semana"
            placeholderTextColor={Colors.textMuted}
            value={reward}
            onChangeText={setReward}
            maxLength={200}
          />
        </View>

        {/* Require photo */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Requerir foto</Text>
            <Text style={styles.toggleHint}>Los participantes deben subir una foto como prueba</Text>
          </View>
          <Switch
            value={requirePhoto}
            onValueChange={setRequirePhoto}
            trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
            thumbColor={requirePhoto ? Colors.primary : Colors.textMuted}
          />
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            Tras crear el reto, comparte el código de invitación con los participantes. El reto empieza cuando lo actives.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
          onPress={handleCreate}
          activeOpacity={0.85}
          disabled={createMutation.isPending}
        >
          <MaterialCommunityIcons name="account-group" size={20} color="#000" />
          <Text style={styles.submitBtnText}>
            {createMutation.isPending ? 'Creando...' : 'Crear reto familiar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    marginTop: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },

  field: { marginBottom: 22 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  optional: { color: Colors.textMuted, fontWeight: '500' },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top', paddingTop: 13 },

  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },
  optionTextActive: { color: '#000' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 22,
    gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  toggleHint: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { color: Colors.textMuted, fontSize: 13, flex: 1, lineHeight: 19 },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
})
