import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getListMyTicketsQueryKey, useListMyTickets } from "@workspace/api-client-react";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { EVENT_IMAGES, formatDate, formatTime } from "@/constants/data";
import type { Event } from "@/constants/data";

const LOGO_ICON = require("@/assets/images/logo-icon.png");
const { width } = Dimensions.get("window");

const VIBE_CONFIG: Record<string, { vibe: string; color: string; interest: string }> = {
  Music: { vibe: "Energetic", color: "#FF6B00", interest: "music" },
  Art: { vibe: "Thoughtful", color: "#A78BFA", interest: "art" },
  Food: { vibe: "Indulgent", color: "#FFA726", interest: "food" },
  Heritage: { vibe: "Grounded", color: "#00C853", interest: "heritage" },
  Comedy: { vibe: "Uplifting", color: "#E91E63", interest: "comedy" },
  Sports: { vibe: "Pumped", color: "#00C853", interest: "sports" },
  Nightlife: { vibe: "Electric", color: "#A78BFA", interest: "nightlife" },
  Film: { vibe: "Calm", color: "#4CAF50", interest: "film" },
  Culture: { vibe: "Connected", color: "#00BCD4", interest: "heritage" },
};

const INTERESTS = [
  { id: "music", label: "Music", icon: "music" },
  { id: "art", label: "Art", icon: "image" },
  { id: "food", label: "Food & Drink", icon: "coffee" },
  { id: "heritage", label: "Heritage", icon: "globe" },
  { id: "comedy", label: "Comedy", icon: "smile" },
  { id: "sports", label: "Sports", icon: "activity" },
  { id: "nightlife", label: "Nightlife", icon: "moon" },
  { id: "film", label: "Film", icon: "film" },
] as const;

const DIASPORA_COUNTRIES = ["Kenya", "Ghana", "Nigeria", "South Africa", "Uganda", "Tanzania"];

