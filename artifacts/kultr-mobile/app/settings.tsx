import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Language } from "@/constants/translations";

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, lowBandwidth, setLowBandwidth } = useApp();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 12 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LANGUAGE</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {LANGUAGES.map((lang, i) => (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: language === lang.code }}
            accessibilityLabel={`${lang.label} — ${lang.native}`}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomWidth: i < LANGUAGES.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.muted : "transparent",
              },
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{lang.native}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{lang.label}</Text>
            </View>
            {language === lang.code && (
              <Feather name="check" size={18} color="#FF6B00" />
            )}
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
        Arabic uses a right-to-left layout. Changing the language requires restarting the app for the layout to fully apply.
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROGRAMS</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.push("/tribe-leaders")}
          accessibilityRole="button"
          accessibilityLabel="Kultr Tribe Leaders ambassador program"
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.muted : "transparent" },
          ]}
        >
          <View style={[styles.programIcon, { backgroundColor: "rgba(255,107,0,0.12)" }]}>
            <Feather name="flag" size={16} color="#FF6B00" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Kultr Tribe Leaders</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Ambassador program — lead & earn
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONNECTIVITY</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Data Saver Mode</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Loads fewer events for slow connections
            </Text>
          </View>
          <Switch
            value={lowBandwidth}
            onValueChange={setLowBandwidth}
            trackColor={{ false: "#333", true: "#FF6B00" }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  programIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  footnote: { fontSize: 11, lineHeight: 17, textAlign: "center", marginBottom: 16 },
});
