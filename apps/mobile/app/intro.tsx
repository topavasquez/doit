import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, Animated, ListRenderItemInfo,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import { Colors } from '../constants/colors'
import { Logo } from '../components/ui/Logo'
import { useAuthStore } from '../store/auth'
import { INTRO_STORAGE_KEY } from '../hooks/useAuth'

const { width: SCREEN_W } = Dimensions.get('window')

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

// ─── Individual slide ─────────────────────────────────────────────────────────

function SlideView({ slide }: { slide: Slide }) {
  return (
    <View style={[slideStyles.container, { width: SCREEN_W }]}>
      {/* Illustration area */}
      <View style={slideStyles.illustrationArea}>
        {/* Outer glow ring */}
        <View style={[slideStyles.glowOuter, { backgroundColor: slide.color + '12' }]} />
        <View style={[slideStyles.glowMiddle, { backgroundColor: slide.color + '20' }]} />

        {/* Icon container */}
        <View style={[slideStyles.iconWrap, { backgroundColor: slide.color + '22', borderColor: slide.color + '44' }]}>
          <MaterialCommunityIcons name={slide.icon} size={64} color={slide.color} />
        </View>

        {/* Logo badge on first slide */}
        {slide.showLogo && (
          <View style={slideStyles.logoBadge}>
            <Logo size="sm" showWordmark />
          </View>
        )}
      </View>

      {/* Text area */}
      <View style={slideStyles.textArea}>
        <View style={[slideStyles.titleAccent, { backgroundColor: slide.color }]} />
        <Text style={slideStyles.title}>{slide.title}</Text>
        <Text style={slideStyles.description}>{slide.description}</Text>
      </View>
    </View>
  )
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ total, current, color }: { total: number; current: number; color: string }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current
              ? [dotStyles.dotActive, { backgroundColor: color, width: 24 }]
              : { backgroundColor: Colors.border },
          ]}
        />
      ))}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function IntroScreen() {
  const router = useRouter()
  const { session, user, setHasSeenIntro } = useAuthStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList<Slide>>(null)
  const buttonScale = useRef(new Animated.Value(1)).current

  const isLast = currentIndex === SLIDES.length - 1
  const currentSlide = SLIDES[currentIndex]

  async function handleComplete() {
    await AsyncStorage.setItem(INTRO_STORAGE_KEY, 'true')
    setHasSeenIntro(true)

    // Route based on existing auth state
    if (session && user) {
      router.replace('/(tabs)')
    } else {
      router.replace('/(auth)/sign-in?register=true')
    }
  }

  function handleNext() {
    if (isLast) {
      handleComplete()
      return
    }
    const next = currentIndex + 1
    listRef.current?.scrollToIndex({ index: next, animated: true })
    setCurrentIndex(next)
  }

  function pressIn() {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start()
  }

  function pressOut() {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()
  }

  function onMomentumScrollEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
    setCurrentIndex(idx)
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Slides */}
      <FlatList<Slide>
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => <SlideView slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        style={styles.list}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Dots total={SLIDES.length} current={currentIndex} color={currentSlide.color} />

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: currentSlide.color }]}
            onPress={handleNext}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={1}
          >
            <Text style={styles.btnText}>
              {isLast ? 'Regístrate gratis' : 'Continuar'}
            </Text>
            {!isLast && (
              <MaterialCommunityIcons name="arrow-right" size={20} color="#000" style={styles.btnIcon} />
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

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  glowOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  glowMiddle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  logoBadge: {
    position: 'absolute',
    bottom: '15%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    paddingHorizontal: 36,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  titleAccent: {
    width: 32,
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
    lineHeight: 24,
    textAlign: 'center',
  },
})

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  dotActive: {
    height: 6,
    borderRadius: 3,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 8,
    alignItems: 'center',
    gap: 0,
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
  btnIcon: {
    marginLeft: 2,
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
