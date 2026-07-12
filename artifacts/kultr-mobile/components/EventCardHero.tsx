import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Event, EVENT_IMAGES, formatDate, formatTime, getDaysUntil } from "@/constants/data";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = 340;

interface Props {
  event: Event;
}

export function EventCardHero({ event }: Props) {
  const colors = useColors();
  const { isSaved, toggleSaved } = useApp();
  const saved = isSaved(event.id);

  const daysUntil = getDaysUntil(event.date);
  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;
  const isSoon = daysUntil <= 7 && daysUntil > 0;
  const isPast = daysUntil < 0;

  const urgencyLabel = isPast
    ? "Past Event"
    : isToday
    ? "Today"
    : isTomorrow
    ? "Tomorrow"
    : isSoon
    ? `${daysUntil} days away`
    : null;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaved(event.id);
  };

  const handlePress = () => {
    router.push(`/event/${event.id}`);
  };

  const image: ImageSourcePropType = EVENT_IMAGES[event.imageKey];

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <Image source={image} style={styles.image} resizeMode="cover" />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.96)"]}
        locations={[0.2, 0.55, 1]}
        style={styles.gradient}
      />

      {/* Top row */}
      <View style={styles.topRow}>
        {urgencyLabel && (
          <View style={[
            styles.urgencyBadge,
            {
              backgroundColor: isToday || isTomorrow
                ? "rgba(255,107,0,0.9)"
                : "rgba(0,0,0,0.6)",
            },
          ]}>
            {(isToday || isTomorrow) && (
              <View style={styles.urgencyDot} />
            )}
            <Text style={styles.urgencyText}>{urgencyLabel}</Text>
          </View>
        )}
        <Pressable
          onPress={handleSave}
          hitSlop={12}
          style={[styles.saveBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <Feather name="heart" size={16} color={saved ? "#FF6B00" : "#fff"} />
        </Pressable>
      </View>

      {/* Bottom content */}
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,107,0,0.25)", borderColor: "#FF6B00" }]}>
            <Text style={[styles.categoryText, { color: "#FF6B00" }]}>{event.category.toUpperCase()}</Text>
          </View>
          {event.capacity && (
            <View style={[styles.capacityBadge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <Feather name="users" size={10} color="#A0A0A0" />
              <Text style={styles.capacityText}>{event.capacity.toLocaleString()} cap</Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{event.venue} · {event.city}</Text>
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Feather name="calendar" size={11} color="#A0A0A0" />
            <Text style={styles.metaText}>{formatDate(event.date)}</Text>
            <Feather name="clock" size={11} color="#A0A0A0" style={{ marginLeft: 8 }} />
            <Text style={styles.metaText}>{formatTime(event.time)}</Text>
          </View>
          <View style={styles.priceChip}>
            <Text style={styles.priceText}>
              {event.currencySymbol} {event.price.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1C1C1C",
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80%",
  },
  topRow: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  urgencyText: {
    // White-on-orange measured ~2.86:1, failing WCAG AA. Near-black matches
    // the fix already applied to the primary/accent color tokens.
    color: "#111111",
    fontSize: 11,
    fontWeight: "700",
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    paddingBottom: 22,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  capacityText: {
    color: "#A0A0A0",
    fontSize: 10,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 30,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#C0C0C0",
    marginBottom: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#A0A0A0",
  },
  priceChip: {
    backgroundColor: "#FF6B00",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  priceText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
