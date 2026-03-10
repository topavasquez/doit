import { TouchableOpacity, Image } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

function SettingsButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.navigate("/(tabs)/profile")}
      style={{ marginRight: 16 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name="cog-outline"
        size={22}
        color={Colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function HeaderLogo() {
  return (
    <Image
      source={{ uri: 'https://res.cloudinary.com/dohtcfagz/image/upload/v1773112079/logo-black_esrgmn.png' }}
      style={{ height: 36, width: 120, resizeMode: 'contain', marginLeft: 16 }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        headerStyle: { backgroundColor: Colors.background, height: 80 },
        headerTintColor: Colors.primary,
        headerShadowVisible: false,
        headerTitleStyle: { color: Colors.text, fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          headerTitle: () => null,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <SettingsButton />,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Grupos",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compete"
        options={{
          title: "Competir",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="trophy-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
