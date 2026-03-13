import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { familyApi, uploadCheckinPhoto } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { Colors } from '../../constants/colors'

export default function FamilyCheckinScreen() {
  const { challengeId, challengeTitle, requirePhoto } = useLocalSearchParams<{
    challengeId: string
    challengeTitle?: string
    requirePhoto?: string
  }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const needsPhoto = requirePhoto === '1'

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMime, setPhotoMime] = useState('image/jpeg')
  const [photoBase64, setPhotoBase64] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Activa el acceso a la cámara'); return }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
      aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      setPhotoMime(asset.mimeType ?? 'image/jpeg')
      setPhotoBase64(asset.base64 ?? undefined)
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Activa el acceso a la galería'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
      aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      setPhotoMime(asset.mimeType ?? 'image/jpeg')
      setPhotoBase64(asset.base64 ?? undefined)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      let photo_url: string | null = null
      if (photoUri) {
        setUploading(true)
        try {
          photo_url = await uploadCheckinPhoto(photoUri, photoMime, photoBase64)
        } finally {
          setUploading(false)
        }
      }
      return familyApi.checkin(challengeId!, { photo_url, notes: notes.trim() || null })
    },
    onSuccess: (res) => {
      // Optimistically update cache so the detail screen reflects the change immediately
      queryClient.setQueryData(['family-detail', challengeId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          has_checked_in_today: true,
          participants: (old.participants ?? []).map((p: any) =>
            p.user_id === user?.id
              ? { ...p, total_checkins: (Number(p.total_checkins) || 0) + (res.auto_approved ? 1 : 0) }
              : p
          ),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['family-checkins', challengeId] })
      router.canGoBack() ? router.back() : router.replace('/(tabs)/compete')
    },
    onError: (err: any) => Alert.alert('Error', err.message ?? 'No se pudo enviar el check-in'),
  })

  function handleSubmit() {
    if (needsPhoto && !photoUri) {
      Alert.alert('Foto requerida', 'Este reto requiere una foto como prueba')
      return
    }
    submitMutation.mutate()
  }

  const isPending = uploading || submitMutation.isPending

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/compete')}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{challengeTitle ?? 'Check-in'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        {/* Photo area */}
        <TouchableOpacity style={styles.photoBox} onPress={pickFromCamera} activeOpacity={0.85}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons name="camera-plus-outline" size={44} color={Colors.primary} />
              <Text style={styles.photoPlaceholderText}>Toca para tomar una foto</Text>
              {needsPhoto && <Text style={styles.photoRequired}>Requerida para este reto</Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* Gallery fallback */}
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery} activeOpacity={0.8}>
          <MaterialCommunityIcons name="image-multiple-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.galleryBtnText}>Elegir de la galería</Text>
        </TouchableOpacity>

        {/* Notes */}
        <TextInput
          style={styles.notes}
          placeholder="Agrega una nota (opcional)..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={300}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color="#000" />
              <Text style={styles.submitBtnText}>¡Lo hice!</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: Colors.text, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },

  body: { flex: 1, padding: 20, gap: 14 },

  photoBox: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: 18,
    overflow: 'hidden', backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  photoPlaceholderText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  photoRequired: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 11,
  },
  galleryBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13 },

  notes: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 13, minHeight: 80,
    textAlignVertical: 'top',
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 17,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    marginTop: 4,
  },
  submitBtnText: { color: '#000', fontSize: 17, fontWeight: '900' },
})
