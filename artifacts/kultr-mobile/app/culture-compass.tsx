import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCardCompact } from "@/components/EventCardCompact";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useEventCatalog } from "@/hooks/useEventCatalog";
import { EA_COUNTRIES } from "@/constants/currencies";

const { width } = Dimensions.get("window");
const MAP_W = width - 32;
const MAP_H = 260;

// ── Stylised city map pins ────────────────────────────────────────────────────

interface EventPin {
  x: number;
  y: number;
  label: string;
  icon: string;
}

const CITY_PINS: Record<string, EventPin[]> = {
  KE: [
    { x: 0.52, y: 0.35, label: "Art Exhibition", icon: "image" },
    { x: 0.38, y: 0.55, label: "Cultural Festival", icon: "users" },
    { x: 0.63, y: 0.25, label: "Live Music Tonight", icon: "music" },
    { x: 0.72, y: 0.6, label: "Heritage Walk", icon: "globe" },
    { x: 0.45, y: 0.7, label: "Food Experience", icon: "coffee" },
  ],
  NG: [
    { x: 0.48, y: 0.32, label: "Afrobeats Night", icon: "music" },
    { x: 0.62, y: 0.52, label: "Art Fair", icon: "image" },
    { x: 0.33, y: 0.6, label: "Street Food", icon: "coffee" },
    { x: 0.7, y: 0.38, label: "Comedy Show", icon: "smile" },
  ],
  GH: [
    { x: 0.5, y: 0.4, label: "Highlife Concert", icon: "music" },
    { x: 0.35, y: 0.58, label: "Craft Market", icon: "shopping-bag" },
    { x: 0.67, y: 0.3, label: "Film Festival", icon: "film" },
  ],
  UG: [
    { x: 0.45, y: 0.45, label: "Jazz Night", icon: "music" },
    { x: 0.6, y: 0.35, label: "Art Walk", icon: "image" },
    { x: 0.38, y: 0.65, label: "Cultural Fair", icon: "globe" },
  ],
  TZ: [
    { x: 0.5, y: 0.42, label: "Bongo Flava Fest", icon: "music" },
    { x: 0.64, y: 0.55, label: "Food & Culture", icon: "coffee" },
    { x: 0.36, y: 0.3, label: "Art Expo", icon: "image" },
  ],
};

const DEFAULT_PINS: EventPin[] = [
  { x: 0.5, y: 0.38, label: "Live Event", icon: "music" },
  { x: 0.35, y: 0.55, label: "Cultural Show", icon: "globe" },
  { x: 0.67, y: 0.6, label: "Food Festival", icon: "coffee" },
];

// ── Stylised city SVG map ────────────────────────────────────────────────────

interface CityMapProps {
  pins: EventPin[];
  cityName: string;
}

