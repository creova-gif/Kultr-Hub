import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert } from "@/lib/alert";
import { QRDisplay } from "@/components/QRDisplay";
import { useApp } from "@/context/AppContext";

import { formatDate, formatTime } from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { useCheckIn } from "@/hooks/useQuests";

const LOGO_WORDMARK = require("@/assets/images/logo-wordmark.png");

export default function TicketViewScreen() {
  const { id, newPurchase, eventId, ticketTypeName, ticketNumber } = useLocalSearchParams<{
    id: string;
    newPurchase?: string;
    eventId?: string;
    ticketTypeName?: string;
    ticketNumber?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tickets, authToken } = useApp();
  const { getEventById } = useEventCatalog();
  const checkIn = useCheckIn();

  const ticket = tickets.find((t) => t.id === id);
  const resolvedEventId = ticket?.eventId ?? eventId ?? "";
  const event = getEventById(resolvedEventId);
  const resolvedTicketNumber = ticket?.ticketNumber ?? ticketNumber ?? "KTR-00000";
  const resolvedTicketTypeName = ticket?.ticketTypeName ?? ticketTypeName ?? "General Admission";

  useEffect(() => {
    if (newPurchase === "true") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [newPurchase]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleCheckIn = () => {
    if (!resolvedEventId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkIn.mutate(resolvedEventId, {
      onSuccess: (res) => {
        if (res.alreadyCheckedIn) {
          Alert.alert("Already checked in", "You've already checked in to this event.");
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const lines: string[] = [];
        if (res.pointsEarned > 0) lines.push(`+${res.pointsEarned} KULTROINS`);
        if (res.questsCompleted.length) lines.push(`Completed: ${res.questsCompleted.map((q: { name: string }) => q.name).join(", ")}`);
        if (res.legendAwarded) lines.push("🏆 Kultr Legend unlocked!");
        Alert.alert("Checked in!", lines.join("\n") || "Welcome — enjoy the event.");
      },
      onError: (e) => Alert.alert("Check-in failed", e instanceof Error ? e.message : "Please try again."),
    });
  };

  if (!event) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)}
          style={{ padding: 20 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, padding: 24, fontSize: 16 }}>Ticket not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (newPurchase === "true") {
                router.replace("/(tabs)/tickets");
              } else {
                router.back();
              }
            }}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {newPurchase === "true" ? "Booking Confirmed!" : "Your Ticket"}
          </Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.muted }]}>
            <Feather name="share-2" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Success Banner (new purchase only) */}
        {newPurchase === "true" && (
          <View style={[styles.successBanner, { backgroundColor: "rgba(0,200,83,0.12)", borderColor: "#00C853" }]}>
            <Feather name="check-circle" size={18} color="#00C853" />
            <Text style={[styles.successText, { color: "#00C853" }]}>
              Payment successful! Your ticket is ready.
            </Text>
          </View>
        )}

        {/* Ticket Card */}
        <View style={[styles.ticketCard, { backgroundColor: colors.card }]}>
          {/* Ticket header — branded */}
          <View style={[styles.ticketHeader, { backgroundColor: "#111111" }]}>
            {/* African pattern border */}
            <View style={styles.patternRow}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={[styles.patternCell, { backgroundColor: i % 2 === 0 ? "#FF6B00" : "#1C1C1C" }]} />
              ))}
            </View>

            <View style={styles.ticketHeaderContent}>
              <Image source={LOGO_WORDMARK} style={styles.brandLogoImg} resizeMode="contain" />
              <View style={[styles.ticketTypePill, { backgroundColor: "rgba(255,107,0,0.2)", borderColor: "#FF6B00" }]}>
                <Text style={[styles.ticketTypeLabel, { color: "#FF6B00" }]}>
                  {resolvedTicketTypeName.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.ticketNumRow}>
              <Text style={[styles.ticketNum, { color: "#E0E0E0" }]}>
                #{resolvedTicketNumber}
              </Text>
            </View>

            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.eventSubtitle}>{event.subtitle ?? event.venue}</Text>

            {/* Bottom pattern */}
            <View style={styles.patternRow}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={[styles.patternCell, { backgroundColor: i % 2 !== 0 ? "#FF6B00" : "#1C1C1C" }]} />
              ))}
            </View>
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <QRDisplay />
            <Text style={[styles.qrNote, { color: colors.mutedForeground }]}>
              Present this QR code at the venue entrance
            </Text>
            {!!authToken && (
              <Pressable
                onPress={handleCheckIn}
                disabled={checkIn.isPending}
                style={[styles.checkInBtn, { borderColor: "#FF6B00", opacity: checkIn.isPending ? 0.6 : 1 }]}
                accessibilityLabel="Check in and earn rewards"
                accessibilityRole="button"
              >
                <Feather name="check-circle" size={15} color="#FF6B00" />
                <Text style={styles.checkInBtnText}>Check in & earn rewards</Text>
              </Pressable>
            )}
          </View>

          {/* Perforated divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.cutoutLeft, { backgroundColor: colors.background }]} />
            <View style={styles.dashedLine}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={[styles.dash, { backgroundColor: colors.border }]} />
              ))}
            </View>
            <View style={[styles.cutoutRight, { backgroundColor: colors.background }]} />
          </View>

          {/* Event Details */}
          <View style={styles.detailsSection}>
            <DetailRow icon="calendar" label="DATE" value={formatDate(event.date)} />
            <DetailRow icon="clock" label="TIME" value={formatTime(event.time)} />
            <DetailRow icon="map-pin" label="VENUE" value={`${event.venue}, ${event.city}`} />
            <DetailRow icon="tag" label="TICKET TYPE" value={resolvedTicketTypeName} />
          </View>

          {/* Authentic Badge */}
          <View style={[styles.authBadge, { backgroundColor: colors.muted, borderTopColor: colors.border }]}>
            <Feather name="shield" size={14} color="#00C853" />
            <Text style={[styles.authText, { color: colors.mutedForeground }]}>
              AUTHENTIC TICKET · Do not share this ticket
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <ActionBtn
            icon="download"
            label="Save to Phone"
            colors={colors}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Save to Phone",
                "Ticket saved to your device. Present this QR code at the venue entrance.",
                [{ text: "Got it" }]
              );
            }}
          />
          <ActionBtn
            icon="share-2"
            label="Share"
            colors={colors}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Share.share({
                message: `My ticket to ${event.title} at ${event.venue}, ${event.city} on ${formatDate(event.date)}. Ticket #${resolvedTicketNumber} — See you there! 🎉`,
                title: `Kultr Ticket — ${event.title}`,
              });
            }}
          />
          <ActionBtn
            icon="map-pin"
            label="Get Directions"
            colors={colors}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const query = encodeURIComponent(`${event.venue}, ${event.city}`);
              const appleUrl = `maps:?q=${query}`;
              const googleUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
              Linking.canOpenURL(appleUrl).then((can) => {
                Linking.openURL(can ? appleUrl : googleUrl);
              });
            }}
          />
        </View>

        {newPurchase === "true" && (
          <Pressable
            style={styles.homeBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.homeBtnText}>Discover More Events</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Feather name={icon as any} size={14} color="#FF6B00" />
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionBtn({ icon, label, colors, onPress }: { icon: string; label: string; colors: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon as any} size={20} color={colors.foreground} />
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  successText: { fontSize: 13, fontWeight: "600", flex: 1 },
  ticketCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  ticketHeader: { padding: 20, paddingTop: 0 },
  patternRow: { flexDirection: "row", height: 8, marginBottom: 16 },
  patternCell: { flex: 1 },
  ticketHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandLogoImg: { width: 90, height: 30 },
  ticketTypePill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketTypeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  ticketNumRow: { marginBottom: 12 },
  ticketNum: { fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  eventTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", lineHeight: 30, marginBottom: 4 },
  eventSubtitle: { color: "#FF6B00", fontSize: 13, marginBottom: 16 },
  qrSection: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  qrNote: { fontSize: 11, marginTop: 12, textAlign: "center" },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  checkInBtnText: { color: "#FF6B00", fontSize: 13, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", height: 24 },
  cutoutLeft: { width: 18, height: 36, borderTopRightRadius: 18, borderBottomRightRadius: 18, marginLeft: -1 },
  cutoutRight: { width: 18, height: 36, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, marginRight: -1 },
  dashedLine: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dash: { width: 6, height: 1.5, borderRadius: 1 },
  detailsSection: { padding: 20, gap: 14 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 120 },
  detailLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  detailValue: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  authBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  authText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: "600" },
  homeBtn: {
    marginHorizontal: 16,
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  homeBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
