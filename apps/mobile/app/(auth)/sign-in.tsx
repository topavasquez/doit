import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { makeRedirectUri } from 'expo-linking'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

type Step = 'method' | 'email-entry' | 'otp-verify'

export default function SignInScreen() {
  const [step, setStep] = useState<Step>('method')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function clearError() { setErrorMsg(null) }

  async function handleSendOTP() {
    if (!email.trim()) return
    clearError()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      setStep('otp-verify')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code'
      console.error('[Auth] Send OTP error:', msg)
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) return
    clearError()
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      })
      if (error) throw error
      // Auth guard in _layout.tsx will handle routing
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code'
      console.error('[Auth] Verify OTP error:', msg)
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    clearError()
    setLoading(true)
    try {
      const redirectTo = makeRedirectUri({ scheme: 'doit', path: '/(tabs)' })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed'
      console.error('[Auth] Google sign-in error:', msg)
      setErrorMsg(msg)
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
      const msg = err instanceof Error ? err.message : 'Failed to continue'
      console.error('[Auth] Skip error:', msg)
      setErrorMsg(msg)
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
        {/* Header */}
        <View style={styles.hero}>
          <Text style={styles.logo}>DoIt</Text>
          <Text style={styles.tagline}>Turn your habits into bets{'\n'}you actually keep.</Text>
        </View>

        {step === 'method' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Get started</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.methodBtn}
              onPress={() => { clearError(); setStep('email-entry') }}
              disabled={loading}
            >
              <Text style={styles.methodIcon}>✉️</Text>
              <Text style={styles.methodText}>Continue with Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodBtn, styles.googleBtn]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.methodIcon}>G</Text>
              <Text style={styles.methodText}>Continue with Google</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              By continuing you agree to our Terms & Privacy Policy.{'\n'}No gambling features — rewards are social agreements only.
            </Text>
            <TouchableOpacity onPress={handleSkip} disabled={loading} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now →</Text>
            </TouchableOpacity>          </View>
        )}

        {step === 'email-entry' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => { setStep('method'); clearError() }} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Enter your email</Text>
            <Text style={styles.cardSubtitle}>We'll send a 6-digit code</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnLoading]}
              onPress={handleSendOTP}
              disabled={loading || !email.trim()}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Send Code'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp-verify' && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => { setStep('email-entry'); clearError() }} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>Enter the code</Text>
            <Text style={styles.cardSubtitle}>Sent to {email}</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="00000000"
              placeholderTextColor={Colors.textMuted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnLoading]}
              onPress={handleVerifyOTP}
              disabled={loading || otp.length < 4}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Verify →'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 52, fontWeight: '900', color: Colors.primary, letterSpacing: -2, marginBottom: 12 },
  tagline: { color: Colors.textSecondary, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  cardTitle: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  cardSubtitle: { color: Colors.textSecondary, fontSize: 15, marginTop: -6 },
  methodBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleBtn: { borderColor: Colors.primary + '44' },
  methodIcon: { fontSize: 20, width: 28, textAlign: 'center', color: Colors.text, fontWeight: '700' },
  methodText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  legal: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
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
  otpInput: { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnLoading: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  resendBtn: { alignItems: 'center' },
  resendText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { color: Colors.textMuted, fontSize: 13 },
  errorBox: {
    backgroundColor: '#FF453A22',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF453A66',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
})

