import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthGuard } from '../hooks/useAuth'
import { Colors } from '../constants/colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
})

function RootLayoutNav() {
  useAuthGuard()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
        headerTitleStyle: { color: Colors.text, fontWeight: '800' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="intro" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="group/[id]"
        options={{ title: '', headerBackTitle: 'Grupos', headerBackVisible: true }}
      />
      <Stack.Screen
        name="challenge/[id]"
        options={{ title: '', headerBackTitle: 'Atrás', headerBackVisible: true }}
      />
      <Stack.Screen
        name="challenge/create"
        options={{ title: 'Nuevo reto', headerBackTitle: 'Atrás', presentation: 'modal' }}
      />
      <Stack.Screen
        name="friends/index"
        options={{ title: 'Amigos', headerBackTitle: 'Perfil' }}
      />
      <Stack.Screen
        name="friends/search"
        options={{ title: 'Buscar Amigos', headerBackTitle: 'Amigos' }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{ title: 'Perfil', headerBackTitle: 'Atrás' }}
      />
      <Stack.Screen
        name="premium"
        options={{ title: '', headerBackTitle: 'Atrás', headerBackVisible: true, animation: 'slide_from_bottom' }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <RootLayoutNav />
    </QueryClientProvider>
  )
}
