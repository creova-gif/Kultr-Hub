import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
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

const MENU_ITEMS = [
  { icon: "compass", label: "Cultural Quests", route: "/quests" },
  { icon: "activity", label: "Streaks & Badges", route: "/gamification" },
  { icon: "flag", label: "Tribe Leaders Program", route: "/tribe-leaders" },
  { icon: "gift", label: "Rewards", route: "/rewards" },
  { icon: "heart", label: "Saved Events", route: "/saved" },
  { icon: "tag", label: "My Tickets", route: "/(tabs)/tickets" },
  { icon: "plus-circle", label: "Create Event", route: "/create-event" },
  { icon: "star", label: "My Reviews", route: null },
  { icon: "users", label: "Following", route: null },
  { icon: "bell", label: "Notifications", route: "/notifications" },
  { icon: "shield", label: "Privacy & Data", route: "/privacy-data" },
  { icon: "settings", label: "Settings", route: "/settings" },
  { icon: "help-circle", label: "Help & Support", route: null },
] as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRevenue(amount: number, symbol: string) {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return `${symbol}${amount}`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tickets, savedEvents, createdEvents, authUser, clearAuth } = useApp();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const isCreator = createdEvents.length > 0;

  const displayName = authUser?.displayName ?? "Kultr Member";
  const initials = getInitials(displayName);
  const handle = authUser
    ? `@${authUser.displayName.toLowerCase().replace(/\s+/g, "")}`
    : "@kultruser";
  const totalRevenue = createdEvents.reduce((s, e) => s + e.revenue, 0);
  const totalTicketsSold = createdEvents.reduce((s, e) => s + e.ticketsSold, 0);
  const liveEvents = createdEvents.filter((e) => e.status === "live").length;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <Pressable
          onPress={() => router.push("/notifications")}
          style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Feather name="bell" size={18} color={colors.foreground} />
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* User Card */}
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.userCardTop}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatar, { backgroundColor: "#FF6B00" }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: "#00C853" }]}>
              <Feather name="check" size={8} color="#fff" />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{displayName}</Text>
            <Text style={[styles.userHandle, { color: colors.mutedForeground }]}>{handle}</Text>
            <View style={styles.memberRow}>
              <Feather name="award" size={11} color="#FF6B00" />
              <Text style={[styles.memberText, { color: "#FF6B00" }]}>
                {isCreator ? "Kultr Creator" : "Kultr Member"}
              </Text>
            </View>
          </View>
          <Pressable style={[styles.editBtn, { borderColor: "#FF6B00" }]}>
            <Text style={[styles.editBtnText, { color: "#FF6B00" }]}>Edit</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          {[
            { label: "Tickets", value: tickets.length.toString(), onPress: () => router.push("/(tabs)/tickets") },
            { label: "Saved", value: savedEvents.length.toString(), onPress: () => router.push("/saved") },
            { label: "Events", value: createdEvents.length.toString(), onPress: () => router.push("/create-event") },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              <Pressable style={styles.statItem} onPress={stat.onPress ?? undefined}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: "#FF6B00" }]}>{stat.label}</Text>
              </Pressable>
              {i < 2 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── Creator Dashboard ── */}
      {isCreator ? (
        <View style={styles.dashboardSection}>
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardTitleRow}>
              <Feather name="zap" size={16} color="#FF6B00" />
              <Text style={[styles.dashboardTitle, { color: colors.foreground }]}>Creator Dashboard</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => {
                  if (!authUser) {
                    Alert.alert("Sign In Required", "Please sign in to access Creator Studio.");
                    return;
                  }
                  router.push("/creator-studio" as any);
                }}
                style={[styles.newEventBtn, { backgroundColor: "rgba(255,107,0,0.1)" }]}
              >
                <Feather name="bar-chart-2" size={14} color="#FF6B00" />
                <Text style={styles.newEventBtnText}>Studio</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!authUser) {
                    Alert.alert("Sign In Required", "Please sign in to create events.");
                    return;
                  }
                  router.push("/create-event");
                }}
                style={styles.newEventBtn}
              >
                <Feather name="plus" size={14} color="#FF6B00" />
                <Text style={styles.newEventBtnText}>New Event</Text>
              </Pressable>
            </View>
          </View>

          {/* Revenue stats row */}
          <View style={styles.revenueRow}>
            <View style={[styles.revenueCard, { backgroundColor: "#0E2200", borderColor: "#00C853" + "40" }]}>
              <Text style={styles.revenueValue}>
                {formatRevenue(totalRevenue, createdEvents[0]?.currencySymbol ?? "KSh")}
              </Text>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <View style={styles.revenueIconWrapper}>
                <Feather name="trending-up" size={14} color="#00C853" />
              </View>
            </View>
            <View style={[styles.revenueCard, { backgroundColor: "#1A0A00", borderColor: "#FF6B00" + "40" }]}>
              <Text style={[styles.revenueValue, { color: "#FF6B00" }]}>{totalTicketsSold}</Text>
              <Text style={styles.revenueLabel}>Tickets Sold</Text>
              <View style={[styles.revenueIconWrapper, { backgroundColor: "rgba(255,107,0,0.1)" }]}>
                <Feather name="tag" size={14} color="#FF6B00" />
              </View>
            </View>
            <View style={[styles.revenueCard, { backgroundColor: "#0A0A1A", borderColor: "#7B61FF" + "40" }]}>
              <Text style={[styles.revenueValue, { color: "#7B61FF" }]}>{liveEvents}</Text>
              <Text style={styles.revenueLabel}>Live Now</Text>
              <View style={[styles.revenueIconWrapper, { backgroundColor: "rgba(123,97,255,0.1)" }]}>
                <Feather name="radio" size={14} color="#7B61FF" />
              </View>
            </View>
          </View>

          {/* Created events list */}
          {createdEvents.map((ev) => (
            <View
              key={ev.id}
              style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.eventStatusDot, {
                backgroundColor: ev.status === "live" ? "#00C853" : ev.status === "ended" ? "#777" : "#FF6B00",
              }]} />
              <View style={styles.eventRowLeft}>
                <Text style={[styles.eventRowTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={[styles.eventRowMeta, { color: colors.mutedForeground }]}>
                  {ev.date} · {ev.venue}
                </Text>
              </View>
              <View style={styles.eventRowRight}>
                <Text style={[styles.eventRowRevenue, { color: "#00C853" }]}>
                  {formatRevenue(ev.revenue, ev.currencySymbol)}
                </Text>
                <Text style={[styles.eventRowSold, { color: colors.mutedForeground }]}>
                  {ev.ticketsSold} sold
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        /* ── Become a Creator CTA ── */
        <View style={[styles.creatorCard, { backgroundColor: "#1A0A00", borderColor: "#FF6B00" }]}>
          <View style={styles.creatorLeft}>
            <Feather name="zap" size={20} color="#FF6B00" />
            <View>
              <Text style={[styles.creatorTitle, { color: "#fff" }]}>Become a Creator</Text>
              <Text style={[styles.creatorSub, { color: "#888" }]}>
                List your events and reach thousands
              </Text>
            </View>
          </View>
          <Pressable style={styles.creatorBtn} onPress={() => router.push("/create-event")}>
            <Text style={styles.creatorBtnText}>Apply</Text>
          </Pressable>
        </View>
      )}

      {/* Menu */}
      <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => item.route && router.push(item.route as any)}
            style={({ pressed }) => [
              styles.menuItem,
              {
                borderBottomWidth: index < MENU_ITEMS.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.muted : "transparent",
              },
            ]}
          >
            <View style={[
              styles.menuIconWrapper,
              {
                backgroundColor: item.label === "Create Event"
                  ? "rgba(255,107,0,0.12)"
                  : colors.muted,
              },
            ]}>
              <Feather
                name={item.icon as any}
                size={16}
                color={item.route ? "#FF6B00" : colors.foreground}
              />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      {/* Sign in / Sign out */}
      {authUser ? (
        <Pressable
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              "Sign Out",
              "Are you sure you want to sign out?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: clearAuth },
              ],
            );
          }}
        >
          <Feather name="log-out" size={16} color="#D32F2F" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.signOutBtn, { borderColor: "#FF6B00" }]}
          onPress={() => router.push("/login")}
        >
          <Feather name="log-in" size={16} color="#FF6B00" />
          <Text style={[styles.signOutText, { color: "#FF6B00" }]}>Sign In</Text>
        </Pressable>
      )}

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        Kultr v1.0 · Bold Culture. Timeless Impact.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
    borderWidth: 1.5,
    borderColor: "#111111",
  },
  userCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  userCardTop: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1C1C1C",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  userHandle: { fontSize: 13, marginBottom: 4 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberText: { fontSize: 11, fontWeight: "600" },
  editBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  statDivider: { width: 1, marginVertical: 4 },

  // Creator Dashboard
  dashboardSection: { marginHorizontal: 16, marginBottom: 16, gap: 10 },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dashboardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dashboardTitle: { fontSize: 17, fontWeight: "800" },
  newEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF6B00",
  },
  newEventBtnText: { color: "#FF6B00", fontSize: 12, fontWeight: "700" },

  revenueRow: { flexDirection: "row", gap: 8 },
  revenueCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 3,
    position: "relative",
    overflow: "hidden",
  },
  revenueValue: { fontSize: 20, fontWeight: "900", color: "#00C853" },
  revenueLabel: { fontSize: 10, color: "#666", fontWeight: "600" },
  revenueIconWrapper: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,200,83,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  eventStatusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  eventRowLeft: { flex: 1 },
  eventRowTitle: { fontSize: 14, fontWeight: "700" },
  eventRowMeta: { fontSize: 11, marginTop: 2 },
  eventRowRight: { alignItems: "flex-end" },
  eventRowRevenue: { fontSize: 15, fontWeight: "800" },
  eventRowSold: { fontSize: 11, marginTop: 1 },

  // Become a Creator CTA
  creatorCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  creatorLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  creatorTitle: { fontSize: 14, fontWeight: "700" },
  creatorSub: { fontSize: 12, marginTop: 1 },
  creatorBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  creatorBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  menuSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    marginTop: 16,
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15 },
  signOutBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  signOutText: { color: "#D32F2F", fontSize: 15, fontWeight: "600" },
  version: { fontSize: 11, textAlign: "center", marginBottom: 8 },
});
