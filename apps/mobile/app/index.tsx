import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { INTRO_STORAGE_KEY } from '../hooks/useAuth'
import { Colors } from '../constants/colors'

// Entry point — reads state directly and routes without any timing races
export default function IndexScreen() {
  const router = useRouter()

  useEffect(() => {
    async function route() {
      const [introVal, { data: { session } }] = await Promise.all([
        AsyncStorage.getItem(INTRO_STORAGE_KEY),
        supabase.auth.getSession(),
      ])

      if (introVal !== 'true') {
        router.replace('/intro')
      } else if (session) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(auth)/sign-in')
      }
    }
    route()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  )
}
