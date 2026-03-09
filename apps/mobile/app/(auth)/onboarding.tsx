import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { authApi, ApiError } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { Colors } from '../../constants/colors'
import { Logo } from '../../components/ui/Logo'
import { AvatarPicker } from '../../components/AvatarPicker'
import type { User } from '@doit/shared'

export default function OnboardingScreen() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  async function checkUsername(val: string) {
    if (val.length < 3) { setAvailable(null); return }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setAvailable(false); return }
    setChecking(true)
    try {
      const res = await authApi.checkUsername(val)
      setAvailable(res.available)
    } finally {
      setChecking(false)
    }
  }

  function handleUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(clean)
    setAvailable(null)
    if (clean.length >= 3) {
      const timer = setTimeout(() => checkUsername(clean), 400)
      return () => clearTimeout(timer)
    }
  }

  async function handleSubmit() {
    if (!username || available !== true) return
    setLoading(true)
    try {
      const res = await authApi.syncUser({
        username,
        display_name: displayName || username,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        avatar_url: avatarUrl,
      })
      setUser(res.user as User)
      router.replace('/(tabs)')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al crear el perfil'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const initial = (displayName || username || 'U')[0].toUpperCase()
  const usernameStatus = checking ? '...' : available === true ? '✓ Disponible' : available === false ? '✗ No disponible' : ''
  const usernameStatusColor = available === true ? Colors.success : available === false ? Colors.error : Colors.textMuted

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size="lg" showWordmark style={styles.logo} />
          <Text style={styles.title}>Crea tu perfil</Text>
          <Text style={styles.subtitle}>Tus amigos verán esto cuando compitas</Text>
        </View>

        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <AvatarPicker
            size={100}
            initial={initial}
            currentUrl={avatarUrl}
            onUpload={setAvatarUrl}
          />
          <Text style={styles.avatarHint}>Foto de perfil (opcional)</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Nombre de usuario *</Text>
            <TextInput
              style={[
                styles.input,
                available === true && styles.inputSuccess,
                available === false && styles.inputError,
              ]}
              placeholder="ej. sofia_corre"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {usernameStatus ? (
              <Text style={[styles.usernameHint, { color: usernameStatusColor }]}>{usernameStatus}</Text>
            ) : (
              <Text style={styles.usernameHint}>3-20 caracteres, solo letras/números/guiones bajos</Text>
            )}
          </View>

          <View>
            <Text style={styles.label}>Nombre para mostrar (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="ej. Sofía Chen"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!username || available !== true || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!username || available !== true || loading}
          >
            <Text style={styles.btnText}>{loading ? 'Creando...' : '¡Vamos!'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, justifyContent: 'center', gap: 28, flexGrow: 1 },
  header: { gap: 12 },
  logo: { marginBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: Colors.textSecondary, fontSize: 16, lineHeight: 22 },
  avatarSection: { alignItems: 'center', gap: 10 },
  avatarHint: { color: Colors.textMuted, fontSize: 13 },
  form: { gap: 20 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputSuccess: { borderColor: Colors.success },
  inputError: { borderColor: Colors.error },
  usernameHint: { color: Colors.textMuted, fontSize: 12, marginTop: 6, marginLeft: 4 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: '#000', fontSize: 17, fontWeight: '800' },
})
