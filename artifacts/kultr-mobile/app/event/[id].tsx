import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
import { EVENT_IMAGES, formatDate, formatTime, getEventById } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSaved } = useApp();
  const [selectedTicketType, setSelectedTicketType] = useState(0);

  const event = getEventById(id ?? "");

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
          <View style={styles.heroGradient} />

          {/* Back & Save */}
          <View style={[styles.heroActions, { top: (Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top) + 8 }]}>
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
                <Feather name="heart" size={20} color={saved ? "#FF6B00" : "#fff"} />
              </Pressable>
              <Pressable style={[styles.heroBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                <Feather name="share-2" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Category badge on image */}
          <View style={styles.heroBadge}>
            <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,107,0,0.25)", borderColor: "#FF6B00" }]}>
              <Text style={[styles.categoryText, { color: "#FF6B00" }]}>
                {event.category.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title & venue */}
          <Text style={[styles.title, { color: colors.foreground }]}>{event.title}</Text>
          {event.subtitle && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{event.subtitle}</Text>
          )}

          {/* Info Row */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoItem icon="calendar" label="Date" value={formatDate(event.date)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem icon="clock" label="Time" value={formatTime(event.time)} />
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <InfoItem icon="map-pin" label="Venue" value={`${event.venue}, ${event.city}`} />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this Event</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {event.description}
            </Text>
          </View>

          {/* Ticket Types */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tickets</Text>
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
                        backgroundColor: isSelected ? "rgba(255,107,0,0.1)" : colors.card,
                        borderColor: isSelected ? "#FF6B00" : colors.border,
                        opacity: soldOut ? 0.5 : 1,
                      },
                    ]}
                  >
                    <View style={styles.ticketTypeLeft}>
                      <Text style={[styles.ticketTypeName, { color: colors.foreground }]}>
                        {type.name}
                      </Text>
                      {type.description && (
                        <Text style={[styles.ticketTypeDesc, { color: colors.mutedForeground }]}>
                          {type.description}
                        </Text>
                      )}
                      {soldOut && (
                        <Text style={[styles.soldOut, { color: "#D32F2F" }]}>Sold out</Text>
                      )}
                    </View>
                    <View style={styles.ticketTypeRight}>
                      <Text style={[styles.ticketTypePrice, { color: "#FF6B00" }]}>
                        {event.currencySymbol} {type.price.toLocaleString()}
                      </Text>
                      {!soldOut && (
                        <Text style={[styles.ticketAvail, { color: colors.mutedForeground }]}>
                          {type.available} left
                        </Text>
                      )}
                    </View>
                    {isSelected && !soldOut && (
                      <View style={[styles.selectedDot, { backgroundColor: "#FF6B00" }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
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
          <Text style={[styles.ctaLabel, { color: colors.mutedForeground }]}>From</Text>
          <Text style={[styles.ctaPrice, { color: "#FF6B00" }]}>
            {event.currencySymbol} {event.ticketTypes[selectedTicketType]?.price.toLocaleString() ?? event.price.toLocaleString()}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/checkout/${event.id}?ticketTypeIndex=${selectedTicketType}`);
          }}
        >
          <Text style={styles.ctaBtnText}>Get Tickets</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoItem}>
      <Feather name={icon as any} size={14} color="#FF6B00" />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 18, fontWeight: "600" },
  backBtn: { backgroundColor: "#FF6B00", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: "#fff", fontWeight: "700" },
  heroWrapper: { height: 320, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.5)",
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
    backdropFilter: "blur(10px)",
  },
  heroBadge: { position: "absolute", bottom: 16, left: 16 },
  categoryBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  content: { padding: 16, gap: 0 },
  title: { fontSize: 28, fontWeight: "900", lineHeight: 34, marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 15, marginBottom: 20, lineHeight: 20 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    marginBottom: 24,
  },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 1, marginVertical: 4 },
  infoLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  infoValue: { fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 22 },
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
