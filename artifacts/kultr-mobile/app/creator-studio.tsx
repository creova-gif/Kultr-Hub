import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
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
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop, Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { EVENT_IMAGES } from "@/constants/data";
import { useGetCreatorAnalytics, getGetCreatorAnalyticsQueryKey } from "@workspace/api-client-react";

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

// ── Bar Chart ────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}

function BarChart({ data, color, height = 120 }: BarChartProps) {
  const colors = useColors();
  const barChartWidth = Dimensions.get("window").width - 64; // 16px margins each side + 16 card padding
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.floor((barChartWidth - 20) / data.length) - 6;
  const chartHeight = height - 24; // leave room for labels

  return (
    <Svg width={barChartWidth} height={height}>
      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = chartHeight * (1 - fraction);
        return (
          <Line
            key={fraction}
            x1={0}
            y1={y}
            x2={barChartWidth}
            y2={y}
            stroke={colors.border}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        );
      })}
      {/* Bars */}
      {data.map((item, i) => {
        const barHeight = Math.max(4, (item.value / max) * chartHeight);
        const x = i * (barWidth + 6) + 3;
        const y = chartHeight - barHeight;
        return (
          <G key={item.label}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={color}
              opacity={0.85}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 2}
              fontSize={9}
              fill={colors.mutedForeground}
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
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
  const { authUser, authToken, createdEvents, userCountry } = useApp();

  const { data: analytics } = useGetCreatorAnalytics({
    query: { queryKey: getGetCreatorAnalyticsQueryKey(), enabled: !!authToken },
  });

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

  // Real weekly ticket sales for the last 8 weeks, from actual purchase
  // timestamps — GET /events/creator/analytics zero-fills weeks with no sales.
  // Fall back to 8 zero-value weeks (not fewer/more points) while loading, so
  // the chart's line-building math never divides by a zero-length span.
  const hasWeeklySales = (analytics?.weeklySales.length ?? 0) > 0;
  const weeklySales = hasWeeklySales
    ? analytics!.weeklySales
    : Array.from({ length: 8 }, () => ({ weekStart: "", ticketsSold: 0 }));
  const salesData = weeklySales.map((w) => w.ticketsSold);
  const weekLabels = weeklySales.map((w) =>
    hasWeeklySales ? new Date(w.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
  );

  // Real per-city ticket sales, replacing what used to be a fabricated
  // age-bracket "Audience" donut — no such demographic data exists anywhere
  // in the schema to compute one from.
  const salesByCity = analytics?.salesByCity ?? [];

  const lineD = buildLinePath(salesData, CHART_W - 32, CHART_H - 20);
  const areaD = buildAreaPath(salesData, CHART_W - 32, CHART_H - 20);

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
            trend="—"
            trendUp
            icon="tag"
            colors={colors}
          />
          <StatCard
            label="Revenue"
            value={formatRevenue(totalRevenue)}
            trend="—"
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
            label="Avg. Ticket Price"
            value={totalSold > 0 ? formatRevenue(Math.round(totalRevenue / totalSold)) : formatRevenue(0)}
            trend="—"
            trendUp
            icon="tag"
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

      {/* ── Sales by City ── */}
      {/* Real per-city ticket sales. The "Revenue" and "Audience" donuts this
          screen used to show here were fabricated — a fixed 70.7/18.4/9.7/1.2%
          split with no basis in any real revenue category, and a hardcoded
          age-bracket breakdown for which no demographic data is ever captured
          anywhere in the schema. City-of-event is real and meaningful. */}
      {salesByCity.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>Sales by City</Text>
          </View>
          <BarChart
            data={salesByCity.map((c) => ({ label: c.city.slice(0, 8), value: c.ticketsSold }))}
            color="#FF6B00"
          />
          <View style={styles.chartLegend}>
            <View style={[styles.chartLegendDot, { backgroundColor: "#FF6B00" }]} />
            <Text style={[styles.chartLegendText, { color: colors.mutedForeground }]}>Tickets sold per city</Text>
          </View>
        </View>
      )}

      {/* ── Revenue Chart ── */}
      {createdEvents.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>Revenue by Event</Text>
            <View style={[styles.chartBadge, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
              <Text style={{ color: "#FF6B00", fontSize: 10, fontWeight: "700" }}>LIVE</Text>
            </View>
          </View>
          <BarChart
            data={createdEvents.slice(0, 6).map((e) => ({
              label: e.title.split(" ")[0].slice(0, 6),
              value: e.revenue,
            }))}
            color="#FF6B00"
          />
          <View style={styles.chartLegend}>
            <View style={[styles.chartLegendDot, { backgroundColor: "#FF6B00" }]} />
            <Text style={[styles.chartLegendText, { color: colors.mutedForeground }]}>
              Revenue ({createdEvents[0]?.currency ?? "KES"})
            </Text>
          </View>
        </View>
      )}

      {/* ── Tickets Sold Chart ── */}
      {createdEvents.length > 0 && (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>Tickets Sold</Text>
          </View>
          <BarChart
            data={createdEvents.slice(0, 6).map((e) => ({
              label: e.title.split(" ")[0].slice(0, 6),
              value: e.ticketsSold,
            }))}
            color="#7B61FF"
            height={100}
          />
          <View style={styles.chartLegend}>
            <View style={[styles.chartLegendDot, { backgroundColor: "#7B61FF" }]} />
            <Text style={[styles.chartLegendText, { color: colors.mutedForeground }]}>Tickets sold per event</Text>
          </View>
        </View>
      )}

      {/* ── Recent Events ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Events</Text>
          <View>
            <Text style={styles.viewAllText}>All Events</Text>
          </View>
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
  chartBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  chartLegendDot: { width: 8, height: 8, borderRadius: 4 },
  chartLegendText: { fontSize: 11 },

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
