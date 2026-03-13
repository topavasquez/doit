import { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usersApi, groupsApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { HABIT_CATEGORY_CONFIG } from "../../constants";
import type { Challenge, ChallengeParticipant, Group } from "@doit/shared";

type DayTab = "today" | "upcoming" | "completed";

type ActiveChallenge = Challenge & {
  my_participation?: Pick<
    ChallengeParticipant,
    "streak_current" | "total_checkins"
  > | null;
  has_checked_in_today?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function motivationalText(pct: number): string {
  if (pct === 0) return "¡Empieza hoy!";
  if (pct < 26) return "¡Buen comienzo!";
  if (pct < 51) return "¡Vas bien!";
  if (pct < 76) return "¡Casi ahí!";
  if (pct < 100) return "¡Falta poco!";
  return "¡Lo lograste!";
}

// Deterministic color per group (cycles through palette)
const GROUP_COLORS = [
  Colors.primary,
  Colors.diet,
  Colors.study,
  Colors.sleep,
  Colors.custom,
  Colors.reading,
];
const GROUP_ICONS = [
  "dumbbell",
  "book-open-variant",
  "food-apple",
  "run-fast",
  "brain",
  "music-note",
  "account-group",
];

function groupColor(index: number) {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}
function groupIcon(index: number): string {
  return GROUP_ICONS[index % GROUP_ICONS.length];
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [dayTab, setDayTab] = useState<DayTab>("today");

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: statsData,
    refetch: refetchStats,
    isRefetching,
  } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => usersApi.getStats(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const {
    data: challengesData,
    refetch: refetchChallenges,
    isLoading: isLoadingChallenges,
  } = useQuery({
    queryKey: ["my-challenges", user?.id],
    queryFn: () => usersApi.getChallenges(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
    staleTime: 60_000,
  });

  useFocusEffect(
    useCallback(() => {
      refetchChallenges();
      refetchStats();
    }, []),
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const stats =
    (statsData?.stats as {
      total_challenges: number;
      total_checkins: number;
      current_streaks: number;
      daily_streak: number;
      has_checked_in_today: boolean;
      longest_streak: number;
      active_challenges: number;
    }) ?? null;

  const allChallenges = (challengesData?.challenges ?? []) as ActiveChallenge[];
  const activeChallenges = allChallenges.filter((c) => c.status === "active");
  const pendingChallenges = allChallenges.filter((c) => c.status === "pending");
  const groups = (groupsData?.groups ?? []) as Group[];

  const totalActive = activeChallenges.length;
  const doneToday = activeChallenges.filter((c) => c.has_checked_in_today).length;
  const remainingToday = totalActive - doneToday;
  const progressPct = totalActive > 0 ? Math.min(100, (doneToday / totalActive) * 100) : 0;
  const progressWidth = `${progressPct}%` as `${number}%`;

  const currentStreak = stats?.daily_streak ?? 0;
  const checkedInToday = stats?.has_checked_in_today ?? false;
  const streakColor = checkedInToday ? Colors.streakFire : Colors.textMuted;

  const todayChallenges = activeChallenges.filter((c) => !c.has_checked_in_today);
  const completedTodayChallenges = activeChallenges.filter((c) => c.has_checked_in_today);
  const tabChallenges =
    dayTab === "today"
      ? todayChallenges
      : dayTab === "upcoming"
        ? pendingChallenges
        : completedTodayChallenges;

  // ── Header (streak + bell + settings) ─────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          {currentStreak > 0 && (
            <View
              style={[
                styles.headerStreak,
                {
                  backgroundColor: streakColor + "20",
                  borderColor: streakColor + "40",
                },
              ]}
            >
              <MaterialCommunityIcons name="fire" size={15} color={streakColor} />
              <Text style={[styles.headerStreakText, { color: streakColor }]}>
                {currentStreak}
              </Text>
            </View>
          )}
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [currentStreak, checkedInToday]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchStats();
              refetchChallenges();
            }}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. Greeting ─────────────────────────────────────── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingName}>
            Hola, {user?.display_name ?? user?.username ?? "ahí"}!
          </Text>
          <Text style={styles.greetingSubtitle}>
            {checkedInToday
              ? "Ya hiciste check-in hoy. ¡Sigue así!"
              : "¿Listo para conquistar tus metas hoy?"}
          </Text>
        </View>

        {/* ── 2. Daily Progress Card ───────────────────────────── */}
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>PROGRESO DIARIO</Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressMotivation}>
              {motivationalText(progressPct)}
            </Text>
            <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor:
                    progressPct === 100 ? Colors.success : Colors.primary,
                },
              ]}
            />
          </View>

          <Text style={styles.progressSubtext}>
            {totalActive === 0
              ? "Únete a un reto para empezar"
              : progressPct === 100
                ? "¡Completaste todos tus retos de hoy!"
                : `${remainingToday} ${remainingToday === 1 ? "tarea más" : "tareas más"} para tu meta diaria`}
          </Text>
        </View>

        {/* ── 3. Stats Row (Retos / Puntos / Racha) ────────────── */}
        <View style={styles.statsRow}>
          {/* Retos */}
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={24}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.statLabel}>RETOS</Text>
            <Text style={[styles.statValue, { color: Colors.text }]}>
              {stats?.total_checkins ?? 0}
            </Text>
            <Text style={[styles.statDelta, { color: "#4CAF50" }]}>
              +{doneToday} hoy
            </Text>
          </View>

          {/* Puntos */}
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={24}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.statLabel}>PUNTOS</Text>
            <Text style={[styles.statValue, { color: Colors.text }]}>
              {user?.xp && user.xp >= 1000
                ? `${(user.xp / 1000).toFixed(1)}k`
                : (user?.xp ?? 0)}
            </Text>
            <Text style={[styles.statDelta, { color: "#4CAF50" }]}>
              XP total
            </Text>
          </View>

          {/* Racha */}
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialCommunityIcons
                name="fire"
                size={24}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.statLabel}>RACHA</Text>
            <Text style={[styles.statValue, { color: Colors.text }]}>
              {currentStreak}
            </Text>
            <Text style={[styles.statDelta, { color: Colors.streakFire }]}>
              {currentStreak > 0 ? "¡Fuego!" : "sin racha"}
            </Text>
          </View>
        </View>

        {/* ── 4. Mis Grupos ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Grupos</Text>
            <TouchableOpacity onPress={() => router.navigate("/(tabs)/groups")}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyGroupsCard}
              onPress={() => router.navigate("/(tabs)/groups")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={24}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyGroupsText}>
                Aún no tienes grupos — ¡únete o crea uno!
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ) : (
            groups.map((group, index) => {
              const members = (group as any).members ?? [];
              const memberCount =
                (group as any).member_count ?? members.length ?? 0;
              const color = groupColor(index);
              const icon = groupIcon(index);

              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupCard}
                  onPress={() => router.push(`/group/${group.id}`)}
                  activeOpacity={0.8}
                >
                  {/* Left icon */}
                  <View
                    style={[styles.groupIcon, { backgroundColor: color + "25" }]}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={22}
                      color={color}
                    />
                  </View>

                  {/* Info */}
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name}
                    </Text>
                    <Text style={styles.groupMeta}>
                      {memberCount}{" "}
                      {memberCount === 1 ? "miembro activo" : "miembros activos"}
                    </Text>
                  </View>

                  {/* Arrow */}
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── 5. Mis Retos (tabs: Hoy / Próximos / Completados) ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
            Mis Retos
          </Text>

          {/* Tab pills */}
          <View style={styles.dayTabs}>
            {(["today", "upcoming", "completed"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.dayTab, dayTab === t && styles.dayTabActive]}
                onPress={() => setDayTab(t)}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    dayTab === t && styles.dayTabTextActive,
                  ]}
                >
                  {t === "today"
                    ? "Hoy"
                    : t === "upcoming"
                      ? "Próximos"
                      : "Hechos"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {isLoadingChallenges ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : tabChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name={dayTab === "completed" ? "check-circle-outline" : "flag-outline"}
                size={32}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyStateText}>
                {dayTab === "today" && totalActive === 0
                  ? "Sin retos activos"
                  : dayTab === "today"
                    ? "¡Todo listo por hoy!"
                    : dayTab === "upcoming"
                      ? "Sin retos pendientes"
                      : "Sin check-ins hoy"}
              </Text>
            </View>
          ) : (
            tabChallenges.map((c) => {
              const cfg =
                HABIT_CATEGORY_CONFIG[
                  c.habit_category as keyof typeof HABIT_CATEGORY_CONFIG
                ] ?? HABIT_CATEGORY_CONFIG.custom;
              const streak = c.my_participation?.streak_current ?? 0;

              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.taskRow}
                  onPress={() => router.push(`/challenge/${c.id}`)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.taskIcon,
                      { backgroundColor: cfg.color + "22" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="flag-outline"
                      size={24}
                      color={cfg.color}
                    />
                  </View>

                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <View
                        style={[styles.dot, { backgroundColor: cfg.color }]}
                      />
                      <Text style={[styles.taskCategory, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                      {streak > 0 && (
                        <Text style={styles.taskStreak}>· 🔥 {streak} días</Text>
                      )}
                    </View>
                  </View>

                  {dayTab === "today" ? (
                    <TouchableOpacity
                      style={styles.doItBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/challenge/photo-checkin",
                          params: {
                            challengeId: c.id,
                            challengeTitle: c.title,
                            groupId: c.group_id,
                          },
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.doItBtnText}>Do It</Text>
                    </TouchableOpacity>
                  ) : dayTab === "completed" ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={Colors.success}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={Colors.textMuted}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 56 },

  // ── Header ──────────────────────────────────────────────────
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginRight: 16,
  },
  headerStreak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  headerStreakText: { fontWeight: "800", fontSize: 13 },

  // ── Greeting ────────────────────────────────────────────────
  greeting: { marginBottom: 24 },
  greetingName: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  // ── Progress Card ────────────────────────────────────────────
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 14,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  progressMotivation: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
    flex: 1,
    lineHeight: 32,
  },
  progressPct: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 44,
    letterSpacing: -1,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressSubtext: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Stats Row ────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
    marginTop: 6,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statDelta: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Section ──────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Group Cards ───────────────────────────────────────────────
  emptyGroupsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyGroupsText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  groupInfo: { flex: 1 },
  groupName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  groupMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Task Tabs ─────────────────────────────────────────────────
  dayTabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
  },
  dayTabActive: { backgroundColor: Colors.primary },
  dayTabText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 },
  dayTabTextActive: { color: "#000" },

  // ── Task Rows ─────────────────────────────────────────────────
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: { flex: 1 },
  taskTitle: { color: Colors.text, fontWeight: "700", fontSize: 15 },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  taskCategory: { fontSize: 12, fontWeight: "600" },
  taskStreak: { color: Colors.textMuted, fontSize: 12 },
  doItBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  doItBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },

  // ── Empty states ───────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
