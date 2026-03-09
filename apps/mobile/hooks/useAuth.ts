import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { supabase } from "../lib/supabase";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/auth";
import type { User } from "@doit/shared";

export const INTRO_STORAGE_KEY = "doit:hasSeenIntro";

export function useAuth() {
  return useAuthStore();
}

export function useAuthGuard() {
  const {
    session,
    user,
    isLoading,
    setSession,
    setSupabaseUser,
    setUser,
    setLoading,
  } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Load session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        authApi
          .me()
          .then((res) => setUser(res.user as User))
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for subsequent auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      authApi
        .me()
        .then((res) => setUser(res.user as User))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[1] === "onboarding";
    const inIntro = segments[0] === "intro";
    const isAnonymous = session?.user?.is_anonymous === true;

    // intro.tsx manages its own routing — don't interfere
    if (inIntro) return;

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/sign-in");
    } else if (isAnonymous) {
      if (inAuthGroup) router.replace("/(tabs)");
    } else if (!user) {
      if (!inOnboarding) router.replace("/(auth)/onboarding");
    } else {
      if (inAuthGroup) router.replace("/(tabs)");
    }
  }, [session, user, isLoading, segments]);
}
