import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { useQuestProgress, useCheckIn, type QuestView } from "@/hooks/useQuests";

const RARITY_COLOR: Record<string, string> = {
  common: "#A0A0A0",
  rare: "#4F9DFF",
  epic: "#7B61FF",
  legendary: "#FFB400",
};

type QuestTab = "all" | "progress" | "completed";

export default function QuestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken, tickets } = useApp();
  const { getEventById } = useEventCatalog();
  const { data, isLoading, isError } = useQuestProgress();
  const checkIn = useCheckIn();
  const [tab, setTab] = useState<QuestTab>("all");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  // Distinct events the user holds tickets for — candidates to check in.
  const ticketedEvents = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string }[] = [];
    for (const t of tickets) {
      if (seen.has(t.eventId)) continue;
      seen.add(t.eventId);
      const ev = getEventById(t.eventId);
      out.push({ id: t.eventId, title: ev?.title ?? "Your event" });
    }
    return out;
  }, [tickets, getEventById]);

  const filteredQuests = useMemo<QuestView[]>(() => {
    if (!data) return [];
    if (tab === "completed") return data.quests.filter((q) => q.completed);
    if (tab === "progress") return data.quests.filter((q) => !q.completed);
    return data.quests;
  }, [data, tab]);

  const handleCheckIn = (eventId: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkIn.mutate(eventId, {
      onSuccess: (res) => {
        if (res.alreadyCheckedIn) {
          Alert.alert("Already checked in", `You've already checked in to ${title}.`);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const lines: string[] = [];
        if (res.pointsEarned > 0) lines.push(`+${res.pointsEarned} KULTROINS`);
        if (res.questsCompleted.length) lines.push(`Completed: ${res.questsCompleted.map((q) => q.name).join(", ")}`);
        if (res.legendAwarded) lines.push("🏆 Kultr Legend unlocked!");
        Alert.alert("Checked in!", lines.join("\n") || `Welcome to ${title}.`);
      },
      onError: (e) => Alert.alert("Check-in failed", e instanceof Error ? e.message : "Please try again."),
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cultural Quests</Text>
          <View
            style={[styles.coinPill, { backgroundColor: colors.muted }]}
            accessibilityLabel={`${data?.balance ?? 0} KULTROINS`}
          >
            <Feather name="star" size={13} color="#FFB400" />
            <Text style={[styles.coinText, { color: colors.foreground }]}>
              {(data?.balance ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Explore. Experience. Earn rewards.
        </Text>

        {!authToken ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="compass" size={34} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to start questing</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Track your cultural journey and earn collectibles.
            </Text>
            <Pressable style={styles.cta} onPress={() => router.push("/login")}>
              <Text style={styles.ctaText}>Sign In</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF6B00" />
          </View>
        ) : isError || !data ? (
          <View style={styles.empty}>
            <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load quests</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Check your connection and try again.
            </Text>
          </View>
        ) : (
          <>
            {/* Overall progress / Legend banner */}
            <View
              style={[
                styles.overallCard,
                {
                  backgroundColor: data.overall.allCompleted ? "rgba(255,180,0,0.1)" : colors.card,
                  borderColor: data.overall.allCompleted ? "#FFB400" : colors.border,
                },
              ]}
            >
              <View style={styles.overallTop}>
                <Text style={[styles.overallTitle, { color: colors.foreground }]}>
                  {data.overall.allCompleted ? "🏆 Kultr Legend" : "Your Quest Journey"}
                </Text>
                <Text style={[styles.overallCount, { color: "#FF6B00" }]}>
                  {data.overall.completed}/{data.overall.total}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${data.overall.percent}%`,
                      backgroundColor: data.overall.allCompleted ? "#FFB400" : "#FF6B00",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.overallSub, { color: colors.mutedForeground }]}>
                {data.overall.allCompleted
                  ? "All quests completed — you've built your cultural legacy."
                  : `${data.overall.percent}% complete${data.pass.active ? ` · KULTR PASS ${data.pass.multiplier}× active` : ""}`}
              </Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {([
                { id: "all", label: "All Quests" },
                { id: "progress", label: "In Progress" },
                { id: "completed", label: "Completed" },
              ] as const).map((t) => {
                const active = tab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? "#FF6B00" : colors.muted,
                        borderColor: active ? "#FF6B00" : colors.border,
                      },
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.tabText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Quest cards */}
            <View style={styles.section}>
              {filteredQuests.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground, paddingVertical: 24 }]}>
                  {tab === "completed" ? "No completed quests yet." : "Nothing here right now."}
                </Text>
              ) : (
                filteredQuests.map((q) => (
                  <View
                    key={q.id}
                    style={[styles.questCard, { backgroundColor: colors.card, borderColor: q.completed ? "#00C853" + "55" : colors.border }]}
                  >
                    <View style={styles.questTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.questName, { color: colors.foreground }]}>{q.name}</Text>
                        <Text style={[styles.questDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {q.description}
                        </Text>
                      </View>
                      <View style={[styles.pointsBadge, { backgroundColor: colors.muted }]}>
                        <Feather name="star" size={11} color="#FFB400" />
                        <Text style={[styles.pointsText, { color: colors.foreground }]}>{q.points}</Text>
                      </View>
                    </View>
                    <View style={styles.questBottom}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.muted, flex: 1 }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${q.percent}%`, backgroundColor: q.completed ? "#00C853" : "#FF6B00" },
                          ]}
                        />
                      </View>
                      {q.completed ? (
                        <View style={styles.doneRow}>
                          <Feather name="check-circle" size={14} color="#00C853" />
                          <Text style={[styles.doneText, { color: "#00C853" }]}>Done</Text>
                        </View>
                      ) : (
                        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                          {q.progress}/{q.target}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Check-in to a ticketed event */}
            {ticketedEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Check in to earn</Text>
                {ticketedEvents.map((ev) => (
                  <View
                    key={ev.id}
                    style={[styles.checkinRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Feather name="map-pin" size={15} color="#FF6B00" />
                    <Text style={[styles.checkinTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Pressable
                      onPress={() => handleCheckIn(ev.id, ev.title)}
                      disabled={checkIn.isPending}
                      style={[styles.checkinBtn, { opacity: checkIn.isPending ? 0.6 : 1 }]}
                    >
                      <Text style={styles.checkinBtnText}>Check in</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Cultural Legacy — collectibles */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Cultural Legacy
                <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
                  {"  "}({data.collectibles.length})
                </Text>
              </Text>
              {data.collectibles.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Complete quests to earn collectible badges.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legacyRow}>
                  {data.collectibles.map((c) => {
                    const color = RARITY_COLOR[c.rarity] ?? "#A0A0A0";
                    return (
                      <View key={c.slug} style={[styles.badge, { borderColor: color + "66", backgroundColor: color + "12" }]}>
                        <View style={[styles.badgeIcon, { backgroundColor: color + "22", borderColor: color }]}>
                          <Feather name="award" size={22} color={color} />
                        </View>
                        <Text style={[styles.badgeName, { color: colors.foreground }]} numberOfLines={2}>
                          {c.name}
                        </Text>
                        <Text style={[styles.badgeRarity, { color }]}>{c.rarity.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Link to rewards */}
            <Pressable
              style={[styles.rewardsLink, { borderColor: "#FF6B00" }]}
              onPress={() => router.push("/rewards")}
            >
              <Feather name="gift" size={16} color="#FF6B00" />
              <Text style={styles.rewardsLinkText}>Spend your KULTROINS in Rewards</Text>
              <Feather name="chevron-right" size={16} color="#FF6B00" />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    minWidth: 44,
    borderRadius: 18,
    justifyContent: "center",
  },
  coinText: { fontSize: 14, fontWeight: "800" },
  subtitle: { fontSize: 13, paddingHorizontal: 16, marginTop: 4, marginBottom: 16 },

  loadingWrap: { alignItems: "center", paddingVertical: 60 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  cta: { backgroundColor: "#FF6B00", borderRadius: 25, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  overallCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  overallTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  overallTitle: { fontSize: 16, fontWeight: "800" },
  overallCount: { fontSize: 16, fontWeight: "800" },
  overallSub: { fontSize: 12 },

  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontWeight: "700" },

  section: { paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  questCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  questTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  questName: { fontSize: 15, fontWeight: "800", marginBottom: 3 },
  questDesc: { fontSize: 12, lineHeight: 17 },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pointsText: { fontSize: 13, fontWeight: "800" },
  questBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "right" },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  doneText: { fontSize: 12, fontWeight: "700" },

  checkinRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  checkinTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  checkinBtn: { backgroundColor: "#FF6B00", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  checkinBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  legacyRow: { gap: 12, paddingBottom: 4 },
  badge: { width: 110, alignItems: "center", gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  badgeName: { fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 15 },
  badgeRarity: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },

  rewardsLink: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  rewardsLinkText: { color: "#FF6B00", fontSize: 14, fontWeight: "700" },
});
