import { Feather } from "@expo/vector-icons";
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
import { getCountryByCurrency } from "@/constants/currencies";
import type { PurchasedTicket } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { useListMyTickets, getListMyTicketsQueryKey, type TicketDetail } from "@workspace/api-client-react";

function adaptApiTicket(t: TicketDetail): PurchasedTicket {
  return {
    id: t.id,
    eventId: t.eventId,
    ticketTypeId: t.ticketTypeId,
    ticketTypeName: t.ticketTypeName,
    ticketNumber: t.ticketNumber,
    purchaseDate: t.purchasedAt.slice(0, 10),
    quantity: t.quantity,
    totalPaid: t.totalAmount,
    currency: t.currency,
    currencySymbol: getCountryByCurrency(t.currency)?.currencySymbol ?? t.currency,
  };
}

export default function TicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tickets: localTickets, authToken } = useApp();
  const { getEventById } = useEventCatalog();

  const { data: apiData } = useListMyTickets({
    query: { queryKey: getListMyTicketsQueryKey(), enabled: !!authToken },
  });

  const tickets = React.useMemo<PurchasedTicket[]>(() => {
    if (!apiData?.tickets?.length) return localTickets;
    const apiTickets = apiData.tickets.map(adaptApiTicket);
    const localOnly = localTickets.filter(
      (lt) => !apiTickets.some((at) => at.id === lt.id)
    );
    return [...apiTickets, ...localOnly];
  }, [apiData, localTickets]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          My <Text style={{ color: "#FF6B00" }}>Tickets</Text>
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="tag" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tickets yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Discover and book events to see your tickets here
          </Text>
          <Pressable
            style={styles.discoverBtn}
            onPress={() => router.push("/discover")}
          >
            <Text style={styles.discoverBtnText}>Browse Events</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.ticketList}>
          {tickets.map((ticket) => {
            const event = getEventById(ticket.eventId);
            if (!event) return null;
            const image = EVENT_IMAGES[event.imageKey];
            const isUpcoming = new Date(event.date) >= new Date();

            return (
              <Pressable
                key={ticket.id}
                onPress={() => router.push(`/ticket/${ticket.id}`)}
                style={({ pressed }) => [
                  styles.ticketCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                {/* Top section */}
                <View style={styles.ticketTop}>
                  <Image source={image} style={styles.ticketImage} resizeMode="cover" />
                  <View style={styles.ticketOverlay} />
                  <View style={styles.ticketTopContent}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isUpcoming
                            ? "rgba(0,200,83,0.2)"
                            : "rgba(160,160,160,0.2)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isUpcoming ? "#00C853" : "#A0A0A0" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isUpcoming ? "#00C853" : "#A0A0A0" },
                        ]}
                      >
                        {isUpcoming ? "Upcoming" : "Past"}
                      </Text>
                    </View>
                    <View style={[styles.ticketNumBadge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                      <Text style={styles.ticketNum}>#{ticket.ticketNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketEventInfo}>
                    <Text style={styles.ticketCat}>{event.category.toUpperCase()}</Text>
                    <Text style={styles.ticketTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                  </View>
                </View>

                {/* Dashed divider */}
                <View style={styles.dividerRow}>
                  <View style={[styles.cutoutLeft, { backgroundColor: colors.background }]} />
                  <View style={styles.dashedLine}>
                    {Array.from({ length: 18 }).map((_, i) => (
                      <View key={i} style={[styles.dash, { backgroundColor: colors.border }]} />
                    ))}
                  </View>
                  <View style={[styles.cutoutRight, { backgroundColor: colors.background }]} />
                </View>

                {/* Bottom info */}
                <View style={styles.ticketBottom}>
                  <View style={styles.ticketMeta}>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={12} color="#FF6B00" />
                      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>DATE</Text>
                      <Text style={[styles.metaValue, { color: colors.foreground }]}>
                        {formatDate(event.date)}
                      </Text>
                    </View>
                    <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaItem}>
                      <Feather name="clock" size={12} color="#FF6B00" />
                      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>TIME</Text>
                      <Text style={[styles.metaValue, { color: colors.foreground }]}>
                        {formatTime(event.time)}
                      </Text>
                    </View>
                    <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.metaItem}>
                      <Feather name="tag" size={12} color="#FF6B00" />
                      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>TYPE</Text>
                      <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>
                        {ticket.ticketTypeName}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.viewTicketRow}>
                    <Text style={[styles.viewTicketText, { color: colors.mutedForeground }]}>
                      Tap to view ticket
                    </Text>
                    <Feather name="chevron-right" size={14} color="#FF6B00" />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },
  header: { paddingHorizontal: 16, marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  headerSub: { fontSize: 14, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  discoverBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 25,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  discoverBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ticketList: { paddingHorizontal: 16, gap: 16 },
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  ticketTop: { height: 180, position: "relative" },
  ticketImage: { width: "100%", height: "100%", position: "absolute" },
  ticketOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  ticketTopContent: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  ticketNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketNum: { color: "#E0E0E0", fontSize: 11, fontWeight: "600" },
  ticketEventInfo: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  ticketCat: { color: "#FF6B00", fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  ticketTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 26 },
  dividerRow: { flexDirection: "row", alignItems: "center", height: 24 },
  cutoutLeft: {
    width: 18,
    height: 36,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    marginLeft: -1,
  },
  cutoutRight: {
    width: 18,
    height: 36,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    marginRight: -1,
  },
  dashedLine: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dash: { width: 5, height: 1.5, borderRadius: 1 },
  ticketBottom: { padding: 14 },
  ticketMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metaItem: { flex: 1, alignItems: "center", gap: 2 },
  metaDivider: { width: 1, marginVertical: 4 },
  metaLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  metaValue: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  viewTicketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  viewTicketText: { fontSize: 12 },
});
