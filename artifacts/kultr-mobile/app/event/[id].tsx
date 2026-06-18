import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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

import { EventCardCompact } from "@/components/EventCardCompact";
import { useApp } from "@/context/AppContext";
import {
  EVENT_IMAGES,
  formatDate,
  formatTime,
} from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { useEventDetail } from "@/hooks/useEventDetail";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSaved } = useApp();
  const [selectedTicketType, setSelectedTicketType] = useState(0);
  const { event } = useEventDetail(id);
  const { events } = useEventCatalog();

  const relatedEvents = useMemo(
    () =>
      event
        ? events
            .filter((e) => e.id !== event.id && (e.category === event.category || e.city === event.city))
            .slice(0, 4)
        : [],
    [event, events],
  );

  if (!event) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Event not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isSaved(event.id);
  const image = EVENT_IMAGES[event.imageKey];
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {/* Hero Image */}
        <View style={styles.heroWrapper}>
          <Image source={image} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            locations={[0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Back & Save */}
          <View
            style={[
              styles.heroActions,
              {
                top:
                  (Platform.OS === "web"
                    ? Math.max(insets.top, 67)
                    : insets.top) + 8,
              },
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <View style={styles.heroRightBtns}>
              <Pressable
                style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleSaved(event.id);
                }}
              >
                <Feather
                  name="heart"
                  size={20}
                  color={saved ? "#FF6B00" : "#fff"}
                />
              </Pressable>
              <Pressable
                style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const { Share } = require("react-native");
                  Share.share({
                    title: event.title,
                    message: `Check out "${event.title}" on Kultr — ${event.venue}, ${event.city} on ${event.date}. Get your tickets now!`,
                  });
                }}
              >
                <Feather name="share-2" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Hero bottom info */}
          <View style={styles.heroBottom}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: "rgba(255,107,0,0.25)",
                  borderColor: "#FF6B00",
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: "#FF6B00" }]}>
                {event.category.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {event.subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {event.subtitle}
            </Text>
          )}

          {/* Info Row */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <InfoItem icon="calendar" label="Date" value={formatDate(event.date)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem icon="clock" label="Time" value={formatTime(event.time)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem
              icon="map-pin"
              label="Venue"
              value={`${event.venue}, ${event.city}`}
            />
          </View>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {event.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              About this Event
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {event.description}
            </Text>
          </View>

          {/* Lineup */}
          {event.lineup && event.lineup.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Lineup
              </Text>
              <View style={styles.lineupList}>
                {event.lineup.map((artist, i) => (
                  <View
                    key={i}
                    style={[
                      styles.lineupItem,
                      {
                        backgroundColor: colors.card,
                        borderColor:
                          i === 0 ? "#FF6B00" + "50" : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.lineupAvatar,
                        {
                          backgroundColor:
                            i === 0
                              ? "rgba(255,107,0,0.2)"
                              : colors.muted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lineupAvatarText,
                          { color: i === 0 ? "#FF6B00" : colors.foreground },
                        ]}
                      >
                        {artist.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.lineupInfo}>
                      <Text
                        style={[styles.lineupName, { color: colors.foreground }]}
                      >
                        {artist.name}
                      </Text>
                      <View style={styles.lineupMeta}>
                        <View
                          style={[
                            styles.lineupRoleBadge,
                            {
                              backgroundColor:
                                i === 0
                                  ? "rgba(255,107,0,0.15)"
                                  : colors.muted,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lineupRole,
                              { color: i === 0 ? "#FF6B00" : colors.mutedForeground },
                            ]}
                          >
                            {artist.role}
                          </Text>
                        </View>
                        {artist.origin && (
                          <View style={styles.lineupOriginRow}>
                            <Feather name="map-pin" size={10} color="#A0A0A0" />
                            <Text
                              style={[
                                styles.lineupOrigin,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {artist.origin}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {artist.time && (
                      <View
                        style={[
                          styles.lineupTime,
                          { backgroundColor: colors.muted },
                        ]}
                      >
                        <Feather name="clock" size={10} color="#FF6B00" />
                        <Text style={[styles.lineupTimeText, { color: colors.foreground }]}>
                          {artist.time}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ticket Types */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Tickets
            </Text>
            <View style={styles.ticketTypes}>
              {event.ticketTypes.map((type, i) => {
                const isSelected = selectedTicketType === i;
                const soldOut = type.available === 0;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      if (!soldOut) {
                        Haptics.selectionAsync();
                        setSelectedTicketType(i);
                      }
                    }}
                    style={[
                      styles.ticketTypeCard,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,107,0,0.1)"
                          : colors.card,
                        borderColor: isSelected ? "#FF6B00" : colors.border,
                        opacity: soldOut ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.ticketTypeLeft}>
                      <Text
                        style={[
                          styles.ticketTypeName,
                          { color: colors.foreground },
                        ]}
                      >
                        {type.name}
                      </Text>
                      {type.description && (
                        <Text
                          style={[
                            styles.ticketTypeDesc,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {type.description}
                        </Text>
                      )}
                      {soldOut && (
                        <Text style={[styles.soldOut, { color: "#D32F2F" }]}>
                          Sold out
                        </Text>
                      )}
                    </View>
                    <View style={styles.ticketTypeRight}>
                      <Text
                        style={[styles.ticketTypePrice, { color: "#FF6B00" }]}
                      >
                        {event.currencySymbol} {type.price.toLocaleString()}
                      </Text>
                      {!soldOut && (
                        <Text
                          style={[
                            styles.ticketAvail,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {type.available} left
                        </Text>
                      )}
                    </View>
                    {isSelected && !soldOut && (
                      <View
                        style={[
                          styles.selectedDot,
                          { backgroundColor: "#FF6B00" },
                        ]}
                      >
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                You Might Also Like
              </Text>
              <FlatList
                horizontal
                data={relatedEvents}
                keyExtractor={(e) => e.id}
                renderItem={({ item }) => <EventCardCompact event={item} />}
                showsHorizontalScrollIndicator={false}
                scrollEnabled
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 12,
          },
        ]}
      >
        <View style={styles.ctaLeft}>
          <Text style={[styles.ctaLabel, { color: colors.mutedForeground }]}>
            From
          </Text>
          <Text style={[styles.ctaPrice, { color: "#FF6B00" }]}>
            {event.currencySymbol}{" "}
            {event.ticketTypes[selectedTicketType]?.price.toLocaleString() ??
              event.price.toLocaleString()}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              `/checkout/${event.id}?ticketTypeIndex=${selectedTicketType}`
            );
          }}
        >
          <Text style={styles.ctaBtnText}>Get Tickets</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.infoItem}>
      <Feather name={icon as any} size={14} color="#FF6B00" />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: { fontSize: 18, fontWeight: "600" },
  backBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { color: "#fff", fontWeight: "700" },
  heroWrapper: { height: 340, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },
  heroActions: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroRightBtns: { flexDirection: "row", gap: 8 },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  content: { padding: 16 },
  subtitle: { fontSize: 15, marginBottom: 16, lineHeight: 20 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    marginBottom: 16,
  },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 1, marginVertical: 4 },
  infoLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: "500" },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  description: { fontSize: 14, lineHeight: 22 },
  lineupList: { gap: 10 },
  lineupItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lineupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lineupAvatarText: { fontSize: 18, fontWeight: "800" },
  lineupInfo: { flex: 1 },
  lineupName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  lineupMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineupRoleBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lineupRole: { fontSize: 11, fontWeight: "600" },
  lineupOriginRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  lineupOrigin: { fontSize: 11 },
  lineupTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  lineupTimeText: { fontSize: 12, fontWeight: "700" },
  ticketTypes: { gap: 10 },
  ticketTypeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  ticketTypeLeft: { flex: 1 },
  ticketTypeName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  ticketTypeDesc: { fontSize: 12 },
  soldOut: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  ticketTypeRight: { alignItems: "flex-end" },
  ticketTypePrice: { fontSize: 16, fontWeight: "800" },
  ticketAvail: { fontSize: 11, marginTop: 2 },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  ctaLeft: { gap: 2 },
  ctaLabel: { fontSize: 12 },
  ctaPrice: { fontSize: 22, fontWeight: "900" },
  ctaBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  ctaBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
