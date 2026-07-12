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

import { Alert } from "@/lib/alert";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  useAdminReviewQueue,
  useSetEventStatus,
  useAdminPendingPayouts,
  useResolvePayoutAdmin,
  useAdminEventReports,
  useResolveEventReport,
  type EventSummary,
  type PayoutView,
  type AdminEventReportView,
} from "@/hooks/useAdmin";

type Tab = "events" | "payouts" | "reports";

/**
 * Internal moderation tool — not linked from anywhere in the tab bar.
 * Reachable only by navigating to /admin directly (see summary note: the
 * natural entry point would be a "Admin" row in Profile, but profile.tsx is
 * owned by another engineer right now). Gated server-side: every call here
 * requires isAdmin, enforced by requireAdmin on the API. A non-admin who
 * navigates here sees an access-denied screen once the first request 403s —
 * nothing sensitive renders before that.
 */
export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken } = useApp();
  const [tab, setTab] = useState<Tab>("events");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const reviewQueue = useAdminReviewQueue();
  const setStatus = useSetEventStatus();
  const pendingPayouts = useAdminPendingPayouts();
  const resolvePayout = useResolvePayoutAdmin();
  const eventReports = useAdminEventReports();
  const resolveReport = useResolveEventReport();

  // A 403 on any of the three admin-only lookups means "not an admin" —
  // the queries all fire together, so check across all three.
  const isForbidden =
    (reviewQueue.error as { status?: number } | undefined)?.status === 403 ||
    (pendingPayouts.error as { status?: number } | undefined)?.status === 403 ||
    (eventReports.error as { status?: number } | undefined)?.status === 403;

  const anyLoading = reviewQueue.isLoading || pendingPayouts.isLoading || eventReports.isLoading;

  const approve = (event: EventSummary) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus.mutate(event.id, "live", {
      onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      onError: (e) => Alert.alert("Failed", e instanceof Error ? e.message : "Please try again."),
    });
  };

  const reject = (event: EventSummary) => {
    Alert.alert("Reject event?", `Send "${event.title}" back to draft?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setStatus.mutate(event.id, "draft", {
            onError: (e) => Alert.alert("Failed", e instanceof Error ? e.message : "Please try again."),
          });
        },
      },
    ]);
  };

  const resolveAsPayout = (payout: PayoutView, status: "paid" | "failed") => {
    Alert.alert(
      status === "paid" ? "Mark as paid?" : "Mark as failed?",
      `${payout.currency} ${payout.amount.toLocaleString()} to ${payout.destination}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            resolvePayout.mutate(payout.id, status, {
              onError: (e) => Alert.alert("Failed", e instanceof Error ? e.message : "Please try again."),
            });
          },
        },
      ],
    );
  };

  const resolveAsReport = (report: AdminEventReportView, status: "reviewed" | "dismissed") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resolveReport.mutate(report.id, status, {
      onError: (e) => Alert.alert("Failed", e instanceof Error ? e.message : "Please try again."),
    });
  };

  if (!authToken) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in required</Text>
          <Pressable style={styles.cta} onPress={() => router.push("/login")}>
            <Text style={styles.ctaText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isForbidden) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Feather name="shield-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admins only</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            This account doesn't have admin access.
          </Text>
          <Pressable style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: bottomPad + 40 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { id: "events", label: "Review Queue", count: reviewQueue.data?.events.length ?? 0 },
            { id: "payouts", label: "Payouts", count: pendingPayouts.data?.payouts.length ?? 0 },
            { id: "reports", label: "Reports", count: eventReports.data?.reports.filter((r) => r.status === "open").length ?? 0 },
          ] as const).map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
                style={[styles.tab, { backgroundColor: active ? "#FF6B00" : colors.muted, borderColor: active ? "#FF6B00" : colors.border }]}
              >
                <Text style={[styles.tabText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {t.label}{t.count > 0 ? ` (${t.count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {anyLoading ? (
          <ActivityIndicator color="#FF6B00" style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.section}>
            {tab === "events" && (
              (reviewQueue.data?.events.length ?? 0) === 0 ? (
                <Text style={[styles.emptyInline, { color: colors.mutedForeground }]}>Nothing pending review.</Text>
              ) : (
                reviewQueue.data!.events.map((ev) => (
                  <View key={ev.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ev.title}</Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      {ev.category} · {ev.city}, {ev.country} · {new Date(ev.eventDate).toLocaleDateString()}
                    </Text>
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => reject(ev)}
                        disabled={setStatus.isPending}
                        style={[styles.actionBtn, { backgroundColor: "rgba(211,47,47,0.12)" }]}
                      >
                        <Feather name="x" size={13} color="#D32F2F" />
                        <Text style={[styles.actionBtnText, { color: "#D32F2F" }]}>Reject</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => approve(ev)}
                        disabled={setStatus.isPending}
                        style={[styles.actionBtn, { backgroundColor: "#FF6B00" }]}
                      >
                        <Feather name="check" size={13} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: "#fff" }]}>Approve</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )
            )}

            {tab === "payouts" && (
              (pendingPayouts.data?.payouts.length ?? 0) === 0 ? (
                <Text style={[styles.emptyInline, { color: colors.mutedForeground }]}>No pending payouts.</Text>
              ) : (
                pendingPayouts.data!.payouts.map((p) => (
                  <View key={p.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {p.currency} {p.amount.toLocaleString()}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                      To {p.destination}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      Requested {new Date(p.requestedAt).toLocaleDateString()} · creator {p.creatorId?.slice(0, 8)}
                    </Text>
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => resolveAsPayout(p, "failed")}
                        disabled={resolvePayout.isPending}
                        style={[styles.actionBtn, { backgroundColor: "rgba(211,47,47,0.12)" }]}
                      >
                        <Text style={[styles.actionBtnText, { color: "#D32F2F" }]}>Mark Failed</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => resolveAsPayout(p, "paid")}
                        disabled={resolvePayout.isPending}
                        style={[styles.actionBtn, { backgroundColor: "#00C853" }]}
                      >
                        <Text style={[styles.actionBtnText, { color: "#fff" }]}>Mark Paid</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )
            )}

            {tab === "reports" && (
              (eventReports.data?.reports.length ?? 0) === 0 ? (
                <Text style={[styles.emptyInline, { color: colors.mutedForeground }]}>No reports filed.</Text>
              ) : (
                eventReports.data!.reports.map((r) => (
                  <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{r.reason}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor:
                              r.status === "open" ? "rgba(255,167,38,0.15)" : r.status === "reviewed" ? "rgba(0,200,83,0.15)" : "rgba(136,136,136,0.15)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: r.status === "open" ? "#FFA726" : r.status === "reviewed" ? "#00C853" : "#888" },
                          ]}
                        >
                          {r.status}
                        </Text>
                      </View>
                    </View>
                    {!!r.details && (
                      <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{r.details}</Text>
                    )}
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      Event {r.eventId.slice(0, 8)} · filed {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/event/${r.eventId}` as any)}
                      style={[styles.viewEventBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.viewEventText, { color: "#FF6B00" }]}>View reported event</Text>
                    </Pressable>
                    {r.status === "open" && (
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => resolveAsReport(r, "dismissed")}
                          disabled={resolveReport.isPending}
                          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Dismiss</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => resolveAsReport(r, "reviewed")}
                          disabled={resolveReport.isPending}
                          style={[styles.actionBtn, { backgroundColor: "#FF6B00" }]}
                        >
                          <Text style={[styles.actionBtnText, { color: "#fff" }]}>Mark Reviewed</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))
              )
            )}
          </View>
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

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center" },
  emptyInline: { fontSize: 13, textAlign: "center", paddingVertical: 24 },
  cta: { backgroundColor: "#FF6B00", borderRadius: 22, paddingHorizontal: 24, paddingVertical: 11, marginTop: 6 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 16, borderWidth: 1 },
  tabText: { fontSize: 11, fontWeight: "700" },

  section: { paddingHorizontal: 16, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  cardMeta: { fontSize: 11.5, lineHeight: 16 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, paddingVertical: 9 },
  actionBtnText: { fontSize: 12, fontWeight: "700" },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  viewEventBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 8 },
  viewEventText: { fontSize: 12, fontWeight: "700" },
});
