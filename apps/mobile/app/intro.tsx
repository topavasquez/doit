import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, useWindowDimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import { Colors } from '../constants/colors'
import { Logo } from '../components/ui/Logo'
import { useAuthStore } from '../store/auth'
import { INTRO_STORAGE_KEY } from '../hooks/useAuth'

// ─── Slide definitions ────────────────────────────────────────────────────────

type Slide = {
  key: string
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  color: string
  title: string
  description: string
  showLogo?: boolean
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'hand-wave-outline',
    color: Colors.primary,
    title: 'Bienvenido a DoIT',
    description: 'Cumple retos y crea hábitos\njunto a tus amigos.',
    showLogo: true,
  },
  {
    key: 'streak',
    icon: 'lightning-bolt',
    color: '#f0a500',
    title: 'Sé constante',
    description: 'Completa tus hábitos cada día y compite\npor quién logra la mejor racha.',
  },
  {
    key: 'groups',
    icon: 'account-group-outline',
    color: '#3B82F6',
    title: 'Haz retos en grupo',
    description: 'Crea grupos con amigos y motívense\npara cumplir objetivos juntos.',
  },
  {
    key: 'photos',
    icon: 'camera-outline',
    color: '#EC4899',
    title: 'Comparte tus logros',
    description: 'Envía fotos cuando completes un reto\ny demuestra que lo lograste.',
  },
  {
    key: 'compete',
    icon: 'trophy-variant-outline',
    color: '#8B5CF6',
    title: 'Compite por el premio final',
    description: 'Mantén tu racha, supera a tus amigos\ny gana el desafío.',
  },
]

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ total, current, color }: { total: number; current: number; color: string }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            dotStyles.dot,
            i === current
              ? { backgroundColor: color, width: 24 }
              : { backgroundColor: Colors.border, width: 6 },
          ]}
        />
      ))}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function IntroScreen() {
  const router = useRouter()
  const { height: SCREEN_H } = useWindowDimensions()
  const { session, user, setHasSeenIntro } = useAuthStore()
  const [currentIndex, setCurrentIndex] = useState(0)

  // Transition animations
  const contentOpacity = useRef(new Animated.Value(1)).current
  const contentTranslateY = useRef(new Animated.Value(0)).current

  // Icon animations
  const iconScale = useRef(new Animated.Value(1)).current
  const iconRotate = useRef(new Animated.Value(0)).current
  const glowScale = useRef(new Animated.Value(1)).current

  // Button animation
  const buttonScale = useRef(new Animated.Value(1)).current

  const slide = SLIDES[currentIndex]
  const isLast = currentIndex === SLIDES.length - 1

  // Restart icon animations whenever slide changes
  useEffect(() => {
    iconScale.setValue(0.7)
    iconRotate.setValue(-0.05)

    const entranceAnim = Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
      Animated.spring(iconRotate, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 8 }),
    ])

    entranceAnim.start(() => {
      // Continuous gentle pulse after entrance
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, { toValue: 1.12, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 1, duration: 1800, useNativeDriver: true }),
        ])
      )
      pulse.start()
    })

    return () => {
      glowScale.stopAnimation()
      glowScale.setValue(1)
    }
  }, [currentIndex])

  function goToSlide(index: number) {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: -16, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(index)
      contentTranslateY.setValue(24)
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }),
      ]).start()
    })
  }

  async function handleComplete() {
    await AsyncStorage.setItem(INTRO_STORAGE_KEY, 'true')
    setHasSeenIntro(true)
    if (session && user) {
      router.replace('/(tabs)')
    } else {
      router.replace('/(auth)/sign-in?register=true')
    }
  }

  function handleNext() {
    if (isLast) { handleComplete(); return }
    goToSlide(currentIndex + 1)
  }

  function pressIn() {
    Animated.spring(buttonScale, { toValue: 0.94, useNativeDriver: true, speed: 30 }).start()
  }
  function pressOut() {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()
  }

  const iconRotateDeg = iconRotate.interpolate({
    inputRange: [-0.1, 0.1],
    outputRange: ['-10deg', '10deg'],
  })

  const illustrationHeight = SCREEN_H * 0.48

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated content area */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        {/* Illustration */}
        <View style={[styles.illustrationArea, { height: illustrationHeight }]}>
          {/* Outer glow — pulsing */}
          <Animated.View
            style={[
              styles.glowOuter,
              { backgroundColor: slide.color + '10', transform: [{ scale: glowScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.glowMiddle,
              { backgroundColor: slide.color + '1e', transform: [{ scale: glowScale }] },
            ]}
          />

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                backgroundColor: slide.color + '22',
                borderColor: slide.color + '55',
                transform: [{ scale: iconScale }, { rotate: iconRotateDeg }],
              },
            ]}
          >
            <MaterialCommunityIcons name={slide.icon} size={68} color={slide.color} />
          </Animated.View>

          {/* Logo badge on first slide */}
          {slide.showLogo && (
            <View style={styles.logoBadge}>
              <Logo size="sm" showWordmark />
            </View>
          )}
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <View style={[styles.titleAccent, { backgroundColor: slide.color }]} />
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </Animated.View>

      {/* Bottom controls — not animated so they stay stable */}
      <View style={styles.controls}>
        <Dots total={SLIDES.length} current={currentIndex} color={slide.color} />

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: slide.color }]}
            onPress={handleNext}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={1}
          >
            <Text style={styles.btnText}>
              {isLast ? 'Regístrate gratis' : 'Continuar'}
            </Text>
            {!isLast && (
              <MaterialCommunityIcons name="arrow-right" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </Animated.View>

        {!isLast && (
          <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  illustrationArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  glowOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowMiddle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  iconWrap: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  logoBadge: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    paddingHorizontal: 36,
    paddingTop: 36,
    alignItems: 'center',
    gap: 14,
  },
  titleAccent: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  btnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  skipBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
})