// Tiny deterministic tie-breaker only — used to stably order events that are
// otherwise perfectly tied on real signal (e.g. two categories the user has
// shown zero affinity for). It intentionally contributes far less than any
// genuine behavioral signal below, unlike the previous scoreEvent() which
// was *entirely* `76 + hash(id) % 20` — a function of the event's own id and
// nothing about the viewer, which is why two different accounts saw
// byte-identical scores for every event.
function hashId(id: string): number {
  return id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

interface ScoredEvent extends Event {
  score: number;
  vibe: string;
  vibeColor: string;
}

interface UserAffinity {
  /** Declared interests, e.g. ["music", "food"] from the Refine Vibe sheet. */
  userInterests: string[];
  /** category -> weighted count, built from saved events + real ticket purchases. */
  categoryAffinity: Record<string, number>;
  /** city -> weighted count, built the same way. */
  cityAffinity: Record<string, number>;
  savedEventIds: string[];
}

/**
 * Builds the per-user behavioral signal that scoreEvent() reads. Three real
 * sources, each with its own weight:
 *  - declared interests (explicit, but weakest — someone can tap a chip once)
 *  - saved events (an active bookmark, medium weight)
 *  - real ticket purchases via useListMyTickets (money actually spent on a
 *    category/city, the strongest signal available)
 * This is what makes two accounts diverge: it's built entirely from
 * account-specific state (AppContext's savedEvents/userInterests plus the
 * caller's own purchase history), never from the event's own id.
 */
function buildUserAffinity(
  allEvents: Event[],
  savedEventIds: string[],
  userInterests: string[],
  purchasedTickets: { event?: { category?: string; city?: string } }[],
): UserAffinity {
  const categoryAffinity: Record<string, number> = {};
  const cityAffinity: Record<string, number> = {};

  const bump = (map: Record<string, number>, key: string | undefined, weight: number) => {
    if (!key) return;
    map[key] = (map[key] ?? 0) + weight;
  };

  for (const id of savedEventIds) {
    const saved = allEvents.find((e) => e.id === id);
    if (!saved) continue;
    bump(categoryAffinity, saved.category, 2);
    bump(cityAffinity, saved.city, 1);
  }

  for (const ticket of purchasedTickets) {
    bump(categoryAffinity, ticket.event?.category, 3);
    bump(cityAffinity, ticket.event?.city, 2);
  }

  return { userInterests, categoryAffinity, cityAffinity, savedEventIds };
}

function scoreEvent(event: Event, affinity: UserAffinity): ScoredEvent {
  const config = VIBE_CONFIG[event.category] ?? { vibe: "Vibrant", color: "#FF6B00", interest: "" };

  let score = 55; // neutral baseline for an event with no signal at all
  if (config.interest && affinity.userInterests.includes(config.interest)) score += 15;
  score += Math.min(15, (affinity.categoryAffinity[event.category] ?? 0) * 3);
  score += Math.min(10, (affinity.cityAffinity[event.city] ?? 0) * 2);
  if (affinity.savedEventIds.includes(event.id)) score += 5;
  // Stable tie-breaker so two events with identical real signal don't render
  // in an arbitrary order — bounded to ±4, far below what any real signal
  // above contributes.
  score += (hashId(event.id) % 9) - 4;

  return {
    ...event,
    score: Math.max(40, Math.min(99, Math.round(score))),
    vibe: config.vibe,
    vibeColor: config.color,
  };
}

export default function ForYouScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userInterests, setUserInterests, savedEvents, authToken } = useApp();
  const { events, isLoading } = useEventCatalog();
  const [showRefine, setShowRefine] = useState(false);
  const [localInterests, setLocalInterests] = useState<string[]>(userInterests);

  // Real purchase history — the strongest signal this screen has access to.
  // Guarded by `enabled: !!authToken` since /tickets requires auth and a
  // signed-out visitor should just fall back to interests + saved events.
  const { data: ticketsData } = useListMyTickets({
    query: { queryKey: getListMyTicketsQueryKey(), enabled: !!authToken },
  });

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const affinity = useMemo(
    () => buildUserAffinity(events, savedEvents, userInterests, ticketsData?.tickets ?? []),
    [events, savedEvents, userInterests, ticketsData],
  );

  const scored = useMemo<ScoredEvent[]>(() => {
    return events
      .map((e) => scoreEvent(e, affinity))
      .sort((a, b) => b.score - a.score);
  }, [events, affinity]);

  const diasporaEvents = useMemo(() => {
    return scored
      .filter(
        (e) =>
          DIASPORA_COUNTRIES.includes(e.country) ||
          e.category === "Heritage"
      )
      .slice(0, 5);
  }, [scored]);

  const toggleInterest = (id: string) => {
    Haptics.selectionAsync();
    setLocalInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const applyRefine = () => {
    void setUserInterests(localInterests);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowRefine(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Hero Header ── */}
        <LinearGradient
          colors={["#0E0E0E", "#1A0800", "#0E0E0E"]}
          locations={[0, 0.5, 1]}
          style={[styles.hero, { paddingTop: topPad + 12 }]}
        >
          {/* Orange ambient glow */}
          <View style={styles.glowCircle} />

          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroEyebrow}>AI-POWERED FOR YOU</Text>
              <Text style={styles.heroTitle}>
                Your{"\n"}Personalized
              </Text>
              <View style={styles.vibeRow}>
                <Text style={styles.heroVibe}>Vibe</Text>
                <Text style={styles.heroStar}> ✦</Text>
              </View>
              <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
                Smart picks. Real vibes.{"\n"}Handpicked experiences{"\n"}that match your energy.
              </Text>
            </View>

            {/* K Logo Orb */}
            <View style={styles.orbWrapper}>
              <View style={styles.orbRing} />
              <View style={styles.orb}>
                <Image source={LOGO_ICON} style={styles.orbLogo} resizeMode="contain" />
              </View>
              <Text style={styles.orbStar}>✦</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Diaspora Picks ── */}
        {scored.length > 0 && (
          <View style={styles.diasporaSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Text style={{ color: "#7B61FF", fontSize: 14 }}>✦</Text>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Home Vibes
                </Text>
              </View>
              <Text style={[styles.diasporaSub, { color: colors.mutedForeground }]}>
                Events from the motherland
              </Text>
            </View>
            <FlatList
              horizontal
              data={diasporaEvents}
              keyExtractor={(e) => `disp-${e.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => {
                const img = EVENT_IMAGES[item.imageKey];
                return (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/event/${item.id}`);
                    }}
                    style={[styles.diasporaCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    accessibilityLabel={`${item.title} in ${item.city}`}
                    accessibilityRole="button"
                  >
                    <Image source={img} style={styles.diasporaCardImage} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.8)"]}
                      style={styles.diasporaCardGradient}
                    />
                    <View style={styles.diasporaCardInfo}>
                      <Text style={styles.diasporaCardCity}>{item.city.toUpperCase()}</Text>
                      <Text style={styles.diasporaCardTitle} numberOfLines={2}>{item.title}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Text style={{ color: "#FF6B00", fontSize: 14 }}>✦</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Top Matches For You
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setLocalInterests(userInterests);
              setShowRefine(true);
            }}
            style={[styles.refineBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            accessibilityLabel="Refine your vibe preferences"
            accessibilityRole="button"
          >
            <Feather name="sliders" size={13} color={colors.mutedForeground} />
            <Text style={[styles.refineBtnText, { color: colors.mutedForeground }]}>Refine Vibe</Text>
          </Pressable>
        </View>

        {/* ── Match Cards ── */}
        <View style={styles.cardList}>
          {isLoading && scored.length === 0 && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={[styles.loadingText, { color: "#888" }]}>Finding your matches…</Text>
            </View>
          )}
          {!isLoading && scored.length === 0 && (
            <View style={styles.emptyWrap}>
              <Feather name="star" size={36} color="#333" />
              <Text style={[styles.emptyTitle, { color: "#fff" }]}>No matches yet</Text>
              <Text style={[styles.emptyText, { color: "#888" }]}>
                Refine your vibe above to discover events tailored to you.
              </Text>
            </View>
          )}
          {!isLoading && scored.map((event) => {
            const image = EVENT_IMAGES[event.imageKey];
            return (
              <Pressable
                key={event.id}
                onPress={() => router.push(`/event/${event.id}`)}
                accessibilityLabel={`${event.title} in ${event.city}, ${event.score}% match`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.matchCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                {/* Image */}
                <Image source={image} style={styles.matchCardImage} resizeMode="cover" />

                {/* Info */}
                <View style={styles.matchCardInfo}>
                  <Text style={styles.matchCardCat}>
                    {event.category.toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.matchCardTitle, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {event.title}
                  </Text>
                  <View style={styles.matchCardMeta}>
                    <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.matchCardMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {event.venue}, {event.city}
                    </Text>
                  </View>
                  <View style={styles.matchCardMeta}>
                    <Feather name="calendar" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.matchCardMetaText, { color: colors.mutedForeground }]}>
                      {formatDate(event.date)} · {formatTime(event.time)}
                    </Text>
                  </View>
                </View>

                {/* Score */}
                <View
                  style={styles.matchCardScore}
                  accessible={true}
                  accessibilityLabel={`Match score ${event.score}%, ${event.vibe} vibe`}
                >
                  <Text style={[styles.matchScoreLabel, { color: colors.mutedForeground }]}>
                    Match Score
                  </Text>
                  <Text style={[styles.matchScorePct, { color: event.vibeColor }]}>
                    {event.score}%
                  </Text>
                  <View style={[styles.vibePill, { backgroundColor: event.vibeColor + "22", borderColor: event.vibeColor + "44" }]}>
                    <Text style={[styles.vibePillText, { color: event.vibeColor }]}>
                      {event.vibe}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Refine Vibe Modal ── */}
      {showRefine && (
        <Pressable style={styles.overlay} onPress={() => setShowRefine(false)}>
          <Pressable
            style={[styles.refineSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.refineSheetHandle} />
            <Text style={styles.refineSheetEyebrow}>REFINE VIBE</Text>
            <Text style={[styles.refineSheetTitle, { color: colors.foreground }]}>
              What moves you?
            </Text>
            <View style={styles.interestGrid}>
              {INTERESTS.map((item) => {
                const selected = localInterests.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleInterest(item.id)}
                    accessibilityLabel={`${item.label}${selected ? ", selected" : ""}`}
                    accessibilityRole="checkbox"
                    style={[
                      styles.interestChip,
                      {
                        backgroundColor: selected ? "rgba(255,107,0,0.15)" : colors.muted,
                        borderColor: selected ? "#FF6B00" : colors.border,
                      },
                    ]}
                  >
                    <Feather name={item.icon as any} size={14} color={selected ? "#FF6B00" : colors.mutedForeground} />
                    <Text style={[styles.interestLabel, { color: selected ? "#FF6B00" : colors.mutedForeground }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={styles.applyBtn}
              onPress={applyRefine}
              accessibilityLabel="Apply vibe preferences"
              accessibilityRole="button"
            >
              <Text style={styles.applyBtnText}>Apply Vibe</Text>
              <Feather name="check" size={16} color="#fff" />
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  hero: { paddingBottom: 28, paddingHorizontal: 20, overflow: "hidden" },
  glowCircle: {
    position: "absolute",
    right: -40,
    top: 20,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF6B00",
    opacity: 0.06,
  },
  heroContent: { flexDirection: "row", alignItems: "flex-start" },
  heroLeft: { flex: 1, gap: 2 },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#FF6B00",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 42,
    letterSpacing: -1,
  },
  vibeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  heroVibe: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FF6B00",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  heroStar: { fontSize: 20, color: "#FF6B00" },
  heroSub: { fontSize: 13, lineHeight: 20, marginTop: 4 },

  orbWrapper: { width: 130, height: 130, alignItems: "center", justifyContent: "center", position: "relative", marginTop: 10 },
  orbRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.3)",
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,107,0,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,107,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  orbLogo: { width: 52, height: 52 },
  orbStar: { position: "absolute", top: 2, right: 8, fontSize: 18, color: "#FF6B00" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  refineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  refineBtnText: { fontSize: 12, fontWeight: "600" },

  diasporaSection: { marginBottom: 8 },
  diasporaSub: { fontSize: 11 },
  diasporaCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  diasporaCardImage: { width: "100%", height: "100%" },
  diasporaCardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  diasporaCardInfo: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  diasporaCardCity: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#FF6B00",
    marginBottom: 4,
  },
  diasporaCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 18,
  },

  cardList: { paddingHorizontal: 16, gap: 12 },
  loadingWrap: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "600" },
  emptyWrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  matchCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    height: 120,
  },
  matchCardImage: { width: 110, height: "100%" },
  matchCardInfo: {
    flex: 1,
    padding: 10,
    gap: 3,
    justifyContent: "center",
  },
  matchCardCat: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#FF6B00",
    marginBottom: 2,
  },
  matchCardTitle: { fontSize: 15, fontWeight: "800", lineHeight: 19 },
  matchCardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  matchCardMetaText: { fontSize: 10, flex: 1 },

  matchCardScore: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 4,
  },
  matchScoreLabel: { fontSize: 9, fontWeight: "600", textAlign: "center" },
  matchScorePct: { fontSize: 28, fontWeight: "900" },
  vibePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  vibePillText: { fontSize: 9, fontWeight: "700" },

  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  refineSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  refineSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginBottom: 4,
  },
  refineSheetEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#FF6B00",
  },
  refineSheetTitle: { fontSize: 22, fontWeight: "900" },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  interestLabel: { fontSize: 13, fontWeight: "600" },
  applyBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 28,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
