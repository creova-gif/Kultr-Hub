import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPills } from "@/components/CategoryPill";
import { EventCardCompact } from "@/components/EventCardCompact";
import { EventCardHero } from "@/components/EventCardHero";
import { CATEGORIES, EVENTS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("For You");

  const featured = EVENTS.filter((e) => e.featured);
  const nearby = EVENTS.filter((e) => e.city === "Nairobi").slice(0, 6);
  const weekend = EVENTS.filter((_, i) => i % 2 === 0).slice(0, 4);
  const displayed =
    selectedCategory === "For You"
      ? EVENTS
      : EVENTS.filter((e) => e.category === selectedCategory);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.logo, { color: colors.foreground }]}>
            <Text style={{ color: "#FF6B00" }}>K</Text>ultr
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/discover")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="search" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.muted }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
            <View style={styles.notifDot} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
          Good evening, Alex
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.foreground }]}>
          What's your <Text style={{ color: "#FF6B00" }}>vibe</Text> tonight?
        </Text>
      </View>

      {/* Category Pills */}
      <View style={styles.sectionNopad}>
        <CategoryPills
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      {/* Featured Hero Cards */}
      {selectedCategory === "For You" && (
        <>
          <View style={styles.section}>
            <SectionHeader title="Featured" />
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => <EventCardHero event={item} />}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              scrollEnabled={featured.length > 1}
            />
          </View>

          {/* Nearby */}
          <View style={styles.section}>
            <SectionHeader title="Near Nairobi" onSeeAll={() => router.push("/discover")} />
            <FlatList
              horizontal
              data={nearby}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => <EventCardCompact event={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>

          {/* This Weekend */}
          <View style={styles.section}>
            <SectionHeader title="This Weekend" onSeeAll={() => router.push("/discover")} />
            <View style={{ paddingHorizontal: 16 }}>
              {weekend.map((event) => (
                <EventCardCompact key={event.id} event={event} horizontal />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Filtered Results */}
      {selectedCategory !== "For You" && (
        <View style={styles.section}>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {displayed.length} event{displayed.length !== 1 ? "s" : ""} found
          </Text>
          <View style={{ paddingHorizontal: 16 }}>
            {displayed.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="calendar" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No {selectedCategory} events yet
                </Text>
              </View>
            ) : (
              displayed.map((event) => (
                <EventCardCompact key={event.id} event={event} horizontal />
              ))
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: "#FF6B00" }]}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  greeting: { paddingHorizontal: 16, marginBottom: 20 },
  greetingText: { fontSize: 13, marginBottom: 4 },
  greetingTitle: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  sectionNopad: { marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  resultCount: { fontSize: 13, paddingHorizontal: 16, marginBottom: 12 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyText: { fontSize: 15 },
});
