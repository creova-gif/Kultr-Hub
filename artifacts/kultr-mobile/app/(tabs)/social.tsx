import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { EVENT_IMAGES, formatDate } from "@/constants/data";

const { width } = Dimensions.get("window");

const FRIEND_NAMES = ["Kemi", "Ade", "Zara", "Kwame", "Amira", "Seun", "Fatima", "Kofi", "Aisha", "Dami"];
const FRIEND_COLORS = ["#FF6B00", "#7B61FF", "#00C853", "#E91E63", "#FFA726", "#00BCD4", "#FF5722", "#9C27B0"];

function getFriends(eventId: string, max = 4) {
  const seed = eventId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 2 + (seed % 3);
  return Array.from({ length: Math.min(count, max) }, (_, i) => ({
    name: FRIEND_NAMES[(seed + i * 7) % FRIEND_NAMES.length],
    color: FRIEND_COLORS[(seed + i * 3) % FRIEND_COLORS.length],
    initial: FRIEND_NAMES[(seed + i * 7) % FRIEND_NAMES.length][0],
  }));
}

function getFriendCount(eventId: string) {
  const seed = eventId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 2 + (seed % 19);
}

function getEventMonth(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en", { month: "short" }).toUpperCase();
  } catch {
    return "---";
  }
}

function getEventDay(dateStr: string): string {
  try {
    return String(new Date(dateStr).getDate());
  } catch {
    return "--";
  }
}

type SocialTab = "all" | "friends" | "invites";

const CATEGORY_TAGS: Record<string, string[]> = {
  Music: ["Live Music", "Afrobeats"],
  Art: ["Art Exhibition", "Creative"],
  Food: ["Food Experience", "Culinary"],
  Heritage: ["Culture", "Heritage"],
  Comedy: ["Comedy Show", "Fun"],
  Sports: ["Sports", "Active"],
  Nightlife: ["Nightlife", "House"],
  Film: ["Movies", "Chill"],
};

