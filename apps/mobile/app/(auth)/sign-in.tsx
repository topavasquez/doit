import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import * as Linking from 'expo-linking'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

type Step = 'method' | 'register' | 'login' | 'forgot' | 'verify-otp' | 'verify-recovery'

type OtpOrigin = 'signup' | 'recovery'

export default function SignInScreen() {
  const { register } = useLocalSearchParams<{ register?: string }>()
  const [step, setStep] = useState<Step>(register === 'true' ? 'register' : 'method')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpOrigin, setOtpOrigin] = useState<OtpOrigin>('signup')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function clearError() { setErrorMsg(null) }

  function goBack() {
    clearError()
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setStep('method')
  }

  async function handleRegister() {
    if (!email.trim() || !password) return
    if (password.length < 6) { setErrorMsg('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirmPassword) { setErrorMsg('Las contraseñas no coinciden'); return }
    clearError()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      if (!data.session) {
        // Email OTP confirmation required
        setOtpOrigin('signup')
        setOtpCode('')
        setStep('verify-otp')
      }
      // If session exists, onAuthStateChange in useAuthGuard handles routing
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) return
    clearError()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      // Auth guard handles routing
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setErrorMsg('Ingresa tu correo primero'); return }
    clearError()
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (error) throw error
      setOtpOrigin('recovery')
      setOtpCode('')
      setStep('verify-recovery')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) return
    clearError()
    setLoading(true)
    try {
      const type = otpOrigin === 'signup' ? 'signup' : 'recovery'
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type,
      })
      if (error) throw error
      // onAuthStateChange in useAuthGuard handles routing after verification
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    clearError()
    setLoading(true)
    try {
      if (otpOrigin === 'signup') {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
        if (error) throw error
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al reenviar el código')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    clearError()
    setLoading(true)
    try {
      const redirectTo = Linking.createURL('/(tabs)')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
    } finally {
      setLoading(false)
    }
  }

  async function handleSkip() {
    clearError()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al continuar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.logo}>DoIt</Text>
          <Text style={styles.tagline}>Cumple retos. Compite con amigos.{'\n'}Sin excusas.</Text>
        </View>

        {/* ── Method selection ── */}
        {step === 'method' && (
          <View style={styles.card}>
            {errorMsg && <ErrorBox msg={errorMsg} />}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { clearError(); setStep('register') }}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>Crear cuenta gratis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => { clearError(); setStep('login') }}
              disabled={loading}
            >
              <Text style={styles.outlineBtnText}>Ya tengo cuenta</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Continuar con Google</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              Al continuar aceptas nuestros Términos y Política de Privacidad.{'\n'}
              Las recompensas son acuerdos sociales, sin apuestas reales.
            </Text>

            <TouchableOpacity onPress={handleSkip} disabled={loading} style={styles.skipBtn}>
              <Text style={styles.skipText}>Continuar sin cuenta →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Register ── */}
        {step === 'register' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Crear cuenta</Text>

            {errorMsg && <ErrorBox msg={errorMsg} />}

            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError() }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />

            <PasswordInput
              value={password}
              onChangeText={(v) => { setPassword(v); clearError() }}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder="Contraseña (mín. 6 caracteres)"
            />

            <PasswordInput
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearError() }}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder="Confirmar contraseña"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !email.trim() || !password || !confirmPassword) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading || !email.trim() || !password || !confirmPassword}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { clearError(); setStep('login') }} style={styles.switchBtn}>
              <Text style={styles.switchText}>¿Ya tienes cuenta? <Text style={styles.switchLink}>Inicia sesión</Text></Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Login ── */}
        {step === 'login' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {errorMsg && <ErrorBox msg={errorMsg} />}

            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError() }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />

            <PasswordInput
              value={password}
              onChangeText={(v) => { setPassword(v); clearError() }}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder="Contraseña"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !email.trim() || !password) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !email.trim() || !password}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} disabled={loading} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { clearError(); setStep('register') }} style={styles.switchBtn}>
              <Text style={styles.switchText}>¿No tienes cuenta? <Text style={styles.switchLink}>Regístrate</Text></Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Forgot password ── */}
        {step === 'forgot' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setStep('login')} style={styles.backBtn}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Recuperar contraseña</Text>
            <Text style={styles.cardSubtitle}>Te enviaremos un código de 6 dígitos a tu correo</Text>

            {errorMsg && <ErrorBox msg={errorMsg} />}

            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError() }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || !email.trim()) && styles.btnDisabled]}
              onPress={handleForgotPassword}
              disabled={loading || !email.trim()}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Enviando...' : 'Enviar código'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── OTP verification (signup & recovery) ── */}
        {(step === 'verify-otp' || step === 'verify-recovery') && (
          <View style={styles.card}>
            <Text style={styles.checkEmailIcon}>📬</Text>
            <Text style={styles.cardTitle}>
              {step === 'verify-otp' ? 'Verifica tu correo' : 'Recuperar contraseña'}
            </Text>
            <Text style={styles.cardSubtitle}>
              Te enviamos un código de 6 dígitos a{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            {errorMsg && <ErrorBox msg={errorMsg} />}

            <TextInput
              style={styles.input}
              placeholder="Código de verificación"
              placeholderTextColor={Colors.textMuted}
              value={otpCode}
              onChangeText={(v) => { setOtpCode(v); clearError() }}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (loading || otpCode.trim().length < 6) && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading || otpCode.trim().length < 6}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Verificando...' : 'Verificar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResendOtp} disabled={loading} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Reenviar código</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { clearError(); setStep(step === 'verify-otp' ? 'register' : 'forgot') }} style={styles.backBtn}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>⚠️ {msg}</Text>
    </View>
  )
}

function PasswordInput({
  value, onChangeText, show, onToggle, placeholder,
}: {
  value: string
  onChangeText: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <View style={styles.passwordWrap}>
      <TextInput
        style={[styles.input, styles.passwordInput]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="password"
      />
      <TouchableOpacity style={styles.eyeBtn} onPress={onToggle}>
        <MaterialCommunityIcons
          name={show ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 0 },

  hero: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 52, fontWeight: '900', color: Colors.primary, letterSpacing: -2, marginBottom: 12 },
  tagline: { color: Colors.textSecondary, fontSize: 17, textAlign: 'center', lineHeight: 25 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  cardTitle: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  cardSubtitle: { color: Colors.textSecondary, fontSize: 15, marginTop: -6, lineHeight: 22 },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },

  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 13 },

  googleBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleIcon: { fontSize: 18, fontWeight: '900', color: Colors.text },
  googleText: { color: Colors.text, fontSize: 15, fontWeight: '600' },

  legal: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { color: Colors.textMuted, fontSize: 13 },

  backBtn: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },

  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },

  forgotBtn: { alignItems: 'center', paddingVertical: 4 },
  forgotText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { color: Colors.textMuted, fontSize: 13 },
  switchLink: { color: Colors.primary, fontWeight: '700' },

  errorBox: {
    backgroundColor: '#FF453A22',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF453A66',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },

  checkEmailIcon: { fontSize: 40, textAlign: 'center' },
  emailHighlight: { color: Colors.text, fontWeight: '700' },
})
