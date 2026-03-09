import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { authApi } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { Colors } from '../../constants/colors'
import { Logo } from '../../components/ui/Logo'
import type { User } from '@doit/shared'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { setIsRecovery, setUser } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const passwordsMatch = password === confirmPassword
  const isValid = password.length >= 6 && confirmPassword.length >= 6 && passwordsMatch

  async function handleReset() {
    if (!isValid) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setErrorMsg(error.message); return }

      // Reload user profile
      const res = await authApi.me().catch(() => null)
      if (res) setUser(res.user as User)

      setIsRecovery(false)
      router.replace('/(tabs)')
    } catch {
      setErrorMsg('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size="lg" showWordmark style={styles.logo} />
          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.subtitle}>Escribe tu nueva contraseña dos veces para confirmarla</Text>
        </View>

        <View style={styles.form}>
          {/* New password */}
          <View>
            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password */}
          <View>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={[
              styles.inputWrap,
              confirmPassword.length > 0 && !passwordsMatch && styles.inputWrapError,
              confirmPassword.length > 0 && passwordsMatch && styles.inputWrapSuccess,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Repite la contraseña"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.hintError}>Las contraseñas no coinciden</Text>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <Text style={styles.hintSuccess}>Las contraseñas coinciden</Text>
            )}
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleReset}
            disabled={!isValid || loading}
          >
            <Text style={styles.btnText}>{loading ? 'Guardando...' : 'Cambiar contraseña'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, justifyContent: 'center', gap: 32, flexGrow: 1 },
  header: { gap: 12 },
  logo: { marginBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: Colors.textSecondary, fontSize: 16, lineHeight: 22 },
  form: { gap: 20 },
  label: {
    color: Colors.textSecondary, fontSize: 13, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputWrapError: { borderColor: Colors.error },
  inputWrapSuccess: { borderColor: Colors.success },
  input: { flex: 1, padding: 16, color: Colors.text, fontSize: 16 },
  eyeBtn: { padding: 14 },
  hintError: { color: Colors.error, fontSize: 12, marginTop: 6, marginLeft: 4 },
  hintSuccess: { color: Colors.success, fontSize: 12, marginTop: 6, marginLeft: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error + '18', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.error + '40',
  },
  errorText: { color: Colors.error, fontSize: 14, flex: 1 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: '#000', fontSize: 17, fontWeight: '800' },
})