function CityMap({ pins, cityName }: CityMapProps) {
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;

  return (
    <Svg width={MAP_W} height={MAP_H}>
      {/* Background */}
      <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#0D0D0D" />

      {/* Outer ring glow */}
      <Circle cx={cx} cy={cy} r={115} stroke="#FF6B00" strokeWidth={0.5} strokeOpacity={0.15} fill="none" />
      <Circle cx={cx} cy={cy} r={85} stroke="#FF6B00" strokeWidth={0.3} strokeOpacity={0.1} fill="none" />
      <Circle cx={cx} cy={cy} r={55} stroke="#FF6B00" strokeWidth={0.2} strokeOpacity={0.08} fill="none" />

      {/* Street grid — horizontal lines */}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = (MAP_H / 9) * (i + 1);
        return <Line key={`h${i}`} x1={0} y1={y} x2={MAP_W} y2={y} stroke="#1C1C1C" strokeWidth={0.8} />;
      })}
      {/* Street grid — vertical lines */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = (MAP_W / 8) * (i + 1);
        return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={MAP_H} stroke="#1C1C1C" strokeWidth={0.8} />;
      })}

      {/* Radial roads */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x2 = cx + Math.cos(rad) * 160;
        const y2 = cy + Math.sin(rad) * 160;
        return (
          <Line
            key={`r${deg}`}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke="#222"
            strokeWidth={1.5}
          />
        );
      })}

      {/* CBD centre area */}
      <Circle cx={cx} cy={cy} r={20} fill="#161606" stroke="#FF6B0020" strokeWidth={1} />

      {/* City name */}
      <SvgText x={cx} y={cy + 5} fontSize={7} fill="#FF6B0055" textAnchor="middle" fontWeight="bold">
        {cityName.toUpperCase()}
      </SvgText>

      {/* Event pins */}
      {pins.map((pin, i) => {
        const px = pin.x * MAP_W;
        const py = pin.y * MAP_H;
        const isPrimary = i === 0;

        return (
          <G key={i}>
            {/* Outer glow */}
            <Circle cx={px} cy={py} r={isPrimary ? 22 : 18} fill="#FF6B00" fillOpacity={isPrimary ? 0.08 : 0.05} />
            {/* Pin circle */}
            <Circle cx={px} cy={py} r={isPrimary ? 14 : 11} fill="#FF6B00" fillOpacity={isPrimary ? 0.25 : 0.15} stroke="#FF6B00" strokeWidth={1} strokeOpacity={0.6} />
            <Circle cx={px} cy={py} r={isPrimary ? 6 : 5} fill="#FF6B00" />
            {/* Label bg */}
            <Rect
              x={px + 16}
              y={py - 10}
              width={pin.label.length * 5.2 + 8}
              height={20}
              rx={4}
              fill="#1A1A1A"
              stroke="#2A2A2A"
              strokeWidth={0.5}
            />
            <SvgText x={px + 20} y={py + 3} fontSize={8} fill="#E0E0E0" fontWeight="600">
              {pin.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = ["For You", "Music", "Art", "Food", "Heritage", "More"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export default function CultureCompassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userCountry, setUserCountry } = useApp();
  const [selectedCat, setSelectedCat] = useState<CategoryFilter>("For You");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const { events } = useEventCatalog();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 44) : insets.top;

  const pins = CITY_PINS[userCountry.code] ?? DEFAULT_PINS;
  const cityName = userCountry.name.split(" ")[0]; // "Nairobi" from "Nairobi CBD"

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (selectedCat === "For You" || selectedCat === "More") return true;
      return e.category === selectedCat;
    });
  }, [events, selectedCat]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Culture{" "}
              <Text style={{ color: "#FF6B00" }}>Compass</Text>
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowCityPicker((v) => !v);
              }}
              style={styles.citySelector}
            >
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.citySelectorText, { color: colors.mutedForeground }]}>
                {userCountry.name}
              </Text>
              <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Pressable style={[styles.filterBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="sliders" size={14} color={colors.mutedForeground} />
            <Text style={[styles.filterBtnText, { color: colors.mutedForeground }]}>Filters</Text>
          </Pressable>
        </View>

        {/* ── City Picker Dropdown ── */}
        {showCityPicker && (
          <ScrollView
            style={[styles.cityDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
            nestedScrollEnabled
          >
            {EA_COUNTRIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUserCountry(c);
                  setShowCityPicker(false);
                }}
                style={[
                  styles.cityOption,
                  {
                    backgroundColor: c.code === userCountry.code ? "rgba(255,107,0,0.1)" : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                <Text style={[styles.cityOptionName, { color: colors.foreground }]}>{c.name}</Text>
                {c.code === userCountry.code && (
                  <Feather name="check" size={14} color="#FF6B00" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── City Map ── */}
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          <CityMap pins={pins} cityName={cityName} />
          {/* Location button overlay */}
          <Pressable
            style={[styles.locateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Haptics.selectionAsync()}
          >
            <Feather name="navigation" size={16} color="#FF6B00" />
          </Pressable>
        </View>

        {/* ── Category Filters ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScrollContent}
          style={styles.catScroll}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const active = selectedCat === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCat(cat);
                }}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: active ? "#FF6B00" : colors.muted,
                    borderColor: active ? "#FF6B00" : colors.border,
                  },
                ]}
              >
                {cat === "For You" && (
                  <Feather name="zap" size={12} color={active ? "#fff" : colors.mutedForeground} />
                )}
                <Text style={[styles.catChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Event Cards ── */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <Text style={[styles.eventsTitle, { color: colors.foreground }]}>
              {filtered.length} events near you
            </Text>
          </View>

          {/* Horizontal scroll row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScroll}
          >
            {filtered.slice(0, 8).map((event) => (
              <View key={event.id} style={styles.cardWrapper}>
                <EventCardCompact event={event} />
              </View>
            ))}
          </ScrollView>

          {/* Vertical list below */}
          <View style={styles.verticalList}>
            {filtered.slice(8).map((event) => (
              <EventCardCompact key={event.id} event={event} horizontal />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { padding: 4, marginTop: 2 },
  headerCenter: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 22, fontWeight: "900" },
  citySelector: { flexDirection: "row", alignItems: "center", gap: 4 },
  citySelectorText: { fontSize: 13 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
    marginTop: 4,
  },
  filterBtnText: { fontSize: 12, fontWeight: "600" },

  cityDropdown: {
    maxHeight: 200,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  cityOptionName: { flex: 1, fontSize: 14, fontWeight: "600" },

  mapContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
    marginBottom: 16,
  },
  locateBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  catScroll: { marginBottom: 16 },
  catScrollContent: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catChipText: { fontSize: 13, fontWeight: "700" },

  eventsSection: { paddingHorizontal: 16 },
  eventsHeader: { marginBottom: 12 },
  eventsTitle: { fontSize: 15, fontWeight: "700" },
  cardsScroll: { gap: 12, paddingRight: 16 },
  cardWrapper: { width: 200 },
  verticalList: { gap: 10, marginTop: 12 },
});
