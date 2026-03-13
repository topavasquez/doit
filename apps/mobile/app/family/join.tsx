import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { familyApi } from '../../lib/api'
import { Colors } from '../../constants/colors'

export default function FamilyJoinScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [digits, setDigits] = useState('')

  const joinMutation = useMutation({
    mutationFn: () => familyApi.join(`FAM-${digits.trim()}`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['family-challenges'] })
      router.replace(`/family/${res.challenge.id}`)
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message ?? 'Código inválido')
    },
  })

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/compete')}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="account-group" size={40} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Unirse a un reto</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de invitación que te compartió el organizador
        </Text>

        {/* Code display */}
        <View style={styles.codeDisplay}>
          <Text style={styles.codePrefix}>FAM-</Text>
          <Text style={[styles.codeDigits, digits.length === 0 && styles.codePlaceholder]}>
            {digits.length > 0 ? digits : '0000'}
          </Text>
        </View>

        {/* Hidden input for keyboard */}
        <TextInput
          style={styles.hiddenInput}
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          caretHidden
        />

        {/* Hint */}
        <Text style={styles.hint}>Toca arriba para editar · {digits.length}/4 dígitos</Text>

        <TouchableOpacity
          style={[styles.joinBtn, (joinMutation.isPending || digits.length < 4) && styles.joinBtnDisabled]}
          onPress={() => joinMutation.mutate()}
          activeOpacity={0.85}
          disabled={joinMutation.isPending || digits.length < 4}
        >
          <MaterialCommunityIcons name="arrow-right-circle-outline" size={22} color="#000" />
          <Text style={styles.joinBtnText}>
            {joinMutation.isPending ? 'Uniéndose...' : 'Unirse al reto'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  backBtn: {
    margin: 20,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 20,
  },

  iconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    color: Colors.text, fontSize: 26, fontWeight: '900',
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary, fontSize: 14, textAlign: 'center',
    lineHeight: 21, marginBottom: 36, paddingHorizontal: 8,
  },

  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
    paddingHorizontal: 28,
    paddingVertical: 20,
    marginBottom: 8,
  },
  codePrefix: {
    color: Colors.primary, fontSize: 30, fontWeight: '900', letterSpacing: 1,
  },
  codeDigits: {
    color: Colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 8,
    minWidth: 100,
  },
  codePlaceholder: { color: Colors.border },

  hiddenInput: {
    position: 'absolute',
    width: 1, height: 1, opacity: 0,
  },

  hint: {
    color: Colors.textMuted, fontSize: 12, marginBottom: 32,
  },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  joinBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  joinBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
})
