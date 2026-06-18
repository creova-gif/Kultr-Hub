import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  useGetGamificationProfile,
  getGetGamificationProfileQueryKey,
} from "@workspace/api-client-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getLevelTitle(level: number): string {
  if (level <= 2) return "Newcomer";
  if (level <= 5) return "Explorer";
  if (level <= 9) return "Wanderer";
  if (level <= 14) return "Trailblazer";
  if (level <= 19) return "Culture Bearer";
  return "Legend";
}

const BADGE_ICONS: Record<string, string> = {
  week_warrior: "calendar",
  consistent: "zap",
  event_king: "award",
  community_builder: "users",
};

export default function GamificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken, authUser } = useApp();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const { data, isLoading, isError } = useGetGamificationProfile({
    query: {
      queryKey: getGetGamificationProfileQueryKey(),
      enabled: !!authToken,
    },
  });

  const displayName = authUser?.displayName ?? "Kultr Member";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const level = data?.level ?? 1;
  const xp = data?.xp ?? 0;
  const xpToNextLevel = data?.xpToNextLevel ?? 200;
  const xpPercent = Math.min(100, Math.round((xp / xpToNextLevel) * 100));
  const currentStreak = data?.currentStreak ?? 0;
  const bestStreak = data?.bestStreak ?? 0;
  const badges = data?.badges ?? [];
  const last7Days = data?.last7Days ?? [];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Streaks & Badges</Text>
        <View style={styles.backBtn} />
      </View>

      {!authToken ? (
        <View style={styles.empty}>
          <Feather name="lock" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to track your streaks</Text>
          <Pressable style={styles.cta} onPress={() => router.push("/login")}>
            <Text style={styles.ctaText}>Sign In</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : isError ? (
        <View style={styles.empty}>
          <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load your profile</Text>
        </View>
      ) : (
        <>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
                <View style={styles.levelRow}>
                  <Text style={[styles.levelLabel, { color: "#FF6B00" }]}>Level {level}</Text>
                  <Text style={[styles.levelDot, { color: colors.mutedForeground }]}>•</Text>
                  <Text style={[styles.levelTitle, { color: colors.mutedForeground }]}>{getLevelTitle(level)}</Text>
                </View>
                <View style={[styles.xpTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
                </View>
                <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
                  {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.viewProfileBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityLabel="View Profile"
              accessibilityRole="button"
            >
              <Feather name="user" size={13} color={colors.foreground} />
              <Text style={[styles.viewProfileText, { color: colors.foreground }]}>View Profile</Text>
            </Pressable>
          </View>

          {/* Kultr Streaks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.fireEmoji}>🔥</Text>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Kultr Streaks</Text>
              </View>
            </View>

            {/* Featured streak banner */}
            <View style={styles.streakBanner}>
              <View style={styles.streakBannerLeft}>
                {currentStreak >= 7 ? (
                  <>
                    <Text style={styles.streakBannerTitle}>{currentStreak}-Day Event</Text>
                    <Text style={styles.streakBannerAccent}>Streak!</Text>
                    <Text style={styles.streakBannerSub}>
                      You showed up and showed out. Keep it going!
                    </Text>
                  </>
                ) : currentStreak > 0 ? (
                  <>
                    <Text style={styles.streakBannerTitle}>{currentStreak}-Day</Text>
                    <Text style={styles.streakBannerAccent}>Streak</Text>
                    <Text style={styles.streakBannerSub}>
                      Keep checking in to build your streak!
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.streakBannerTitle}>Start Your</Text>
                    <Text style={styles.streakBannerAccent}>Streak!</Text>
                    <Text style={styles.streakBannerSub}>
                      Check in to your next event to begin.
                    </Text>
                  </>
                )}
              </View>
              <View style={styles.streakRing}>
                <View style={styles.streakRingInner}>
                  <Text style={styles.streakRingNumber}>{currentStreak}</Text>
                  <Text style={styles.streakRingLabel}>DAYS</Text>
                </View>
              </View>
            </View>

            {/* 7-day calendar */}
            <View style={[styles.calendarRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {last7Days.map((day, i) => {
                const dayOfWeek = new Date(day.date + "T12:00:00Z").getDay();
                const label = DAY_LABELS[(dayOfWeek + 6) % 7];
                return (
                  <View key={day.date} style={styles.calendarCell}>
                    <View style={[styles.calendarDot, day.checked ? styles.calendarDotActive : { backgroundColor: colors.muted }]}>
                      {day.checked && <Feather name="check" size={11} color="#fff" />}
                    </View>
                    <Text style={[styles.calendarLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Current / Best streak stats */}
            <View style={[styles.streakStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.streakStatItem}>
                <View style={[styles.streakStatIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
                  <Text style={styles.fireEmoji}>🔥</Text>
                </View>
                <View>
                  <Text style={[styles.streakStatLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
                  <Text style={[styles.streakStatValue, { color: "#FF6B00" }]}>{currentStreak} Days</Text>
                </View>
              </View>
              <View style={[styles.streakStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.streakStatItem}>
                <View style={[styles.streakStatIcon, { backgroundColor: "rgba(255,180,0,0.12)" }]}>
                  <Text style={styles.fireEmoji}>⭐</Text>
                </View>
                <View>
                  <Text style={[styles.streakStatLabel, { color: colors.mutedForeground }]}>Best Streak</Text>
                  <Text style={[styles.streakStatValue, { color: "#FFB400" }]}>{bestStreak} Days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Badges</Text>
            </View>
            <View style={styles.badgeGrid}>
              {badges.map((badge) => {
                const icon = (BADGE_ICONS[badge.id] ?? "award") as "calendar" | "zap" | "award" | "users";
                return (
                  <View
                    key={badge.id}
                    style={[
                      styles.badgeTile,
                      {
                        backgroundColor: colors.card,
                        borderColor: badge.earned ? "#FF6B00" + "55" : colors.border,
                        opacity: badge.earned ? 1 : 0.4,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeIconWrap,
                        {
                          backgroundColor: badge.earned ? "rgba(255,107,0,0.15)" : colors.muted,
                          borderColor: badge.earned ? "#FF6B00" : colors.border,
                        },
                      ]}
                    >
                      <Feather name={icon} size={24} color={badge.earned ? "#FF6B00" : colors.mutedForeground} />
                    </View>
                    <Text style={[styles.badgeName, { color: colors.foreground }]} numberOfLines={2}>
                      {badge.name}
                    </Text>
                    <Text style={[styles.badgeDesc, { color: colors.mutedForeground }]}>{badge.description}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
  loadingWrap: { alignItems: "center", paddingVertical: 60 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  cta: { backgroundColor: "#FF6B00", borderRadius: 25, paddingHorizontal: 28, paddingVertical: 12 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  profileRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitials: { color: "#fff", fontSize: 20, fontWeight: "900" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 17, fontWeight: "800" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  levelLabel: { fontSize: 13, fontWeight: "800" },
  levelDot: { fontSize: 13 },
  levelTitle: { fontSize: 13 },
  xpTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  xpFill: { height: "100%", backgroundColor: "#FF6B00", borderRadius: 3 },
  xpLabel: { fontSize: 10 },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  viewProfileText: { fontSize: 13, fontWeight: "600" },

  section: { paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fireEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },

  streakBanner: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  streakBannerLeft: { flex: 1, gap: 4 },
  streakBannerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  streakBannerAccent: { color: "#FF6B00", fontSize: 26, fontWeight: "900" },
  streakBannerSub: { color: "#888", fontSize: 12, lineHeight: 18, marginTop: 4 },
  streakRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,107,0,0.05)",
    flexShrink: 0,
  },
  streakRingInner: { alignItems: "center" },
  streakRingNumber: { color: "#FF6B00", fontSize: 32, fontWeight: "900", lineHeight: 36 },
  streakRingLabel: { color: "#FF6B00", fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  calendarRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: "space-around",
  },
  calendarCell: { alignItems: "center", gap: 6 },
  calendarDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDotActive: { backgroundColor: "#FF6B00" },
  calendarLabel: { fontSize: 10, fontWeight: "600" },

  streakStats: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  streakStatItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  streakStatIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  streakStatLabel: { fontSize: 11 },
  streakStatValue: { fontSize: 18, fontWeight: "900" },
  streakStatDivider: { width: 1, marginHorizontal: 8 },

  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeTile: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  badgeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  badgeName: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  badgeDesc: { fontSize: 10, textAlign: "center" },
});
