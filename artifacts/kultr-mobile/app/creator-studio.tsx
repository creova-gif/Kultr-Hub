import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop, Circle, G, Line, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { EVENT_IMAGES } from "@/constants/data";

const { width } = Dimensions.get("window");
const CHART_W = width - 64;
const CHART_H = 160;

// ── Chart helpers ────────────────────────────────────────────────────────────

function normalise(data: number[]): number[] {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  return data.map((v) => (v - min) / range);
}

function buildLinePath(data: number[], w: number, h: number, pad = 12): string {
  const n = normalise(data);
  const step = w / (n.length - 1);
  return n
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step},${h - pad - v * (h - pad * 2)}`)
    .join(" ");
}

function buildAreaPath(data: number[], w: number, h: number, pad = 12): string {
  const n = normalise(data);
  const step = w / (n.length - 1);
  const points = n.map((v, i) => `${i * step},${h - pad - v * (h - pad * 2)}`);
  return `M 0,${h} ${points.map((p, i) => (i === 0 ? `L ${p}` : `L ${p}`)).join(" ")} L ${w},${h} Z`;
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface DonutSegment { value: number; color: string; }

function buildDonutPath(segments: DonutSegment[], cx: number, cy: number, r: number): string[] {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;
  return segments.map((seg) => {
    const sweep = (seg.value / total) * 358;
    const start = polarToCart(cx, cy, r, angle);
    const end = polarToCart(cx, cy, r, angle + sweep);
    const large = sweep > 180 ? 1 : 0;
    const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
    angle += sweep + 2;
    return d;
  });
}

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function StatCard({ label, value, trend, trendUp, icon, colors }: StatCardProps) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <View style={statStyles.footer}>
        <View style={[statStyles.trendPill, { backgroundColor: trendUp ? "rgba(0,200,83,0.12)" : "rgba(211,47,47,0.12)" }]}>
          <Feather name={trendUp ? "trending-up" : "trending-down"} size={10} color={trendUp ? "#00C853" : "#D32F2F"} />
          <Text style={[statStyles.trendText, { color: trendUp ? "#00C853" : "#D32F2F" }]}>{trend}</Text>
        </View>
        <Feather name={icon as any} size={16} color="#FF6B00" />
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    minWidth: (width - 48 - 8) / 2,
  },
  label: { fontSize: 11, fontWeight: "600" },
  value: { fontSize: 22, fontWeight: "900" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendText: { fontSize: 10, fontWeight: "700" },
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatorStudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authUser, createdEvents, userCountry } = useApp();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;

  const displayName = authUser?.displayName ?? "Creator";
  const firstName = displayName.split(" ")[0];
  const symbol = userCountry.currencySymbol;

  const totalRevenue = createdEvents.reduce((s, e) => s + e.revenue, 0);
  const totalSold = createdEvents.reduce((s, e) => s + e.ticketsSold, 0);
  const liveCount = createdEvents.filter((e) => e.status === "live").length;

  function formatRevenue(n: number) {
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`;
    return `${symbol}${n}`;
  }

  // Simulated weekly ticket sales data (last 8 weeks)
  const salesData = useMemo(() => {
    const seed = totalSold || 120;
    return Array.from({ length: 8 }, (_, i) => {
      const base = seed * (0.3 + i * 0.1);
      const noise = ((seed * (i + 1)) % 50) - 25;
      return Math.max(10, Math.round(base + noise));
    });
  }, [totalSold]);

  const weekLabels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];

  // Revenue breakdown donut
  const ticketRev = Math.round(totalRevenue * 0.707);
  const merchRev = Math.round(totalRevenue * 0.184);
  const donationRev = Math.round(totalRevenue * 0.097);
  const otherRev = totalRevenue - ticketRev - merchRev - donationRev;

  const revenueSegments: DonutSegment[] = [
    { value: ticketRev, color: "#FF6B00" },
    { value: merchRev, color: "#FFA726" },
    { value: donationRev, color: "#FF8A50" },
    { value: otherRev, color: "#4A3020" },
  ];

  // Audience demographics donut
  const audienceSegments: DonutSegment[] = [
    { value: 28, color: "#FF6B00" },
    { value: 45, color: "#FFA726" },
    { value: 17, color: "#FF8A50" },
    { value: 10, color: "#4A3020" },
  ];

  const CX = 55, CY = 55, R = 42, SW = 14;

  const lineD = buildLinePath(salesData, CHART_W - 32, CHART_H - 20);
  const areaD = buildAreaPath(salesData, CHART_W - 32, CHART_H - 20);
  const revPaths = buildDonutPath(revenueSegments, CX, CY, R);
  const audPaths = buildDonutPath(audienceSegments, CX, CY, R);

  const norm = normalise(salesData);
  const step = (CHART_W - 32) / (norm.length - 1);
  const lastX = (norm.length - 1) * step;
  const lastY = CHART_H - 20 - 12 - norm[norm.length - 1] * (CHART_H - 20 - 24);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerStudio, { color: "#FF6B00" }]}>CREATOR STUDIO</Text>
        </View>
        <Pressable style={[styles.notifBtn, { backgroundColor: colors.muted }]}>
          <Feather name="bell" size={16} color={colors.foreground} />
          <View style={[styles.notifDot, { borderColor: colors.background }]} />
        </Pressable>
      </View>

      {/* ── Welcome ── */}
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeText}>
          <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>
            Welcome back, {firstName}
          </Text>
          <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>
            Here's what's happening with your events
          </Text>
        </View>
        <Pressable
          style={styles.createBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/create-event");
          }}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.createBtnText}>Create Event</Text>
        </Pressable>
      </View>

      {/* ── Overview ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
          <View style={[styles.datePill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.datePillText, { color: colors.mutedForeground }]}>Last 8 weeks</Text>
            <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Tickets Sold"
            value={totalSold.toLocaleString()}
            trend={`${Math.round(Math.random() * 15 + 5)}%`}
            trendUp
            icon="tag"
            colors={colors}
          />
          <StatCard
            label="Revenue"
            value={formatRevenue(totalRevenue)}
            trend={`${Math.round(Math.random() * 20 + 5)}%`}
            trendUp
            icon="credit-card"
            colors={colors}
          />
          <StatCard
            label="Active Events"
            value={String(liveCount)}
            trend={`+${liveCount}`}
            trendUp={liveCount > 0}
            icon="calendar"
            colors={colors}
          />
          <StatCard
            label="Page Views"
            value={`${(totalSold * 7).toLocaleString()}`}
            trend="9.3%"
            trendUp
            icon="eye"
            colors={colors}
          />
        </View>
      </View>

      {/* ── Line Chart ── */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Ticket Sales Over Time</Text>
          <View style={[styles.datePill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.datePillText, { color: colors.mutedForeground }]}>Tickets Sold</Text>
            <Feather name="chevron-down" size={11} color={colors.mutedForeground} />
          </View>
        </View>

        <Svg width={CHART_W - 32} height={CHART_H} style={{ alignSelf: "center" }}>
          <Defs>
            <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FF6B00" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#FF6B00" stopOpacity="0.02" />
            </SvgGradient>
          </Defs>
          {/* Area fill */}
          <Path d={areaD} fill="url(#areaGrad)" />
          {/* Line */}
          <Path d={lineD} stroke="#FF6B00" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {norm.map((v, i) => {
            const x = i * step;
            const y = CHART_H - 20 - 12 - v * (CHART_H - 20 - 24);
            return <Circle key={i} cx={x} cy={y} r={3} fill="#FF6B00" />;
          })}
          {/* Last point tooltip */}
          <G>
            <Circle cx={lastX} cy={lastY} r={5} fill="#FF6B00" />
            <Circle cx={lastX} cy={lastY} r={8} fill="#FF6B00" fillOpacity="0.2" />
          </G>
          {/* X labels */}
          {weekLabels.map((label, i) => {
            if (i % 2 !== 0) return null;
            return (
              <SvgText
                key={i}
                x={i * step}
                y={CHART_H - 2}
                fontSize={9}
                fill="#555"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* ── Donut Charts Row ── */}
      <View style={styles.donutRow}>
        {/* Revenue Breakdown */}
        <View style={[styles.donutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground, marginBottom: 12 }]}>Revenue</Text>
          <View style={styles.donutContent}>
            <Svg width={110} height={110}>
              {revPaths.map((d, i) => (
                <Path key={i} d={d} stroke={revenueSegments[i].color} strokeWidth={SW} fill="none" strokeLinecap="round" />
              ))}
              <Circle cx={CX} cy={CY} r={R - SW / 2 - 2} fill={colors.card} />
            </Svg>
            <View style={styles.legend}>
              {[
                { label: "Tickets", pct: "70.7%", color: "#FF6B00" },
                { label: "Merch", pct: "18.4%", color: "#FFA726" },
                { label: "Donations", pct: "9.7%", color: "#FF8A50" },
                { label: "Other", pct: "1.2%", color: "#4A3020" },
              ].map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.legendPct, { color: colors.foreground }]}>{item.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Audience Demographics */}
        <View style={[styles.donutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground, marginBottom: 12 }]}>Audience</Text>
          <View style={styles.donutContent}>
            <Svg width={110} height={110}>
              {audPaths.map((d, i) => (
                <Path key={i} d={d} stroke={audienceSegments[i].color} strokeWidth={SW} fill="none" strokeLinecap="round" />
              ))}
              <Circle cx={CX} cy={CY} r={R - SW / 2 - 2} fill={colors.card} />
              <SvgText x={CX} y={CY - 4} fontSize={16} fontWeight="bold" fill={colors.foreground} textAnchor="middle">
                {totalSold}
              </SvgText>
              <SvgText x={CX} y={CY + 10} fontSize={8} fill="#666" textAnchor="middle">
                Total
              </SvgText>
            </Svg>
            <View style={styles.legend}>
              {[
                { label: "18–24", pct: "28%", color: "#FF6B00" },
                { label: "25–34", pct: "45%", color: "#FFA726" },
                { label: "35–44", pct: "17%", color: "#FF8A50" },
                { label: "45+", pct: "10%", color: "#4A3020" },
              ].map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.legendPct, { color: colors.foreground }]}>{item.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ── Recent Events ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Events</Text>
          <Pressable onPress={() => router.push("/create-event")}>
            <Text style={styles.viewAllText}>View All →</Text>
          </Pressable>
        </View>

        <View style={styles.eventList}>
          {createdEvents.map((ev) => {
            const image = EVENT_IMAGES[ev.category?.toLowerCase?.() === "art" ? "art" : ev.category?.toLowerCase?.() === "food" ? "food" : ev.category?.toLowerCase?.() === "culture" ? "culture" : "concert"];
            const cap = ev.ticketsSold + Math.round(ev.ticketsSold * 0.4);

            return (
              <View
                key={ev.id}
                style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Image source={image} style={styles.eventRowImage} resizeMode="cover" />
                <View style={styles.eventRowInfo}>
                  <Text style={[styles.eventRowTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text style={[styles.eventRowMeta, { color: colors.mutedForeground }]}>
                    {ev.date} · {ev.city}
                  </Text>
                  <View style={styles.eventRowStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            ev.status === "live" ? "#00C853" : ev.status === "ended" ? "#555" : "#FFA726",
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: ev.status === "live" ? "#00C853" : ev.status === "ended" ? "#555" : "#FFA726",
                        },
                      ]}
                    >
                      {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventRowRight}>
                  <Text style={[styles.eventSoldText, { color: colors.foreground }]}>
                    {ev.ticketsSold} / {cap}
                  </Text>
                  <Text style={[styles.eventSoldLabel, { color: colors.mutedForeground }]}>
                    Tickets Sold
                  </Text>
                </View>
                <Feather name="more-vertical" size={18} color={colors.mutedForeground} />
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 0 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerStudio: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B00",
    borderWidth: 1.5,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  welcomeText: { flex: 1 },
  welcomeTitle: { fontSize: 22, fontWeight: "900" },
  welcomeSub: { fontSize: 12, marginTop: 2 },
  createBtn: {
    backgroundColor: "#FF6B00",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  createBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  viewAllText: { color: "#FF6B00", fontSize: 13, fontWeight: "700" },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  datePillText: { fontSize: 11, fontWeight: "600" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chartCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  chartTitle: { fontSize: 14, fontWeight: "800" },

  donutRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  donutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  donutContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  legend: { flex: 1, gap: 5 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 9 },
  legendPct: { fontSize: 9, fontWeight: "700" },

  eventList: { gap: 10 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  eventRowImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  eventRowInfo: { flex: 1, gap: 2 },
  eventRowTitle: { fontSize: 13, fontWeight: "700" },
  eventRowMeta: { fontSize: 10 },
  eventRowStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "600" },
  eventRowRight: { alignItems: "flex-end" },
  eventSoldText: { fontSize: 13, fontWeight: "800" },
  eventSoldLabel: { fontSize: 9 },
});