export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SocialTab>("all");
  const { events, isLoading } = useEventCatalog();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const socialEvents = useMemo(() => {
    const upcoming = events.filter((e) => {
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d >= new Date();
    });
    if (activeTab === "friends") return upcoming.slice(0, 4);
    if (activeTab === "invites") return upcoming.slice(1, 3);
    return upcoming;
  }, [events, activeTab]);

  const tabs: { id: SocialTab; label: string }[] = [
    { id: "all", label: "All Events" },
    { id: "friends", label: "Friends" },
    { id: "invites", label: "Invites" },
  ];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Social Hub</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            See what your friends are into.
          </Text>
        </View>
        <Pressable
          style={[styles.notifBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Feather name="bell" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* ── Filter Tabs + Filters button ── */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.id);
              }}
              style={[
                styles.filterTab,
                {
                  backgroundColor:
                    activeTab === tab.id ? "rgba(255,107,0,0.15)" : colors.muted,
                  borderColor: activeTab === tab.id ? "#FF6B00" : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: activeTab === tab.id ? "#FF6B00" : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={[styles.filtersBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="sliders" size={14} color={colors.mutedForeground} />
          <Text style={[styles.filtersBtnText, { color: colors.mutedForeground }]}>Filters</Text>
        </Pressable>
      </View>

      {/* ── Event Cards ── */}
      <View style={styles.cardList}>
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF6B00" />
          </View>
        )}
        {!isLoading && socialEvents.length === 0 && (
          <View style={styles.emptyWrap}>
            <Feather name="users" size={36} color="#333" />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Check back soon — your friends will be going somewhere.
            </Text>
          </View>
        )}
        {!isLoading && socialEvents.map((event) => {
          const image = EVENT_IMAGES[event.imageKey];
          const friends = getFriends(event.id);
          const friendCount = getFriendCount(event.id);
          const tags = CATEGORY_TAGS[event.category] ?? [event.category];
          const month = getEventMonth(event.date);
          const day = getEventDay(event.date);

          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/event/${event.id}`)}
              style={({ pressed }) => [
                styles.socialCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.95 : 1,
                },
              ]}
            >
              {/* Top row: date + title + image */}
              <View style={styles.cardTop}>
                {/* Date badge */}
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeMonth}>{month}</Text>
                  <Text style={styles.dateBadgeDay}>{day}</Text>
                </View>

                {/* Info */}
                <View style={styles.cardTopInfo}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {event.venue}, {event.city}
                    </Text>
                  </View>
                  {/* Tags */}
                  <View style={styles.tagsRow}>
                    {tags.slice(0, 2).map((tag) => (
                      <View
                        key={tag}
                        style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Thumbnail */}
                <Image source={image} style={styles.cardThumb} resizeMode="cover" />
              </View>

              {/* Bottom row: friends + actions */}
              <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                <View style={styles.friendsRow}>
                  {/* Avatar stack */}
                  <View style={styles.avatarStack}>
                    {friends.map((f, i) => (
                      <View
                        key={i}
                        accessible={true}
                        accessibilityLabel={f.name}
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: f.color,
                            marginLeft: i === 0 ? 0 : -10,
                            zIndex: friends.length - i,
                            borderColor: colors.card,
                          },
                        ]}
                      >
                        <Text style={styles.avatarInitial}>{f.initial}</Text>
                      </View>
                    ))}
                    {friendCount > friends.length && (
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: colors.muted, marginLeft: -10, borderColor: colors.card, zIndex: 0 },
                        ]}
                      >
                        <Text style={[styles.avatarInitial, { color: colors.mutedForeground, fontSize: 9 }]}>
                          +{friendCount - friends.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.friendCountText, { color: colors.mutedForeground }]}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>{friendCount}</Text>
                    {" "}friends are going
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actionBtns}>
                  <Pressable
                    style={[styles.chatBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/event/${event.id}` as any);
                    }}
                  >
                    <Feather name="message-circle" size={13} color={colors.foreground} />
                    <Text style={[styles.chatBtnText, { color: colors.foreground }]}>Chat</Text>
                  </Pressable>
                  <Pressable
                    style={styles.inviteBtn}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      await Share.share({
                        message: `🎉 Join me at ${event.title} on ${event.date} at ${event.venue}, ${event.city}! Get tickets on Kultr.`,
                        title: event.title,
                      });
                    }}
                  >
                    <Feather name="user-plus" size={13} color="#fff" />
                    <Text style={styles.inviteBtnText}>Invite</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Don't Go Solo card ── */}
      <View style={[styles.soloCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.soloIconWrap, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
          <Feather name="users" size={20} color="#FF6B00" />
        </View>
        <View style={styles.soloText}>
          <Text style={[styles.soloTitle, { color: colors.foreground }]}>Don't go solo.</Text>
          <Text style={[styles.soloSub, { color: colors.mutedForeground }]}>
            Invite your friends and make memories.
          </Text>
        </View>
        <Pressable
          style={[styles.findFriendsBtn, { borderColor: "#FF6B00" }]}
          onPress={async () => {
                Haptics.selectionAsync();
                await Share.share({
                  message: "Join me on Kultr — discover the best cultural events! Download the app and let's go together.",
                  title: "Join Kultr",
                });
              }}
        >
          <Text style={styles.findFriendsBtnText}>Find Friends</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 30, fontWeight: "900" },
  headerSub: { fontSize: 13, marginTop: 2 },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    marginBottom: 16,
    gap: 8,
  },
  tabsScroll: {
    paddingLeft: 16,
    gap: 8,
    flexDirection: "row",
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterTabText: { fontSize: 13, fontWeight: "700" },
  filtersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  filtersBtnText: { fontSize: 12, fontWeight: "600" },

  cardList: { paddingHorizontal: 16, gap: 12 },
  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  emptyWrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  socialCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  dateBadge: {
    width: 48,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    flexShrink: 0,
  },
  dateBadgeMonth: { fontSize: 9, fontWeight: "800", color: "#FF6B00", letterSpacing: 0.5 },
  dateBadgeDay: { fontSize: 22, fontWeight: "900", color: "#FF6B00", lineHeight: 26 },

  cardTopInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, flex: 1 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: "600" },
  cardThumb: { width: 72, height: 80, borderRadius: 10 },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  friendsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarInitial: { color: "#fff", fontSize: 10, fontWeight: "800" },
  friendCountText: { fontSize: 11 },

  actionBtns: { flexDirection: "row", gap: 8 },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chatBtnText: { fontSize: 12, fontWeight: "700" },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FF6B00",
  },
  inviteBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  soloCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  soloIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  soloText: { flex: 1 },
  soloTitle: { fontSize: 14, fontWeight: "800" },
  soloSub: { fontSize: 11, marginTop: 1 },
  findFriendsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  findFriendsBtnText: { color: "#FF6B00", fontSize: 12, fontWeight: "700" },
});
