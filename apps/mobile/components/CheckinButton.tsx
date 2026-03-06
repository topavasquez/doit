import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Colors } from '../constants/colors'
import { checkinsApi, uploadCheckinPhoto, ApiError } from '../lib/api'

interface CheckinButtonProps {
  challengeId: string
  hasCheckedInToday: boolean
  streak: number
  onCheckinSuccess?: (streak: number, totalCheckins: number) => void
}

export function CheckinButton({ challengeId, hasCheckedInToday, streak, onCheckinSuccess }: CheckinButtonProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  async function pickPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission required', fromCamera ? 'Camera access is needed.' : 'Photo library access is needed.')
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] })

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  function resetModal() {
    setShowModal(false)
    setNotes('')
    setPhotoUri(null)
  }

  async function handleCheckin() {
    setLoading(true)
    try {
      let photo_url: string | undefined
      if (photoUri) {
        setUploading(true)
        photo_url = await uploadCheckinPhoto(photoUri)
        setUploading(false)
      }
      const result = await checkinsApi.create({ challenge_id: challengeId, notes: notes || undefined, photo_url })
      resetModal()
      onCheckinSuccess?.(result.streak, result.total_checkins)

      if (result.streak > 0 && [7, 14, 21, 30].includes(result.streak)) {
        Alert.alert('Streak Milestone!', `You're on a ${result.streak}-day streak. Keep it up!`)
      }
    } catch (err) {
      setUploading(false)
      const message = err instanceof ApiError ? err.message : 'Failed to check in. Try again.'
      Alert.alert('Check-in Failed', message)
    } finally {
      setLoading(false)
    }
  }

  if (hasCheckedInToday) {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneButton}>
          <Text style={styles.doneIcon}>✓</Text>
          <Text style={styles.doneText}>Checked in today</Text>
        </View>
        {streak > 0 && (
          <Text style={styles.streakLabel}>{streak}-day streak</Text>
        )}
      </View>
    )
  }

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonIcon}>✓</Text>
        <Text style={styles.buttonText}>Check In</Text>
        {streak > 0 && <Text style={styles.streakBadge}>{streak}</Text>}
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Your Check-in</Text>
            <Text style={styles.modalSubtitle}>Add a photo as proof for your group</Text>

            {/* Photo picker */}
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(true)}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(false)}>
                  <Text style={styles.photoBtnIcon}>🖼️</Text>
                  <Text style={styles.photoBtnText}>Library</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Optional note for your group…"
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={300}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetModal}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (loading || uploading) && styles.confirmBtnLoading]}
                onPress={handleCheckin}
                disabled={loading || uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.confirmText}>{loading ? 'Logging...' : 'Log Check-in'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonIcon: { fontSize: 22, color: '#000', fontWeight: '800' },
  buttonText: { color: '#000', fontSize: 18, fontWeight: '800' },
  streakBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  doneContainer: { alignItems: 'center', gap: 8 },
  doneButton: {
    backgroundColor: Colors.success + '22',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.success + '44',
    width: '100%',
  },
  doneIcon: { fontSize: 22, color: Colors.success, fontWeight: '800' },
  doneText: { color: Colors.success, fontSize: 17, fontWeight: '700' },
  streakLabel: { color: Colors.streakFire, fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: -8 },
  photoRow: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBtnIcon: { fontSize: 24 },
  photoBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  photoPreview: { width: '100%', height: 180, borderRadius: 12 },
  removePhoto: { alignItems: 'center', paddingTop: 8 },
  removePhotoText: { color: Colors.textMuted, fontSize: 13 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnLoading: { opacity: 0.6 },
  confirmText: { color: '#000', fontWeight: '800', fontSize: 15 },
})
