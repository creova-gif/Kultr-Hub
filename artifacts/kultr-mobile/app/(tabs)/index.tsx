import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCardCompact } from "@/components/EventCardCompact";
import { EventCardHero } from "@/components/EventCardHero";
import { CATEGORIES, EVENTS, EVENT_IMAGES, getDaysUntil } from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";

const { width } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, string> = {
  "For You": "star",
  Music: "music",
  Art: "aperture",
  Food: "coffee",
  Heritage: "flag",
  Comedy: "smile",
  Sports: "zap",
  Nightlife: "moon",
};

const CITY_TO_COUNTRY: Record<string, string> = {
  Nairobi: "KE",
  Lagos: "NG",
  Accra: "GH",
  Kampala: "UG",
  "Dar es Salaam": "TZ",
};

const COUNTRY_FLAGS: Record<string, string> = {
  KE: "🇰🇪", NG: "🇳🇬", GH: "🇬🇭", UG: "🇺🇬", TZ: "🇹🇿",
  RW: "🇷🇼", ET: "🇪🇹",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("For You");
  const { events } = useEventCatalog();

  const featured = events.filter((e) => e.featured);
  const soonest = events.filter((e) => getDaysUntil(e.date) >= 0)
    .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));
  const thisWeekend = soonest.filter((e) => getDaysUntil(e.date) <= 60).slice(0, 4);
  const acrossAfrica = events.filter((e) => e.city !== "Nairobi").slice(0, 4);
  const nearNairobi = events.filter((e) => e.city === "Nairobi").slice(0, 5);

  const displayed =
    selectedCategory === "For You"
      ? events
      : events.filter((e) => e.category === selectedCategory);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      {/* ── HERO HEADER ── */}
      <View style={[styles.heroHeader, { paddingTop: topPad + 8 }]}>
        {/* African pattern strip */}
        <View style={styles.patternStrip}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternCell,
                { backgroundColor: i % 3 === 0 ? "#FF6B00" : i % 3 === 1 ? "#1C1C1C" : "#2A2A2A" },
              ]}
            />
          ))}
        </View>

        {/* Nav row */}
        <View style={styles.navRow}>
          <Image
            source={require("@/assets/images/logo-wordmark.png")}
            style={styles.logoWordmark}
            resizeMode="contain"
          />
          <View style={styles.navActions}>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={styles.navBtn}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Feather name="bell" size={17} color="#ccc" />
              <View style={styles.notifDot} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatar}
              accessibilityLabel="Profile"
              accessibilityRole="button"
            >
              <Text style={styles.avatarText}>A</Text>
            </Pressable>
          </View>
        </View>

        {/* Big greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingSmall}>Good evening — Nairobi, Kenya</Text>
          <Text style={styles.greetingBig} numberOfLines={2}>
            {"What's your\n"}
            <Text style={{ color: "#FF6B00", fontStyle: "italic" }}>vibe</Text>
            {" tonight?"}
          </Text>
        </View>

        {/* Category pills — icon + label */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const icon = CATEGORY_ICONS[cat] ?? "circle";
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: active ? "#FF6B00" : "#1C1C1C",
                    borderColor: active ? "#FF6B00" : "#2A2A2A",
                  },
                ]}
                accessibilityLabel={cat}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Feather name={icon as any} size={12} color={active ? "#fff" : "#666"} />
                <Text style={[styles.categoryLabel, { color: active ? "#fff" : "#888" }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── FILTERED CATEGORY VIEW ── */}
      {selectedCategory !== "For You" ? (
        <View style={styles.filteredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{selectedCategory}</Text>
            <Text style={{ color: "#888", fontSize: 13 }}>{displayed.length} events</Text>
          </View>
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={36} color="#333" />
              <Text style={{ color: "#888", fontSize: 15 }}>No {selectedCategory} events yet</Text>
            </View>
          ) : (
            displayed.map((event) => (
              <View key={event.id} style={{ paddingHorizontal: 16 }}>
                <EventCardCompact event={event} horizontal />
              </View>
            ))
          )}
        </View>
      ) : (
        <>
          {/* ── FEATURED ── */}
          <View style={styles.featuredSection}>
            <SectionTitle label="FEATURED" accent="On Stage" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width - 32 + 14}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {featured.map((item) => (
                <EventCardHero key={item.id} event={item} />
              ))}
            </ScrollView>
          </View>

          {/* ── HAPPENING SOON bento grid ── */}
          {thisWeekend.length > 0 && (
            <View style={styles.section}>
              <SectionTitle label="HAPPENING SOON" accent="Next 60 days" />
              <View style={styles.bentoGrid}>
                {thisWeekend.map((event, i) => {
                  const daysUntil = getDaysUntil(event.date);
                  const image = EVENT_IMAGES[event.imageKey];
                  const isBig = i === 0;
                  return (
                    <Pressable
                      key={event.id}
                      onPress={() => router.push(`/event/${event.id}`)}
                      style={({ pressed }) => [
                        styles.bentoCard,
                        isBig ? styles.bentoLarge : styles.bentoSmall,
                        { opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <Image
                        source={image as any}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.95)"]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayNum}>
                          {daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TMRW" : `${daysUntil}d`}
                        </Text>
                      </View>
                      <View style={styles.bentoContent}>
                        <View style={styles.bentoCat}>
                          <Text style={styles.bentoCatText}>{event.category.toUpperCase()}</Text>
                        </View>
                        <Text
                          style={[styles.bentoTitle, isBig ? styles.bentoTitleLg : styles.bentoTitleSm]}
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>
                        {isBig && (
                          <Text style={styles.bentoMeta}>
                            {event.venue} · {event.city}
                          </Text>
                        )}
                        <Text style={styles.bentoPrice}>
                          {event.currencySymbol} {event.price.toLocaleString()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── NEAR NAIROBI ── */}
          {nearNairobi.length > 0 && (
            <View style={styles.section}>
              <SectionTitle label="NEAR NAIROBI" onSeeAll={() => router.push("/(tabs)/discover" as any)} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {nearNairobi.map((item) => (
                  <EventCardCompact key={item.id} event={item} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── ACROSS AFRICA ── */}
          {acrossAfrica.length > 0 && (
            <View style={styles.section}>
              <SectionTitle label="ACROSS AFRICA" onSeeAll={() => router.push("/(tabs)/discover" as any)} />
              <View style={styles.africaGrid}>
                {acrossAfrica.map((event) => {
                  const image = EVENT_IMAGES[event.imageKey];
                  const countryCode = CITY_TO_COUNTRY[event.city] ?? "KE";
                  const flag = COUNTRY_FLAGS[countryCode] ?? "🌍";
                  return (
                    <Pressable
                      key={event.id}
                      onPress={() => router.push(`/event/${event.id}`)}
                      style={({ pressed }) => [
                        styles.africaCard,
                        { opacity: pressed ? 0.88 : 1 },
                      ]}
                    >
                      <Image
                        source={image as any}
                        style={styles.africaImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.9)"]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.africaContent}>
                        <Text style={styles.africaCityFlag}>{flag}</Text>
                        <Text style={styles.africaCity}>{event.city.toUpperCase()}</Text>
                        <Text style={styles.africaTitle} numberOfLines={2}>{event.title}</Text>
                        <Text style={styles.africaPrice}>
                          {event.currencySymbol} {event.price.toLocaleString()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function SectionTitle({
  label,
  accent,
  onSeeAll,
}: {
  label: string;
  accent?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View>
        <Text style={styles.sectionLabel}>{label}</Text>
        {accent && <Text style={styles.sectionAccent}>{accent}</Text>}
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <Feather name="arrow-right" size={12} color="#FF6B00" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#111" },

  heroHeader: { paddingBottom: 24 },
  patternStrip: { flexDirection: "row", height: 4, marginBottom: 20 },
  patternCell: { flex: 1 },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoWordmark: { width: 110, height: 36 },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#1C1C1C",
  },
  notifDot: {
    position: "absolute", top: 8, right: 8,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: "#FF6B00", borderWidth: 1.5, borderColor: "#111",
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FF6B00",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  greetingBlock: { paddingHorizontal: 20, marginBottom: 24 },
  greetingSmall: { color: "#888", fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 6 },
  greetingBig: { color: "#fff", fontSize: 38, fontWeight: "900", lineHeight: 44, letterSpacing: -1 },

  categoryScroll: { paddingHorizontal: 20, gap: 8 },
  categoryPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  categoryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  featuredSection: { marginBottom: 36, paddingTop: 8 },
  section: { marginBottom: 36 },
  filteredSection: { paddingTop: 8 },

  sectionHeaderRow: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionLabel: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 2 },
  sectionAccent: { color: "#FF6B00", fontSize: 11, fontWeight: "600", marginTop: 1 },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllText: { color: "#FF6B00", fontSize: 12, fontWeight: "700" },

  // Bento
  bentoGrid: {
    paddingHorizontal: 20, gap: 10,
    flexDirection: "row", flexWrap: "wrap",
  },
  bentoCard: { borderRadius: 16, overflow: "hidden", position: "relative" },
  bentoLarge: { width: "100%", height: 200 },
  bentoSmall: { width: (width - 50) / 3, height: 140 },
  dayBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "#FF6B00", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  dayNum: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  bentoContent: { position: "absolute", bottom: 12, left: 12, right: 12 },
  bentoCat: {
    backgroundColor: "rgba(255,107,0,0.2)", alignSelf: "flex-start",
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 4,
  },
  bentoCatText: { color: "#FF6B00", fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  bentoTitle: { color: "#fff", fontWeight: "800" },
  bentoTitleLg: { fontSize: 22, lineHeight: 26 },
  bentoTitleSm: { fontSize: 12, lineHeight: 15 },
  bentoMeta: { color: "#A0A0A0", fontSize: 11, marginTop: 2, marginBottom: 4 },
  bentoPrice: { color: "#FF6B00", fontSize: 11, fontWeight: "700" },

  // Africa grid
  africaGrid: {
    paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  africaCard: {
    width: (width - 50) / 2, height: 180, borderRadius: 16,
    overflow: "hidden", position: "relative", backgroundColor: "#1A1A1A",
  },
  africaImage: { width: "100%", height: "100%" },
  africaContent: { position: "absolute", bottom: 12, left: 12, right: 12 },
  africaCityFlag: { fontSize: 20, marginBottom: 2 },
  africaCity: { color: "#A0A0A0", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  africaTitle: { color: "#fff", fontSize: 13, fontWeight: "800", lineHeight: 16, marginBottom: 4 },
  africaPrice: { color: "#FF6B00", fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
});
