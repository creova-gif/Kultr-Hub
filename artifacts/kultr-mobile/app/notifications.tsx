import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type NotifIcon =
  | "check-circle"
  | "bell"
  | "dollar-sign"
  | "map-pin"
  | "users"
  | "star";

interface Notification {
  id: string;
  type: string;
  icon: NotifIcon;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "booking",
    icon: "check-circle" as const,
    iconColor: "#00C853",
    title: "Booking Confirmed",
    body: "Your ticket for Nairobi Jazz Collective is ready.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    type: "reminder",
    icon: "bell" as const,
    iconColor: "#FF6B00",
    title: "Event Tomorrow!",
    body: "Don't forget — Afrobeats Night starts at 8pm.",
    time: "5h ago",
    read: false,
  },
  {
    id: "n3",
    type: "payment",
    icon: "dollar-sign" as const,
    iconColor: "#4F9DFF",
    title: "Payment Successful",
    body: "KSh 2,500 paid via M-Pesa for 1× GA ticket.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "n4",
    type: "discovery",
    icon: "map-pin" as const,
    iconColor: "#FF6B00",
    title: "New Event Near You",
    body: "Lagos Roots Festival just dropped in your area.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "n5",
    type: "social",
    icon: "users" as const,
    iconColor: "#7B61FF",
    title: "Your Tribe is Going",
    body: "3 people from your network saved Accra Carnival.",
    time: "3 days ago",
    read: true,
  },
  {
    id: "n6",
    type: "reward",
    icon: "star" as const,
    iconColor: "#FFD600",
    title: "Points Earned",
    body: "You earned +150 KULTROINS for checking in!",
    time: "5 days ago",
    read: true,
  },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notification[]>(NOTIFICATIONS);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const unreadCount = notifs.filter((n) => !n.read).length;
  const allRead = unreadCount === 0;

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const handlePress = (notif: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(notif.id);
  };

  const unreadNotifs = notifs.filter((n) => !n.read);
  const readNotifs = notifs.filter((n) => n.read);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: bottomPad + 40,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {!allRead ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                markAllRead();
              }}
              style={[styles.markAllBtn, { backgroundColor: colors.card }]}
              accessibilityLabel="Mark all notifications as read"
            >
              <Text style={[styles.markAllText, { color: "#FF6B00" }]}>
                Mark all read
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 90 }} />
          )}
        </View>

        {/* All caught up banner when all read but items still visible */}
        {allRead && readNotifs.length > 0 && (
          <View
            style={[
              styles.caughtUpBanner,
              {
                backgroundColor: "rgba(0,200,83,0.08)",
                borderColor: "#00C853",
              },
            ]}
          >
            <Feather name="check-circle" size={14} color="#00C853" />
            <Text style={[styles.caughtUpText, { color: "#00C853" }]}>
              You're all caught up!
            </Text>
          </View>
        )}

        {/* Empty state: no notifs at all */}
        {notifs.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color="#00C853" />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              You're all caught up!
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              No new notifications right now.
            </Text>
          </View>
        )}

        {/* Unread section */}
        {unreadNotifs.length > 0 && (
          <View style={styles.group}>
            <Text
              style={[styles.groupLabel, { color: colors.mutedForeground }]}
            >
              NEW
            </Text>
            <View style={styles.groupList}>
              {unreadNotifs.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  colors={colors}
                  onPress={handlePress}
                />
              ))}
            </View>
          </View>
        )}

        {/* Read section */}
        {readNotifs.length > 0 && (
          <View style={styles.group}>
            <Text
              style={[styles.groupLabel, { color: colors.mutedForeground }]}
            >
              EARLIER
            </Text>
            <View style={styles.groupList}>
              {readNotifs.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  colors={colors}
                  onPress={handlePress}
                />
              ))}
            </View>
          </View>
        )}

        {/* Settings hint */}
        <View
          style={[
            styles.settingsHint,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="settings" size={14} color={colors.mutedForeground} />
          <Text
            style={[styles.settingsText, { color: colors.mutedForeground }]}
          >
            Manage notification preferences in Settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function NotifItem({
  notif,
  colors,
  onPress,
}: {
  notif: Notification;
  colors: any;
  onPress: (n: Notification) => void;
}) {
  const iconBg = notif.iconColor + "22";

  return (
    <Pressable
      onPress={() => onPress(notif)}
      accessibilityLabel={`${notif.title}: ${notif.body}. ${notif.time}. ${notif.read ? "Read" : "Unread"}`}
      style={({ pressed }) => [
        styles.notifItem,
        {
          backgroundColor: colors.card,
          borderColor: notif.read ? colors.border : "#FF6B00" + "50",
          borderLeftWidth: notif.read ? StyleSheet.hairlineWidth : 3,
          borderLeftColor: notif.read ? colors.border : "#FF6B00",
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {/* Icon circle — 44pt minimum */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Feather name={notif.icon} size={20} color={notif.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text
            style={[
              styles.notifTitle,
              {
                color: colors.foreground,
                fontWeight: notif.read ? "600" : "800",
              },
            ]}
            numberOfLines={1}
          >
            {notif.title}
          </Text>
          {!notif.read && <View style={styles.unreadDot} />}
        </View>
        <Text
          style={[styles.notifBody, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {notif.body}
        </Text>
        <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
          {notif.time}
        </Text>
      </View>
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
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  badge: {
    backgroundColor: "#FF6B00",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  markAllBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "700" },
  caughtUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  caughtUpText: { fontSize: 13, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  group: { marginBottom: 8 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  groupList: { paddingHorizontal: 16, gap: 8 },
  notifItem: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  notifTitle: { fontSize: 14, flex: 1, marginRight: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
    flexShrink: 0,
  },
  notifBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11 },
  settingsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingsText: { fontSize: 12 },
});
