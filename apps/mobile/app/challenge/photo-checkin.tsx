import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkinsApi, uploadCheckinPhoto, ApiError } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'

export default function PhotoCheckinScreen() {
  const { challengeId, challengeTitle, groupId } = useLocalSearchParams<{
    challengeId: string
    challengeTitle?: string
    groupId?: string
  }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg')
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  // Abrir la cámara automáticamente al entrar a la pantalla
  useEffect(() => {
    openCamera()
  }, [])

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Se necesita acceso a la cámara para confirmar tu check-in.',
        [{ text: 'OK', onPress: () => router.back() }],
      )
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
      base64: true,
    })

    if (result.canceled) {
      // Si cancela la cámara, vuelve atrás
      router.back()
      return
    }

    if (result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
      if (result.assets[0].mimeType) setPhotoMimeType(result.assets[0].mimeType)
      if (result.assets[0].base64) setPhotoBase64(result.assets[0].base64)
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!photoUri) throw new Error('Se requiere una foto para hacer check-in')

      setUploading(true)
      const photo_url = await uploadCheckinPhoto(photoUri, photoMimeType, photoBase64)
      setUploading(false)

      return checkinsApi.create({
        challenge_id: challengeId,
        notes: notes.trim() || undefined,
        photo_url,
      })
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['challenge', challengeId] })
      qc.invalidateQueries({ queryKey: ['leaderboard', challengeId] })
      qc.invalidateQueries({ queryKey: ['checkins', challengeId] })
      qc.invalidateQueries({ queryKey: ['group-feed', groupId] })
      qc.invalidateQueries({ queryKey: ['my-challenges', user?.id] })
      qc.invalidateQueries({ queryKey: ['user-stats', user?.id] })
      if (groupId) qc.invalidateQueries({ queryKey: ['group', groupId] })

      const navigate = () => {
        router.replace({
          pathname: '/challenge/[id]',
          params: { id: challengeId, ...(groupId ? { initialTab: 'activity' } : {}) },
        })
      }

      if (result.streak > 0 && [7, 14, 21, 30, 60, 90].includes(result.streak)) {
        Alert.alert('Racha lograda!', `Llevas ${result.streak} dias seguidos. Sigue asi!`, [
          { text: 'OK', onPress: navigate },
        ])
      } else {
        navigate()
      }
    },
    onError: (err) => {
      setUploading(false)
      const message = err instanceof ApiError ? err.message : 'No se pudo registrar. Intenta de nuevo.'
      Alert.alert('Error', message)
    },
  })

  const isLoading = mutation.isPending || uploading

  // Mientras no hay foto aún (cámara abierta o canceló) mostrar loading
  if (!photoUri) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Check-in',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
          }}
        />
        <View style={styles.waitingCamera}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.waitingText}>Abriendo cámara...</Text>
          <TouchableOpacity style={styles.galleryFallback} onPress={async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!permission.granted) return
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4], base64: true,
            })
            if (!result.canceled && result.assets[0]) {
              setPhotoUri(result.assets[0].uri)
              if (result.assets[0].mimeType) setPhotoMimeType(result.assets[0].mimeType)
              if (result.assets[0].base64) setPhotoBase64(result.assets[0].base64)
            }
          }}>
            <Text style={styles.galleryFallbackText}>Usar galería en su lugar</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Check-in',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {challengeTitle && (
            <Text style={styles.challengeLabel}>{challengeTitle}</Text>
          )}
          <Text style={styles.heading}>Tu foto de prueba</Text>

          {/* Preview de la foto */}
          <View style={styles.previewWrap}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={openCamera}
              disabled={isLoading}
            >
              <Text style={styles.retakeBtnText}>📷  Volver a tomar</Text>
            </TouchableOpacity>
          </View>

          {/* Nota opcional — solo para retos de grupo */}
          {!!groupId && (
            <View style={styles.notesWrap}>
              <Text style={styles.notesLabel}>Agrega una nota (opcional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Cuéntale a tu grupo cómo te fue..."
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={300}
                editable={!isLoading}
              />
            </View>
          )}

          {/* Botón enviar */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={() => mutation.mutate()}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#000" size="small" />
                <Text style={styles.submitText}>
                  {uploading ? 'Subiendo foto...' : 'Guardando...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>{groupId ? 'Enviar al grupo' : '¡Lo hice!'}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingBottom: 48, gap: 20 },

  waitingCamera: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waitingText: { color: Colors.textSecondary, fontSize: 15 },
  galleryFallback: { paddingVertical: 10 },
  galleryFallbackText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  challengeLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heading: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: -4 },

  previewWrap: { gap: 12 },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 18 },
  retakeBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },

  notesWrap: { gap: 8 },
  notesLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#000', fontSize: 17, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})
