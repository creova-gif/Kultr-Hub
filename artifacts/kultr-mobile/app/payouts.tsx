import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert } from "@/lib/alert";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { usePayoutBalance, useMyPayouts, useRequestPayout, type PayoutView } from "@/hooks/usePayouts";

const STATUS_COLOR: Record<string, string> = {
  pending: "#FFA726",
  paid: "#00C853",
  failed: "#D32F2F",
  cancelled: "#888",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function PayoutsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken } = useApp();

  const { data: balanceData, isLoading: balanceLoading, isError: balanceError } = usePayoutBalance();
  const { data: payoutsData, isLoading: payoutsLoading, isError: payoutsError } = useMyPayouts();
  const requestPayout = useRequestPayout();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [destination, setDestination] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const balances = balanceData?.balances ?? [];
  const payouts = payoutsData?.payouts ?? [];

  const openForm = (prefillCurrency?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrency(prefillCurrency ?? balances[0]?.currency ?? "KES");
    setAmount("");
    setDestination("");
    setShowForm(true);
  };

  const submit = () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      Alert.alert("Invalid amount", "Enter a positive amount to request.");
      return;
    }
    if (!currency.trim()) {
      Alert.alert("Currency required", "Enter a currency, e.g. KES.");
      return;
    }
    if (!destination.trim()) {
      Alert.alert("Destination required", "Enter a phone number or bank reference to pay out to.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestPayout.mutate(
      { amount: numeric, currency: currency.trim().toUpperCase(), destination: destination.trim() },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowForm(false);
          Alert.alert("Payout requested", "Your request is pending review.");
        },
        onError: (e) =>
          Alert.alert("Request failed", e instanceof Error ? e.message : "Please try again."),
      },
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 40 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: colors.muted }]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payouts</Text>
            <View style={styles.backBtn} />
          </View>

          {!authToken ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="dollar-sign" size={34} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to view payouts</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                See your balance and request a payout for your event revenue.
              </Text>
              <Pressable style={styles.cta} onPress={() => router.push("/login")}>
                <Text style={styles.ctaText}>Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Balance cards */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Balance</Text>
                {balanceLoading ? (
                  <ActivityIndicator color="#FF6B00" style={{ marginVertical: 20 }} />
                ) : balanceError ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Couldn't load your balance. Pull to retry.
                  </Text>
                ) : balances.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No confirmed ticket revenue yet — your balance will appear here once tickets sell.
                  </Text>
                ) : (
                  balances.map((b) => (
                    <View
                      key={b.currency}
                      style={[styles.balanceCard, { backgroundColor: "#1A0A00", borderColor: "#FF6B00" }]}
                    >
                      <View style={styles.balanceTopRow}>
                        <Text style={styles.balanceLabel}>{b.currency} AVAILABLE</Text>
                        <Pressable
                          onPress={() => openForm(b.currency)}
                          disabled={b.available <= 0}
                          style={[styles.requestBtn, { opacity: b.available <= 0 ? 0.4 : 1 }]}
                          accessibilityLabel={`Request payout in ${b.currency}`}
                          accessibilityRole="button"
                        >
                          <Feather name="send" size={12} color="#fff" />
                          <Text style={styles.requestBtnText}>Request</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.balanceValue}>{formatMoney(b.available, b.currency)}</Text>
                      <View style={styles.balanceMetaRow}>
                        <Text style={styles.balanceMeta}>
                          Revenue {formatMoney(b.revenue, b.currency)}
                        </Text>
                        <Text style={styles.balanceMeta}>
                          Already requested {formatMoney(b.requested, b.currency)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
                {balances.length === 0 && !balanceLoading && !balanceError && (
                  <Pressable style={[styles.newRequestBtn, { borderColor: colors.border }]} onPress={() => openForm()}>
                    <Feather name="plus" size={14} color="#FF6B00" />
                    <Text style={styles.newRequestText}>Request a payout anyway</Text>
                  </Pressable>
                )}
              </View>

              {/* Request form */}
              {showForm && (
                <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.formHeader}>
                    <Text style={[styles.formTitle, { color: colors.foreground }]}>Request Payout</Text>
                    <Pressable onPress={() => setShowForm(false)} accessibilityLabel="Close form">
                      <Feather name="x" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Amount</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Currency</Text>
                  <TextInput
                    value={currency}
                    onChangeText={(v) => setCurrency(v.toUpperCase())}
                    placeholder="KES"
                    autoCapitalize="characters"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Destination (phone or bank reference)
                  </Text>
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="e.g. 0712 345 678"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  />

                  <Pressable
                    onPress={submit}
                    disabled={requestPayout.isPending}
                    style={[styles.submitBtn, { opacity: requestPayout.isPending ? 0.6 : 1 }]}
                  >
                    {requestPayout.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {/* History */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payout History</Text>
                {payoutsLoading ? (
                  <ActivityIndicator color="#FF6B00" style={{ marginVertical: 20 }} />
                ) : payoutsError ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Couldn't load payout history.
                  </Text>
                ) : payouts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No payout requests yet.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {payouts.map((p: PayoutView) => (
                      <View
                        key={p.id}
                        style={[styles.payoutRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.payoutAmount, { color: colors.foreground }]}>
                            {formatMoney(p.amount, p.currency)}
                          </Text>
                          <Text style={[styles.payoutMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                            To {p.destination}
                          </Text>
                          <Text style={[styles.payoutMeta, { color: colors.mutedForeground }]}>
                            Requested {new Date(p.requestedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: (STATUS_COLOR[p.status] ?? "#888") + "22" },
                          ]}
                        >
                          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[p.status] ?? "#888" }]} />
                          <Text style={[styles.statusText, { color: STATUS_COLOR[p.status] ?? "#888" }]}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  cta: { backgroundColor: "#FF6B00", borderRadius: 25, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  section: { paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  balanceCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 8 },
  balanceTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { color: "#FF6B00", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  balanceValue: { color: "#fff", fontSize: 30, fontWeight: "900" },
  balanceMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
  balanceMeta: { color: "#999", fontSize: 11 },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FF6B00",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  requestBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  newRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 14,
  },
  newRequestText: { color: "#FF6B00", fontSize: 13, fontWeight: "700" },

  formCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, gap: 4 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  formTitle: { fontSize: 15, fontWeight: "800" },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginTop: 10, marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  submitBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  payoutRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  payoutAmount: { fontSize: 15, fontWeight: "800" },
  payoutMeta: { fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
});
