import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface CheckinCelebrationProps {
  visible: boolean;
  eventTitle: string;
  eventVenue: string;
  pointsEarned: number;
  onDismiss: () => void;
}

export function CheckinCelebration({
  visible,
  eventTitle,
  eventVenue,
  pointsEarned,
  onDismiss,
}: CheckinCelebrationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const shareText = `I'm here at ${eventTitle}! 🎶 Come join the culture. #KultrHub`;

  const handleInstagramShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Share.share({ message: shareText, title: `I'm at ${eventTitle}` });
  };

  const handleXShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Share.share({ message: shareText, title: `I'm at ${eventTitle}` });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, { opacity }]}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onDismiss} accessibilityLabel="Close" accessibilityRole="button">
            <Feather name="x" size={20} color="#888" />
          </Pressable>

          {/* Check circle */}
          <Animated.View style={[styles.circleWrap, { transform: [{ scale }] }]}>
            <View style={styles.circle}>
              <Feather name="check" size={40} color="#FF6B00" />
            </View>
          </Animated.View>

          <Text style={styles.heading}>You're Checked In!</Text>
          <Text style={styles.sub}>Thanks for being part of the culture.</Text>
          {pointsEarned > 0 && (
            <View style={styles.pointsBadge}>
              <Feather name="star" size={13} color="#FFB400" />
              <Text style={styles.pointsText}>+{pointsEarned} KULTROINS earned</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Share Your Vibe</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.dividerSub}>Let your friends know you're here.</Text>

          {/* Share cards */}
          <View style={styles.shareRow}>
            {/* Instagram Stories */}
            <Pressable
              style={({ pressed }) => [styles.shareCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleInstagramShare}
              accessibilityLabel="Share to Instagram Stories"
              accessibilityRole="button"
            >
              <View style={styles.shareCardHeader}>
                <View style={styles.igIcon}>
                  <Text style={styles.igEmoji}>📸</Text>
                </View>
                <Text style={styles.shareCardPlatform}>Instagram{"\n"}Stories</Text>
              </View>
              <View style={styles.sharePreview}>
                <Text style={styles.sharePreviewLabel}>I'm Here{"\n"}At</Text>
                <Text style={styles.sharePreviewEvent} numberOfLines={2}>{eventTitle}</Text>
                <Text style={styles.sharePreviewVenue} numberOfLines={1}>{eventVenue}</Text>
              </View>
            </Pressable>

            {/* Share on X */}
            <Pressable
              style={({ pressed }) => [styles.shareCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleXShare}
              accessibilityLabel="Share on X"
              accessibilityRole="button"
            >
              <View style={styles.shareCardHeader}>
                <View style={styles.xIcon}>
                  <Text style={styles.xEmoji}>𝕏</Text>
                </View>
                <Text style={styles.shareCardPlatform}>Share on{"\n"}X</Text>
              </View>
              <View style={[styles.sharePreview, { backgroundColor: "#1a1a2e" }]}>
                <Text style={styles.sharePreviewLabel}>I'm Here{"\n"}At</Text>
                <Text style={styles.sharePreviewEvent} numberOfLines={2}>{eventTitle}</Text>
                <Text style={styles.sharePreviewVenue} numberOfLines={1}>{eventVenue}</Text>
              </View>
            </Pressable>
          </View>

          {/* Maybe Later */}
          <Pressable
            style={({ pressed }) => [styles.laterBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onDismiss}
            accessibilityLabel="Maybe Later"
            accessibilityRole="button"
          >
            <Text style={styles.laterText}>Maybe Later</Text>
          </Pressable>

          {Platform.OS !== "web" && <View style={styles.homeBar} />}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#2A2A2A",
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#252525",
    marginBottom: 8,
  },
  circleWrap: { marginBottom: 16 },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,107,0,0.08)",
  },
  heading: { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center" },
  sub: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 6 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,180,0,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
  },
  pointsText: { color: "#FFB400", fontSize: 13, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    marginBottom: 6,
    width: "100%",
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#FF6B00", opacity: 0.5 },
  dividerText: { color: "#FF6B00", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  dividerSub: { color: "#666", fontSize: 12, marginBottom: 16 },
  shareRow: { flexDirection: "row", gap: 12, width: "100%" },
  shareCard: {
    flex: 1,
    backgroundColor: "#252525",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  shareCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  igIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E1306C22",
    alignItems: "center",
    justifyContent: "center",
  },
  igEmoji: { fontSize: 16 },
  xIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ffffff11",
    alignItems: "center",
    justifyContent: "center",
  },
  xEmoji: { color: "#fff", fontSize: 16, fontWeight: "900" },
  shareCardPlatform: { color: "#aaa", fontSize: 11, fontWeight: "700", lineHeight: 15 },
  sharePreview: {
    backgroundColor: "#111",
    margin: 8,
    marginTop: 0,
    borderRadius: 10,
    padding: 10,
    minHeight: 90,
    justifyContent: "flex-end",
  },
  sharePreviewLabel: { color: "#ccc", fontSize: 9, fontWeight: "600", lineHeight: 13 },
  sharePreviewEvent: { color: "#FF6B00", fontSize: 12, fontWeight: "900", lineHeight: 15, marginTop: 2 },
  sharePreviewVenue: { color: "#888", fontSize: 8, marginTop: 4 },
  laterBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 18,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#2A2A2A",
  },
  laterText: { color: "#888", fontSize: 15, fontWeight: "600" },
  homeBar: { height: 16 },
});
