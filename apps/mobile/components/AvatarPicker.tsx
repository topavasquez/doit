import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet,
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

  async function handlePress() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar la foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })

    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]

    setLocalUri(asset.uri)
    setUploading(true)
    try {
      const url = await uploadAvatarPhoto(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
        asset.base64 ?? undefined,
      )
      onUpload(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      Alert.alert('Error al subir', msg)
      setLocalUri(currentUrl ?? null)
    } finally {
      setUploading(false)
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
