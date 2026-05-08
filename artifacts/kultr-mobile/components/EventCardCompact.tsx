import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";

import { Event, EVENT_IMAGES, formatDate } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  event: Event;
  horizontal?: boolean;
}

export function EventCardCompact({ event, horizontal }: Props) {
  const colors = useColors();
  const { isSaved } = useApp();
  const saved = isSaved(event.id);
  const image: ImageSourcePropType = EVENT_IMAGES[event.imageKey];

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [
        styles.card,
        horizontal && styles.cardHorizontal,
        {
          backgroundColor: colors.card,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Image source={image} style={horizontal ? styles.imageHorizontal : styles.image} resizeMode="cover" />
      <View style={styles.overlay} />
      {saved && (
        <View style={styles.savedDot} />
      )}
      <View style={[styles.content, horizontal && styles.contentHorizontal]}>
        <View style={[styles.badge, { backgroundColor: "rgba(255,107,0,0.2)" }]}>
          <Text style={[styles.badgeText, { color: "#FF6B00" }]}>{event.category}</Text>
        </View>
        <Text style={styles.title} numberOfLines={horizontal ? 2 : 1}>{event.title}</Text>
        <Text style={styles.venue} numberOfLines={1}>{event.city}</Text>
        <View style={styles.row}>
          <Feather name="calendar" size={10} color="#A0A0A0" />
          <Text style={styles.date}>{formatDate(event.date)}</Text>
        </View>
        <Text style={styles.price}>
          {event.currencySymbol} {event.price.toLocaleString()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  cardHorizontal: {
    width: "100%",
    flexDirection: "row",
    height: 110,
    marginRight: 0,
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 120,
  },
  imageHorizontal: {
    width: 110,
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  savedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
  },
  content: {
    padding: 10,
    gap: 3,
  },
  contentHorizontal: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E0E0E0",
    lineHeight: 17,
  },
  venue: {
    fontSize: 11,
    color: "#A0A0A0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  date: {
    fontSize: 10,
    color: "#A0A0A0",
  },
  price: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B00",
    marginTop: 2,
  },
});
