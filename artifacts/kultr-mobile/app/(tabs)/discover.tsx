import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPills } from "@/components/CategoryPill";
import { EventCardCompact } from "@/components/EventCardCompact";
import { CATEGORIES, EVENTS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("For You");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const filtered = EVENTS.filter((e) => {
    const matchesSearch =
      search.trim() === "" ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === "For You" || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const cities = [...new Set(EVENTS.map((e) => e.city))];

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Culture <Text style={{ color: "#FF6B00" }}>Compass</Text>
        </Text>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={13} color="#FF6B00" />
          <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
            Nairobi, Kenya
          </Text>
          <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search events, artists, cities..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Feather
            name="x"
            size={16}
            color={colors.mutedForeground}
            onPress={() => setSearch("")}
          />
        )}
      </View>

      {/* Categories */}
      <View style={styles.categories}>
        <CategoryPills
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      {/* Cities quick filter */}
      {search.length === 0 && selectedCategory === "For You" && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by City</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
            {cities.map((city) => (
              <View key={city} style={[styles.cityChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="map-pin" size={11} color="#FF6B00" />
                <Text style={[styles.cityText, { color: colors.foreground }]}>{city}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {search.length > 0
            ? `Results for "${search}"`
            : selectedCategory === "For You"
            ? "All Events"
            : selectedCategory}
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {"  "}({filtered.length})
          </Text>
        </Text>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No events found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Try a different search or category
            </Text>
          </View>
        ) : (
          filtered.map((event) => (
            <EventCardCompact key={event.id} event={event} horizontal />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14 },
  categories: { marginBottom: 24 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  count: { fontSize: 14, fontWeight: "400" },
  cityRow: { gap: 10, paddingBottom: 4 },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityText: { fontSize: 13, fontWeight: "500" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
});
