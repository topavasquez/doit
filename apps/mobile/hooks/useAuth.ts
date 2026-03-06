import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { User } from '@doit/shared'

export function useAuth() {
  return useAuthStore()
}

export function useAuthGuard() {
  const { session, user, isLoading, setSession, setSupabaseUser, setUser, setLoading } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)

      if (session?.user) {
        authApi.me()
          .then((res) => {
            setUser(res.user as User)
          })
          .catch(() => {
            // User exists in Supabase but not in our DB yet — go to onboarding
            setUser(null)
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)

      if (!session) {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const isAnonymous = session?.user?.is_anonymous === true

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && isAnonymous && inAuthGroup) {
      router.replace('/(tabs)')
    } else if (session && !user && !isAnonymous && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (session && user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, user, isLoading, segments])
}
