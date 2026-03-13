import { TouchableOpacity, Image, View, Text, StyleSheet, Dimensions } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useEffect } from 'react'
import { Colors } from '../../constants/colors'

const TABS = [
  { name: 'index',   label: 'Inicio',  icon: 'home-outline' },
  { name: 'groups',  label: 'Grupos',  icon: 'account-group-outline' },
  { name: 'compete', label: 'Retos',   icon: 'flag-outline' },
  { name: 'profile', label: 'Perfil',  icon: 'account-circle-outline' },
] as const

const SCREEN_WIDTH = Dimensions.get('window').width
const TAB_WIDTH = SCREEN_WIDTH / TABS.length
const LINE_WIDTH = 28

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const lineX = useSharedValue(state.index * TAB_WIDTH + (TAB_WIDTH - LINE_WIDTH) / 2)

  useEffect(() => {
    lineX.value = withSpring(
      state.index * TAB_WIDTH + (TAB_WIDTH - LINE_WIDTH) / 2,
      { damping: 18, stiffness: 200, mass: 0.8 }
    )
  }, [state.index])

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lineX.value }],
  }))

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 16 }]}>
      {/* Sliding orange line */}
      <Animated.View style={[styles.line, lineStyle]} />

      {TABS.map((tab, index) => {
        const focused = state.index === index
        const route = state.routes[index]

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              color={focused ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 0,
    width: LINE_WIDTH,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
  },
})

// ── Header components ─────────────────────────────────────────────────────────

function SettingsButton() {
  const router = useRouter()
  return (
    <TouchableOpacity
      onPress={() => router.navigate('/(tabs)/profile')}
      style={{ marginRight: 16 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.textSecondary} />
    </TouchableOpacity>
  )
}

function HeaderLogo() {
  return (
    <Image
      source={{ uri: 'https://res.cloudinary.com/dohtcfagz/image/upload/v1773112079/logo-black_esrgmn.png' }}
      style={{ height: 45, width: 120, resizeMode: 'contain', marginLeft: -18 }}
    />
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background, height: 80 },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        headerTitleStyle: { color: Colors.text, fontWeight: '800' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: () => null,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <SettingsButton />,
        }}
      />
      <Tabs.Screen name="groups"  options={{ title: 'Grupos' }} />
      <Tabs.Screen name="compete" options={{ title: 'Retos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
