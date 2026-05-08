import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { EVENT_IMAGES, formatDate, formatTime, getEventById } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

const PAYMENT_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: "smartphone", sub: "Pay via mobile money" },
  { id: "mtn", label: "MTN Mobile Money", icon: "smartphone", sub: "Pay via MTN MoMo" },
  { id: "card", label: "Card", icon: "credit-card", sub: "Visa / Mastercard" },
] as const;

export default function CheckoutScreen() {
  const { eventId, ticketTypeIndex } = useLocalSearchParams<{
    eventId: string;
    ticketTypeIndex: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTicket } = useApp();

  const event = getEventById(eventId ?? "");
  const typeIdx = Number(ticketTypeIndex ?? "0");
  const ticketType = event?.ticketTypes[typeIdx] ?? event?.ticketTypes[0];

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("mpesa");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "payment" | "success">("details");

  if (!event || !ticketType) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Event not found</Text>
      </View>
    );
  }

  const image = EVENT_IMAGES[event.imageKey];
  const total = ticketType.price * quantity;
  const fee = Math.round(total * 0.05);
  const grandTotal = total + fee;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handleConfirm = async () => {
    if (paymentMethod === "mpesa" && phone.trim().length < 9) {
      Alert.alert("Invalid Number", "Please enter a valid M-Pesa number.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);

    const newTicket = {
      id: `ticket-${Date.now()}`,
      eventId: event.id,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      ticketNumber: `KTR-${Math.floor(10000 + Math.random() * 90000)}`,
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity,
      totalPaid: grandTotal,
      currency: event.currency,
      currencySymbol: event.currencySymbol,
    };
    addTicket(newTicket);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/ticket/${newTicket.id}?newPurchase=true&eventId=${event.id}&ticketTypeName=${encodeURIComponent(ticketType.name)}&ticketNumber=${newTicket.ticketNumber}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {["Event", "Payment", "Confirm"].map((label, i) => (
            <React.Fragment key={label}>
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: i === 0 ? "#FF6B00" : colors.muted,
                      borderColor: i === 0 ? "#FF6B00" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.progressDotText, { color: i === 0 ? "#fff" : colors.mutedForeground }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[styles.progressLabel, { color: i === 0 ? "#FF6B00" : colors.mutedForeground }]}>
                  {label}
                </Text>
              </View>
              {i < 2 && (
                <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Event Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={image} style={styles.summaryImage} resizeMode="cover" />
          <View style={styles.summaryInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,107,0,0.15)" }]}>
              <Text style={[styles.categoryText, { color: "#FF6B00" }]}>{event.category}</Text>
            </View>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={styles.summaryMeta}>
              <Feather name="calendar" size={11} color="#A0A0A0" />
              <Text style={[styles.summaryMetaText, { color: colors.mutedForeground }]}>
                {formatDate(event.date)} · {formatTime(event.time)}
              </Text>
            </View>
            <View style={styles.summaryMeta}>
              <Feather name="map-pin" size={11} color="#A0A0A0" />
              <Text style={[styles.summaryMetaText, { color: colors.mutedForeground }]}>
                {event.venue}, {event.city}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ticket Details</Text>
          <View style={[styles.ticketRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.ticketName, { color: colors.foreground }]}>{ticketType.name}</Text>
              <Text style={[styles.ticketPrice, { color: colors.mutedForeground }]}>
                {event.currencySymbol} {ticketType.price.toLocaleString()} each
              </Text>
            </View>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => { if (quantity > 1) { Haptics.selectionAsync(); setQuantity(q => q - 1); } }}
                style={[styles.qtyBtn, { backgroundColor: colors.muted, opacity: quantity <= 1 ? 0.4 : 1 }]}
              >
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyText, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                onPress={() => { if (quantity < Math.min(6, ticketType.available)) { Haptics.selectionAsync(); setQuantity(q => q + 1); } }}
                style={[styles.qtyBtn, { backgroundColor: colors.muted, opacity: quantity >= Math.min(6, ticketType.available) ? 0.4 : 1 }]}
              >
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => { Haptics.selectionAsync(); setPaymentMethod(method.id); }}
                  style={[
                    styles.paymentMethod,
                    {
                      backgroundColor: active ? "rgba(255,107,0,0.08)" : colors.card,
                      borderColor: active ? "#FF6B00" : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: active ? "rgba(255,107,0,0.15)" : colors.muted }]}>
                    <Feather name={method.icon as any} size={18} color={active ? "#FF6B00" : colors.mutedForeground} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentLabel, { color: colors.foreground }]}>{method.label}</Text>
                    <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>{method.sub}</Text>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: active ? "#FF6B00" : colors.border }]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {(paymentMethod === "mpesa" || paymentMethod === "mtn") && (
            <View style={[styles.phoneInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.phoneFlag, { color: colors.foreground }]}>
                {paymentMethod === "mpesa" ? "🇰🇪 +254" : "🇺🇬 +256"}
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="712 345 678"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.phoneField, { color: colors.foreground }]}
                maxLength={12}
              />
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>
          <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <OrderRow label={`${ticketType.name} × ${quantity}`} value={`${event.currencySymbol} ${total.toLocaleString()}`} colors={colors} />
            <OrderRow label="Service fee (5%)" value={`${event.currencySymbol} ${fee.toLocaleString()}`} colors={colors} muted />
            <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />
            <OrderRow label="Total" value={`${event.currencySymbol} ${grandTotal.toLocaleString()}`} colors={colors} bold />
          </View>
        </View>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Feather name="shield" size={13} color="#00C853" />
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
            Your payment is secured with 256-bit encryption
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: loading || pressed ? 0.8 : 1 },
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.ctaBtnText}>Processing payment...</Text>
          ) : (
            <>
              <Text style={styles.ctaBtnText}>
                Pay {event.currencySymbol} {grandTotal.toLocaleString()}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function OrderRow({
  label,
  value,
  colors,
  muted,
  bold,
}: {
  label: string;
  value: string;
  colors: any;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={styles.orderRow}>
      <Text style={[styles.orderLabel, { color: muted ? colors.mutedForeground : colors.foreground, fontWeight: bold ? "700" : "400" }]}>
        {label}
      </Text>
      <Text style={[styles.orderValue, { color: bold ? "#FF6B00" : colors.foreground, fontWeight: bold ? "800" : "600" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  progress: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20 },
  progressStep: { alignItems: "center", gap: 4 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  progressDotText: { fontSize: 12, fontWeight: "700" },
  progressLabel: { fontSize: 11, fontWeight: "600" },
  progressLine: { flex: 1, height: 1.5, marginHorizontal: 8, marginBottom: 16 },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 24,
  },
  summaryImage: { width: 100, height: 120 },
  summaryInfo: { flex: 1, padding: 12, gap: 4 },
  categoryBadge: { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  categoryText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  summaryTitle: { fontSize: 15, fontWeight: "700", lineHeight: 19 },
  summaryMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryMetaText: { fontSize: 11, flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ticketName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  ticketPrice: { fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" },
  paymentMethods: { gap: 10, marginBottom: 12 },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: { flex: 1 },
  paymentLabel: { fontSize: 14, fontWeight: "600" },
  paymentSub: { fontSize: 12, marginTop: 1 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6B00" },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  phoneFlag: { fontSize: 14, fontWeight: "600" },
  phoneField: { flex: 1, fontSize: 15 },
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderLabel: { fontSize: 14 },
  orderValue: { fontSize: 14 },
  orderDivider: { height: 1, marginVertical: 2 },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  securityText: { fontSize: 12 },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  ctaBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
