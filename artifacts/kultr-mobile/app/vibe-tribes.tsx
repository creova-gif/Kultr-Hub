import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Tribe {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  members: number;
  color: string;
  category: string;
}

const TRIBES: Tribe[] = [
  { id: "afrobeats", name: "Afrobeats Nation", emoji: "🎶", tagline: "Where the rhythm never stops.", members: 12480, color: "#FF6B00", category: "Music" },
  { id: "amapiano", name: "Amapiano Movement", emoji: "🎹", tagline: "Log drums & late nights.", members: 8932, color: "#7B61FF", category: "Music" },
  { id: "foodies", name: "Nyama & Spice", emoji: "🍖", tagline: "Chasing flavour across the continent.", members: 6201, color: "#00C853", category: "Food" },
  { id: "art", name: "Canvas Collective", emoji: "🎨", tagline: "Galleries, graffiti & everything between.", members: 4517, color: "#E1306C", category: "Art" },
  { id: "fashion", name: "Threads of Africa", emoji: "👗", tagline: "Heritage meets the runway.", members: 5874, color: "#4F9DFF", category: "Fashion" },
  { id: "film", name: "Screen Culture", emoji: "🎬", tagline: "Nollywood to the new wave.", members: 3340, color: "#FFB400", category: "Film" },
  { id: "tech", name: "Silicon Savannah", emoji: "💡", tagline: "Builders shaping the future.", members: 7129, color: "#00BFA5", category: "Tech" },
  { id: "dance", name: "Step & Sway", emoji: "💃", tagline: "If it moves you, it's home.", members: 4988, color: "#FF4081", category: "Dance" },
];

const AVATAR_COLORS = ["#FF6B00", "#7B61FF", "#00C853", "#E1306C", "#4F9DFF", "#FFB400"];

function formatMembers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function VibeTribesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken } = useApp();
  const [joined, setJoined] = useState<string[]>(["afrobeats"]);
  const [query, setQuery] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const toggleJoin = (id: string) => {
    if (!authToken) {
      router.push("/login");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJoined((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const { myTribes, discoverTribes } = useMemo(() => {
    const filtered = query.trim()
      ? TRIBES.filter(
          (t) =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.category.toLowerCase().includes(query.toLowerCase())
        )
      : TRIBES;
    return {
      myTribes: filtered.filter((t) => joined.includes(t.id)),
      discoverTribes: filtered.filter((t) => !joined.includes(t.id)),
    };
  }, [joined, query]);

  const renderTribe = (tribe: Tribe) => {
    const isJoined = joined.includes(tribe.id);
    const seed = tribe.id.charCodeAt(0) % 6;
    const avatarColors = [
      AVATAR_COLORS[seed],
      AVATAR_COLORS[(seed + 1) % 6],
      AVATAR_COLORS[(seed + 2) % 6],
    ];
    return (
      <View
        key={tribe.id}
        style={[styles.tribeCard, { backgroundColor: colors.card, borderColor: isJoined ? tribe.color + "55" : colors.border }]}
      >
        <View style={[styles.tribeEmojiWrap, { backgroundColor: tribe.color + "1F" }]}>
          <Text style={styles.tribeEmoji}>{tribe.emoji}</Text>
        </View>
        <View style={styles.tribeInfo}>
          <Text style={[styles.tribeName, { color: colors.foreground }]}>{tribe.name}</Text>
          <Text style={[styles.tribeTagline, { color: colors.mutedForeground }]} numberOfLines={1}>
            {tribe.tagline}
          </Text>
          <View style={styles.tribeMetaRow}>
            <Feather name="users" size={11} color={tribe.color} />
            <Text style={[styles.tribeMembers, { color: tribe.color }]}>
              {formatMembers(tribe.members)} members
            </Text>
            <Text style={[styles.tribeCategory, { color: colors.mutedForeground }]}>
              · {tribe.category}
            </Text>
          </View>
          {/* Member avatar stack */}
          <View style={styles.avatarStack}>
            {avatarColors.map((color, idx) => (
              <View
                key={idx}
                style={[
                  styles.avatarCircle,
                  { backgroundColor: color, marginLeft: idx === 0 ? 0 : -6 },
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          onPress={() => toggleJoin(tribe.id)}
          style={[
            styles.joinBtn,
            isJoined
              ? { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: tribe.color, borderColor: tribe.color, borderWidth: 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isJoined ? `Leave ${tribe.name}` : `Join ${tribe.name}`}
        >
          {isJoined ? (
            <>
              <Feather name="check" size={13} color={colors.foreground} />
              <Text style={[styles.joinBtnText, { color: colors.foreground }]}>Joined</Text>
            </>
          ) : (
            <Text style={[styles.joinBtnText, { color: "#fff" }]}>Join</Text>
          )}
        </Pressable>
      </View>
    );
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Vibe Tribes</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Find your people. Move with the culture.
        </Text>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#FF6B00" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tribes..."
            placeholderTextColor="#666"
            style={styles.searchInput}
          />
        </View>

        {/* My Tribes */}
        {myTribes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Tribes</Text>
            {myTribes.map(renderTribe)}
          </View>
        )}

        {/* Discover */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {myTribes.length > 0 ? "Discover More" : "Discover Tribes"}
          </Text>
          {discoverTribes.length === 0 ? (
            <Text style={[styles.allJoined, { color: colors.mutedForeground }]}>
              You've joined every tribe. Legend. 🔥
            </Text>
          ) : (
            discoverTribes.map(renderTribe)
          )}
        </View>

        {/* Create Your Tribe CTA */}
        <Pressable
          style={styles.createTribeBtn}
          onPress={() =>
            Alert.alert("Create a Tribe", "Tribe creation is coming soon. Stay tuned!")
          }
        >
          <Feather name="plus-circle" size={18} color="#FF6B00" />
          <Text style={styles.createTribeBtnText}>Create Your Tribe</Text>
        </Pressable>
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
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
  subtitle: { fontSize: 13, paddingHorizontal: 16, marginTop: 4, marginBottom: 20, textAlign: "center" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
  },

  section: { paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  allJoined: { fontSize: 14, textAlign: "center", paddingVertical: 16 },

  tribeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  tribeEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tribeEmoji: { fontSize: 24 },
  tribeInfo: { flex: 1, gap: 3 },
  tribeName: { fontSize: 15, fontWeight: "800" },
  tribeTagline: { fontSize: 12 },
  tribeMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tribeMembers: { fontSize: 11, fontWeight: "700" },
  tribeCategory: { fontSize: 11 },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0E0E0E",
  },

  createTribeBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderStyle: "dashed",
    borderColor: "#FF6B00",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createTribeBtnText: {
    color: "#FF6B00",
    fontWeight: "800",
    fontSize: 15,
  },

  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
  },
  joinBtnText: { fontSize: 13, fontWeight: "700" },
});
