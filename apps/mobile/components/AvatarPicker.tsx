import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet, ActionSheetIOS, Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { uploadAvatarPhoto } from '../lib/api'
import { Colors } from '../constants/colors'

interface Props {
  size?: number
  initial: string
  currentUrl?: string | null
  onUpload: (url: string) => void
}

export function AvatarPicker({ size = 90, initial, currentUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [localUri, setLocalUri] = useState<string | null>(currentUrl ?? null)

  async function pick(source: 'camera' | 'library') {
    let result: ImagePicker.ImagePickerResult

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.'); return }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
      })
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.'); return }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
      })
    }

    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setLocalUri(asset.uri)
    setUploading(true)
    try {
      const url = await uploadAvatarPhoto(asset.uri, asset.mimeType ?? 'image/jpeg', asset.base64 ?? undefined)
      onUpload(url)
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto')
      setLocalUri(currentUrl ?? null)
    } finally {
      setUploading(false)
    }
  }

  function handlePress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Cámara', 'Galería'], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pick('camera'); else if (i === 2) pick('library') },
      )
    } else {
      Alert.alert('Foto de perfil', 'Selecciona una opción', [
        { text: 'Cámara', onPress: () => pick('camera') },
        { text: 'Galería', onPress: () => pick('library') },
        { text: 'Cancelar', style: 'cancel' },
      ])
    }
  }

  const br = size / 2

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={{ width: size, height: size }}>
      {localUri ? (
        <Image source={{ uri: localUri }} style={{ width: size, height: size, borderRadius: br }} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: br }]}>
          <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
        </View>
      )}
      {uploading && (
        <View style={[styles.overlay, { width: size, height: size, borderRadius: br }]}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      <View style={styles.editBadge}>
        <MaterialCommunityIcons name="camera" size={13} color="#000" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryDim,
  },
  initial: { color: '#000', fontWeight: '900' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
})
