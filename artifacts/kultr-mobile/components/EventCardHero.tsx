import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Event, EVENT_IMAGES, formatDate, formatTime } from "@/constants/data";

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
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <Image source={image} style={styles.image} resizeMode="cover" />
      <View style={styles.gradient} />

      <Pressable
        onPress={handleSave}
        hitSlop={12}
        style={[styles.saveBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      >
        <Feather name={saved ? "heart" : "heart"} size={16} color={saved ? "#FF6B00" : "#fff"} />
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,107,0,0.25)", borderColor: "#FF6B00" }]}>
          <Text style={[styles.categoryText, { color: "#FF6B00" }]}>{event.category.toUpperCase()}</Text>
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
    borderRadius: 16,
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
    height: "70%",
    backgroundColor: "transparent",
    backgroundImage: Platform.OS === "web" ? "linear-gradient(transparent, rgba(0,0,0,0.95))" : undefined,
  },
  saveBtn: {
    position: "absolute",
    top: 14,
    right: 14,
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
    padding: 16,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
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
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
