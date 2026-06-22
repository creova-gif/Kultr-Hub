import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { EVENT_IMAGES, formatDate, formatTime } from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";

export default function SavedEventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedEvents, toggleSaved } = useApp();
  const { events } = useEventCatalog();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const saved = events.filter((e) => savedEvents.includes(e.id));

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved Events</Text>
          <View style={[styles.backBtn, { backgroundColor: "transparent" }]} />
        </View>

        {saved.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="heart" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing saved yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap the heart on any event to save it for later
            </Text>
            <Pressable
              style={styles.browseBtn}
              onPress={() => router.replace("/(tabs)/discover")}
              accessibilityLabel="Discover Events"
              accessibilityRole="button"
            >
              <Text style={styles.browseBtnText}>Browse Events</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 8 }}>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {saved.length} saved event{saved.length !== 1 ? "s" : ""}
            </Text>
            {saved.map((event) => {
              const image = EVENT_IMAGES[event.imageKey];
              const isUpcoming = new Date(event.date) >= new Date();
              return (
                <Pressable
                  key={event.id}
                  onPress={() => router.push(`/event/${event.id}`)}
                  accessibilityLabel={`View ${event.title} in ${event.city}`}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.92 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <Image source={image} style={styles.cardImage} resizeMode="cover" />
                  <View style={styles.cardOverlay} />

                  {/* Status badge */}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: isUpcoming ? "rgba(0,200,83,0.2)" : "rgba(160,160,160,0.2)" },
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: isUpcoming ? "#00C853" : "#A0A0A0" }]} />
                    <Text style={[styles.statusText, { color: isUpcoming ? "#00C853" : "#A0A0A0" }]}>
                      {isUpcoming ? "Upcoming" : "Past"}
                    </Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,107,0,0.25)" }]}>
                      <Text style={[styles.categoryText, { color: "#FF6B00" }]}>
                        {event.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={11} color="#A0A0A0" />
                        <Text style={styles.metaText}>{event.venue}, {event.city}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Feather name="calendar" size={11} color="#A0A0A0" />
                        <Text style={styles.metaText}>{formatDate(event.date)} · {formatTime(event.time)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPrice}>
                        {event.currencySymbol} {event.price.toLocaleString()}
                      </Text>
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            toggleSaved(event.id);
                          }}
                          style={[styles.actionBtn, { backgroundColor: "rgba(255,107,0,0.15)", borderColor: "#FF6B00" }]}
                          accessibilityLabel={`Remove ${event.title} from saved events`}
                          accessibilityRole="button"
                        >
                          <Feather name="heart" size={14} color="#FF6B00" />
                          <Text style={[styles.actionBtnText, { color: "#FF6B00" }]}>Saved</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push(`/event/${event.id}`)}
                          style={[styles.actionBtn, { backgroundColor: "#FF6B00", borderColor: "#FF6B00" }]}
                          accessibilityLabel={`Get tickets for ${event.title}`}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.actionBtnText, { color: "#fff" }]}>Get Tickets</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
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
    marginBottom: 8,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  countText: { fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  browseBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 25,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 160 },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardContent: { padding: 14 },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  cardTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", lineHeight: 24, marginBottom: 10 },
  cardMeta: { gap: 4, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { color: "#A0A0A0", fontSize: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardPrice: { color: "#FF6B00", fontSize: 16, fontWeight: "800" },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
});
