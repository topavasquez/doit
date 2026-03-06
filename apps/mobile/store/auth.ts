import { create } from 'zustand'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@doit/shared'

interface AuthState {
  session: Session | null
  supabaseUser: SupabaseUser | null
  user: User | null
  isLoading: boolean
  isOnboarded: boolean

  setSession: (session: Session | null) => void
  setSupabaseUser: (user: SupabaseUser | null) => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setOnboarded: (onboarded: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  supabaseUser: null,
  user: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) => set({ session }),
  setSupabaseUser: (supabaseUser) => set({ supabaseUser }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  reset: () => set({ session: null, supabaseUser: null, user: null, isOnboarded: false }),
}))
