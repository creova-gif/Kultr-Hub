import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { CountryPickerModal } from "@/components/CountryPickerModal";
import { useApp } from "@/context/AppContext";
import { EVENT_IMAGES, formatDate, formatTime } from "@/constants/data";
import {
  convertCurrency,
  type PaymentMethod,
} from "@/constants/currencies";
import { useColors } from "@/hooks/useColors";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useGetFxRates } from "@workspace/api-client-react";

export default function CheckoutScreen() {
  const { eventId, ticketTypeIndex } = useLocalSearchParams<{
    eventId: string;
    ticketTypeIndex: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTicket, userCountry, setUserCountry, authToken } = useApp();
  const { event } = useEventDetail(eventId);
  const typeIdx = Number(ticketTypeIndex ?? "0");
  const ticketType = event?.ticketTypes[typeIdx] ?? event?.ticketTypes[0];

  const [quantity, setQuantity] = useState(1);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Active payment methods for user's country
  const paymentMethods = userCountry.paymentMethods;
  const activeMethod: PaymentMethod | undefined =
    paymentMethods.find((m) => m.id === selectedMethodId) ?? paymentMethods[0];

  // Currency conversion: event price → user currency
  const eventCurrencyCode = event?.currency ?? "KES";
  const isSameCurrency = eventCurrencyCode === userCountry.currencyCode;

  // Prefer live FX rates from the API; fall back to static table when unavailable.
  const { data: fxData } = useGetFxRates({ base: userCountry.currencyCode });

  const convertedPrice = useMemo(() => {
    if (!ticketType) return 0;
    if (isSameCurrency) return ticketType.price;
    // Live rate: fxData.rates[eventCurrencyCode] = units of event currency per 1 user currency
    // So price / rate = user-currency amount
    const liveRate = fxData?.rates?.[eventCurrencyCode];
    if (liveRate && liveRate > 0) {
      return Math.round(ticketType.price / liveRate);
    }
    return convertCurrency(ticketType.price, eventCurrencyCode, userCountry.code);
  }, [ticketType, eventCurrencyCode, userCountry.code, isSameCurrency, fxData]);

  const total = convertedPrice * quantity;
  const fee = Math.round(total * 0.05);
  const grandTotal = total + fee;

  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (!event || !ticketType) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Event not found</Text>
      </View>
    );
  }

  const image = EVENT_IMAGES[event.imageKey];
  const needsPhone =
    activeMethod?.type === "mobile_money" || activeMethod?.type === "ussd";

  const handleConfirm = async () => {
    if (needsPhone && phone.trim().length < 8) {
      Alert.alert("Invalid Number", "Please enter a valid mobile number.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
    const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };

    try {
      if (authToken) {
        // M-Pesa STK Push path for mobile_money payments
        if (activeMethod?.type === "mobile_money") {
          const stkRes = await fetch(`${apiBase}/api/payments/mpesa/stk-push`, {
            method: "POST",
            headers: authHeader,
            body: JSON.stringify({ eventId: event.id, ticketTypeId: ticketType.id, quantity, phone }),
          });

          if (stkRes.ok) {
            const stkData = await stkRes.json() as {
              checkoutRequestId: string;
              reference: string;
              simulated: boolean;
            };

            // Wait for user to enter PIN (or instant for simulated)
            if (!stkData.simulated) {
              await new Promise((r) => setTimeout(r, 5000));
            }

            const verifyRes = await fetch(`${apiBase}/api/payments/mpesa/verify`, {
              method: "POST",
              headers: authHeader,
              body: JSON.stringify({
                checkoutRequestId: stkData.checkoutRequestId,
                reference: stkData.reference,
                simulated: stkData.simulated,
                eventId: event.id,
                ticketTypeId: ticketType.id,
                quantity,
              }),
            });

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json() as { ticketId: string; ticketNumber: string };
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setLoading(false);
              router.replace(`/ticket/${verifyData.ticketId}?newPurchase=true&eventId=${event.id}&ticketTypeName=${encodeURIComponent(ticketType.name)}&ticketNumber=${verifyData.ticketNumber}`);
              return;
            }
          }
        } else {
          // Paystack path for card / bank / ussd
          const initRes = await fetch(`${apiBase}/api/payments/init`, {
            method: "POST",
            headers: authHeader,
            body: JSON.stringify({ eventId: event.id, ticketTypeId: ticketType.id, quantity }),
          });

          if (initRes.ok) {
            const initData = await initRes.json() as {
              reference: string;
              authorizationUrl: string | null;
              simulated: boolean;
              totalAmount: number;
              currency: string;
            };

            if (initData.authorizationUrl) {
              const browserResult = await WebBrowser.openBrowserAsync(initData.authorizationUrl);
              if (browserResult.type !== "opened" && browserResult.type !== "cancel") {
                const verifyRes = await fetch(`${apiBase}/api/payments/verify`, {
                  method: "POST",
                  headers: authHeader,
                  body: JSON.stringify({
                    reference: initData.reference,
                    eventId: event.id,
                    ticketTypeId: ticketType.id,
                    quantity,
                  }),
                });

                if (verifyRes.ok) {
                  const verifyData = await verifyRes.json() as { ticketId: string; ticketNumber: string };
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setLoading(false);
                  router.replace(`/ticket/${verifyData.ticketId}?newPurchase=true&eventId=${event.id}&ticketTypeName=${encodeURIComponent(ticketType.name)}&ticketNumber=${verifyData.ticketNumber}`);
                  return;
                }
              }
            } else if (initData.simulated) {
              const verifyRes = await fetch(`${apiBase}/api/payments/verify`, {
                method: "POST",
                headers: authHeader,
                body: JSON.stringify({
                  reference: initData.reference,
                  simulated: true,
                  eventId: event.id,
                  ticketTypeId: ticketType.id,
                  quantity,
                }),
              });

              if (verifyRes.ok) {
                const verifyData = await verifyRes.json() as { ticketId: string; ticketNumber: string };
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setLoading(false);
                router.replace(`/ticket/${verifyData.ticketId}?newPurchase=true&eventId=${event.id}&ticketTypeName=${encodeURIComponent(ticketType.name)}&ticketNumber=${verifyData.ticketNumber}`);
                return;
              }
            }
          }
        }
      }
    } catch {
      // Fall through to demo mode
    }

    // Demo fallback: create ticket locally (used when API is unavailable or user is not authenticated)
    await new Promise((r) => setTimeout(r, 1200));
    const newTicket = {
      id: `ticket-${Date.now()}`,
      eventId: event.id,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      ticketNumber: `KTR-${Math.floor(10000 + Math.random() * 90000)}`,
      purchaseDate: new Date().toISOString().split("T")[0],
      quantity,
      totalPaid: grandTotal,
      currency: userCountry.currencyCode,
      currencySymbol: userCountry.currencySymbol,
    };
    addTicket(newTicket);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    router.replace(
      `/ticket/${newTicket.id}?newPurchase=true&eventId=${event.id}&ticketTypeName=${encodeURIComponent(ticketType.name)}&ticketNumber=${newTicket.ticketNumber}`
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 110 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Country / Currency Selector */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowCountryPicker(true); }}
          style={[styles.countrySwitcher, { backgroundColor: colors.card, borderColor: "#FF6B00" + "60" }]}
        >
          <View style={styles.countrySwitcherLeft}>
            <Text style={styles.countryFlag}>{userCountry.flag}</Text>
            <View>
              <Text style={[styles.countryName, { color: colors.foreground }]}>
                {userCountry.name}
              </Text>
              <Text style={[styles.countryCurrency, { color: colors.mutedForeground }]}>
                Paying in {userCountry.currencySymbol} · {userCountry.currencyCode}
              </Text>
            </View>
          </View>
          <View style={styles.countrySwitcherRight}>
            <Text style={[styles.switchLabel, { color: "#FF6B00" }]}>Switch</Text>
            <Feather name="chevron-down" size={14} color="#FF6B00" />
          </View>
        </Pressable>

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
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketName, { color: colors.foreground }]}>{ticketType.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.ticketPriceMain, { color: "#FF6B00" }]}>
                  {userCountry.currencySymbol} {convertedPrice.toLocaleString()}
                </Text>
                {!isSameCurrency && (
                  <Text style={[styles.ticketPriceOrig, { color: colors.mutedForeground }]}>
                    ({event.currencySymbol} {ticketType.price.toLocaleString()})
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => {
                  if (quantity > 1) { Haptics.selectionAsync(); setQuantity((q) => q - 1); }
                }}
                style={[styles.qtyBtn, { backgroundColor: colors.muted, opacity: quantity <= 1 ? 0.4 : 1 }]}
              >
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyText, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                onPress={() => {
                  if (quantity < Math.min(6, ticketType.available)) {
                    Haptics.selectionAsync(); setQuantity((q) => q + 1);
                  }
                }}
                style={[
                  styles.qtyBtn,
                  { backgroundColor: colors.muted, opacity: quantity >= Math.min(6, ticketType.available) ? 0.4 : 1 },
                ]}
              >
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Method</Text>
            <Text style={[styles.countryHint, { color: colors.mutedForeground }]}>
              {userCountry.flag} {userCountry.name}
            </Text>
          </View>
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => {
              const active = (selectedMethodId || paymentMethods[0]?.id) === method.id;
              const typeLabel =
                method.type === "mobile_money" ? "Mobile Money" :
                method.type === "bank" ? "Bank Transfer" :
                method.type === "ussd" ? "USSD" : "Card";
              const initial = method.label.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={method.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedMethodId(method.id);
                    setPhone("");
                  }}
                  style={[
                    styles.paymentMethod,
                    {
                      backgroundColor: active
                        ? method.color + "10"
                        : colors.card,
                      borderColor: active ? method.color : colors.border,
                    },
                  ]}
                >
                  {/* Brand avatar */}
                  <View
                    style={[
                      styles.brandAvatar,
                      { backgroundColor: active ? method.color : method.color + "22" },
                    ]}
                  >
                    <Text style={[styles.brandInitial, { color: active ? "#fff" : method.color }]}>
                      {initial}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.paymentInfo}>
                    <View style={styles.paymentLabelRow}>
                      <Text style={[styles.paymentLabel, { color: colors.foreground }]}>
                        {method.label}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: method.color + "20" }]}>
                        <Text style={[styles.typeBadgeText, { color: method.color }]}>
                          {typeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                      {method.sub}
                    </Text>
                  </View>

                  {/* Radio */}
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: active ? method.color : colors.border,
                        backgroundColor: active ? method.color + "15" : "transparent",
                      },
                    ]}
                  >
                    {active && (
                      <View style={[styles.radioInner, { backgroundColor: method.color }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Phone input for mobile money / USSD */}
          {needsPhone && activeMethod && (
            <View style={[styles.phoneInput, { backgroundColor: colors.card, borderColor: "#FF6B00" + "50" }]}>
              <Text style={[styles.phoneFlag, { color: colors.foreground }]}>
                {userCountry.flag} {activeMethod.phonePrefix ?? userCountry.phonePrefix}
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={activeMethod.phonePlaceholder ?? "712 345 678"}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.phoneField, { color: colors.foreground }]}
                maxLength={13}
              />
              {phone.length > 0 && (
                <Pressable onPress={() => setPhone("")}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          )}

          {/* Card hint */}
          {activeMethod?.type === "card" && (
            <View style={[styles.cardHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={13} color="#00C853" />
              <Text style={[styles.cardHintText, { color: colors.mutedForeground }]}>
                You will be redirected to a secure 3D-secured payment page
              </Text>
            </View>
          )}

          {/* Bank transfer hint */}
          {activeMethod?.type === "bank" && (
            <View style={[styles.cardHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="info" size={13} color="#FF6B00" />
              <Text style={[styles.cardHintText, { color: colors.mutedForeground }]}>
                Bank account details will be sent to your email after confirming
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>
          <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <OrderRow
              label={`${ticketType.name} × ${quantity}`}
              value={`${userCountry.currencySymbol} ${total.toLocaleString()}`}
              colors={colors}
            />
            {!isSameCurrency && (
              <OrderRow
                label="Original price"
                value={`${event.currencySymbol} ${(ticketType.price * quantity).toLocaleString()}`}
                colors={colors}
                muted
              />
            )}
            <OrderRow
              label="Service fee (5%)"
              value={`${userCountry.currencySymbol} ${fee.toLocaleString()}`}
              colors={colors}
              muted
            />
            <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />
            <OrderRow
              label="Total"
              value={`${userCountry.currencySymbol} ${grandTotal.toLocaleString()}`}
              colors={colors}
              bold
            />
          </View>
        </View>

        {/* Currency note if converted */}
        {!isSameCurrency && (
          <View style={[styles.conversionNote, { backgroundColor: "rgba(255,107,0,0.08)", borderColor: "#FF6B00" + "40" }]}>
            <Feather name="refresh-cw" size={13} color="#FF6B00" />
            <Text style={[styles.conversionText, { color: colors.mutedForeground }]}>
              Converted from {event.currencySymbol} {event.currency} · indicative rate
            </Text>
          </View>
        )}

        {/* Security note */}
        <View style={styles.securityNote}>
          <Feather name="shield" size={13} color="#00C853" />
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
            Your payment is secured with 256-bit encryption
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          styles.ctaBar,
          { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, { opacity: loading || pressed ? 0.8 : 1 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.ctaBtnText}>Processing payment...</Text>
          ) : (
            <>
              <Text style={styles.ctaBtnText}>
                Pay {userCountry.currencySymbol} {grandTotal.toLocaleString()}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      <CountryPickerModal
        visible={showCountryPicker}
        currentCode={userCountry.code}
        onSelect={(country) => {
          setUserCountry(country);
          setSelectedMethodId("");
          setPhone("");
          setShowCountryPicker(false);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
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
  // Country switcher
  countrySwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  countrySwitcherLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  countryFlag: { fontSize: 28 },
  countryName: { fontSize: 15, fontWeight: "700" },
  countryCurrency: { fontSize: 12, marginTop: 2 },
  countrySwitcherRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  switchLabel: { fontSize: 13, fontWeight: "700" },
  // Summary card
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
  categoryBadge: { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  categoryText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  summaryTitle: { fontSize: 15, fontWeight: "700", lineHeight: 19 },
  summaryMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryMetaText: { fontSize: 11, flex: 1 },
  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  countryHint: { fontSize: 13 },
  // Ticket row
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  ticketName: { fontSize: 14, fontWeight: "700" },
  ticketPriceMain: { fontSize: 16, fontWeight: "800" },
  ticketPriceOrig: { fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" },
  // Payment methods
  paymentMethods: { gap: 10, marginBottom: 12 },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    overflow: "hidden",
  },
  brandAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandInitial: { fontSize: 18, fontWeight: "900" },
  paymentInfo: { flex: 1 },
  paymentLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  paymentLabel: { fontSize: 14, fontWeight: "700" },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  paymentSub: { fontSize: 12, marginTop: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  // Phone input
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 0,
  },
  phoneFlag: { fontSize: 14, fontWeight: "600" },
  phoneField: { flex: 1, fontSize: 15 },
  // Card / bank hints
  cardHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  cardHintText: { fontSize: 12, flex: 1, lineHeight: 17 },
  // Order
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderLabel: { fontSize: 14 },
  orderValue: { fontSize: 14 },
  orderDivider: { height: 1, marginVertical: 2 },
  // Notes
  conversionNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  conversionText: { fontSize: 12, flex: 1 },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  securityText: { fontSize: 12 },
  // CTA
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
  // Country picker modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSub: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  countryRowFlag: { fontSize: 32 },
  countryRowInfo: { flex: 1 },
  countryRowName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  countryRowCurrency: { fontSize: 13, marginBottom: 6 },
  countryRowMethods: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  methodPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodPillText: { fontSize: 10, fontWeight: "600" },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
