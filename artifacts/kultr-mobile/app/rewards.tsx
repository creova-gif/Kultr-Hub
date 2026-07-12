import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useActivatePass, getGetQuestProgressQueryKey } from "@workspace/api-client-react";

import { Alert } from "@/lib/alert";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useQuestProgress, usePerks, useUnlockPerk, type PerkView } from "@/hooks/useQuests";

/**
 * KULTR PASS checkout — mirrors the raw-fetch pattern used by
 * app/checkout/[eventId].tsx for POST /payments/init + /payments/verify
 * (those payment routes aren't in the OpenAPI spec, so there's no generated
 * hook for them; the app already talks to them this way). The final grant
 * step, POST /pass/activate, IS in the spec, so that part uses the
 * generated useActivatePass hook.
 */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export default function RewardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken } = useApp();
  const { data: progress, isLoading, isError } = useQuestProgress();
  const { data: perksData, isError: isPerksError } = usePerks();
  const unlock = useUnlockPerk();
  const activatePass = useActivatePass();
  const qc = useQueryClient();
  const [purchasingPass, setPurchasingPass] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const balance = progress?.balance ?? 0;
  const perks = perksData?.perks ?? [];

  const handleGetPass = async () => {
    if (!authToken || purchasingPass) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasingPass(true);
    const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
    const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };

    try {
      const initRes = await fetch(`${apiBase}/api/payments/pass/init`, { method: "POST", headers: authHeader });
      if (!initRes.ok) {
        Alert.alert("Couldn't start payment", await readError(initRes, "Please try again."));
        return;
      }
      const initData = (await initRes.json()) as { reference: string; amount: number; currency: string; simulated: boolean };

      const verifyRes = await fetch(`${apiBase}/api/payments/pass/verify`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ reference: initData.reference }),
      });
      if (!verifyRes.ok) {
        Alert.alert("Payment could not be verified", await readError(verifyRes, "Please try again."));
        return;
      }

      activatePass.mutate(
        { data: { reference: initData.reference } },
        {
          onSuccess: (res) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            qc.invalidateQueries({ queryKey: getGetQuestProgressQueryKey() });
            const until = res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : "in 30 days";
            Alert.alert("KULTR PASS activated!", `${res.multiplier}× earning until ${until}.`);
          },
          onError: (e) => Alert.alert("Activation failed", e instanceof Error ? e.message : "Please try again."),
        },
      );
    } catch {
      Alert.alert("Network error", "Couldn't reach the server. Please try again.");
    } finally {
      setPurchasingPass(false);
    }
  };

  const handleUnlock = (perk: PerkView) => {
    if (balance < perk.cost) {
      Alert.alert("Not enough KULTROINS", `You need ${perk.cost.toLocaleString()} to unlock ${perk.name}.`);
      return;
    }
    Alert.alert(
      "Unlock perk?",
      `Spend ${perk.cost.toLocaleString()} KULTROINS to unlock "${perk.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            unlock.mutate(perk.slug, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Unlocked!", `"${perk.name}" is now yours.`);
              },
              onError: (e) =>
                Alert.alert("Unlock failed", e instanceof Error ? e.message : "Please try again."),
            });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Rewards</Text>
          <View style={styles.backBtn} />
        </View>

        {!authToken ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="gift" size={34} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to view rewards</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Earn KULTROINS from quests, then unlock experiences.
            </Text>
            <Pressable style={styles.cta} onPress={() => router.push("/login")}>
              <Text style={styles.ctaText}>Sign In</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF6B00" />
          </View>
        ) : isError || isPerksError ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="wifi-off" size={34} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load rewards</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Check your connection and try again.
            </Text>
          </View>
        ) : (
          <>
            {/* Balance card */}
            <View style={[styles.balanceCard, { backgroundColor: "#1A0A00", borderColor: "#FF6B00" }]}>
              <Text style={styles.balanceLabel}>KULTROIN BALANCE</Text>
              <View style={styles.balanceRow}>
                <Feather name="star" size={26} color="#FFB400" />
                <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
              </View>
              {progress?.pass.active ? (
                <View style={styles.passBadge}>
                  <Feather name="zap" size={11} color="#FFB400" />
                  <Text style={styles.passBadgeText}>KULTR PASS · {progress.pass.multiplier}× earning</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.balanceSub}>
                    Lifetime earned: {(progress?.lifetimeEarned ?? 0).toLocaleString()}
                  </Text>
                  <Pressable
                    onPress={handleGetPass}
                    disabled={purchasingPass || activatePass.isPending}
                    style={[styles.getPassBtn, { opacity: purchasingPass || activatePass.isPending ? 0.6 : 1 }]}
                    accessibilityLabel="Get KULTR PASS — 500 KES for 30 days of 1.5x earning"
                    accessibilityRole="button"
                  >
                    {purchasingPass || activatePass.isPending ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <>
                        <Feather name="zap" size={13} color="#000" />
                        <Text style={styles.getPassBtnText}>Get KULTR PASS · 500 KES / 30 days</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {/* Perks */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Unlock More Experiences</Text>
              {perks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No perks available right now.
                </Text>
              ) : (
                perks.map((perk) => {
                  const affordable = balance >= perk.cost;
                  return (
                    <View
                      key={perk.slug}
                      style={[styles.perkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.perkIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
                        <Feather name="unlock" size={18} color="#FF6B00" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.perkName, { color: colors.foreground }]}>{perk.name}</Text>
                        {!!perk.description && (
                          <Text style={[styles.perkDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                            {perk.description}
                          </Text>
                        )}
                        <View style={styles.perkCostRow}>
                          <Feather name="star" size={11} color="#FFB400" />
                          <Text style={[styles.perkCost, { color: colors.foreground }]}>
                            {perk.cost.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => handleUnlock(perk)}
                        disabled={!affordable || unlock.isPending}
                        style={[
                          styles.unlockBtn,
                          {
                            backgroundColor: affordable ? "#FF6B00" : colors.muted,
                            opacity: unlock.isPending ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.unlockBtnText, { color: affordable ? "#fff" : colors.mutedForeground }]}>
                          {affordable ? "Unlock" : "Locked"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>

            <Pressable
              style={[styles.questsLink, { borderColor: colors.border }]}
              onPress={() => router.push("/quests")}
            >
              <Feather name="compass" size={16} color="#FF6B00" />
              <Text style={[styles.questsLinkText, { color: colors.foreground }]}>Back to Cultural Quests</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </>
        )}
      </ScrollView>
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

  loadingWrap: { alignItems: "center", paddingVertical: 60 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  cta: { backgroundColor: "#FF6B00", borderRadius: 25, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  balanceCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 20, marginTop: 8, gap: 8 },
  balanceLabel: { color: "#FF6B00", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  balanceValue: { color: "#fff", fontSize: 40, fontWeight: "900" },
  balanceSub: { color: "#888", fontSize: 12 },
  passBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "rgba(255,180,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  passBadgeText: { color: "#FFB400", fontSize: 11, fontWeight: "700" },
  getPassBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#FFB400",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  getPassBtnText: { color: "#000", fontSize: 12, fontWeight: "800" },

  section: { paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  perkCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  perkIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  perkName: { fontSize: 14, fontWeight: "800" },
  perkDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  perkCostRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  perkCost: { fontSize: 13, fontWeight: "800" },
  unlockBtn: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9, flexShrink: 0 },
  unlockBtnText: { fontSize: 12, fontWeight: "700" },

  questsLink: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  questsLinkText: { fontSize: 14, fontWeight: "700" },
});
