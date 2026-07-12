import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert } from "@/lib/alert";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportMyData, useDeleteMyAccount } from "@workspace/api-client-react";

export default function PrivacyDataScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken, clearAuth } = useApp();
  const [exporting, setExporting] = useState(false);
  const deleteAccount = useDeleteMyAccount();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportMyData();
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kultr-hub-my-data.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: "My Kultr Hub data", message: json });
      }
    } catch (e) {
      Alert.alert(
        "Export failed",
        e instanceof Error ? e.message : "Could not prepare your data. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, tickets and rewards. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteAccount.mutate(undefined, {
              onSuccess: async () => {
                await clearAuth();
                Alert.alert("Account deleted", "Your account and data have been removed.");
                router.replace("/");
              },
              onError: (err: unknown) => {
                // Prefer the server's friendly body message (e.g. the
                // "events have attendees" guard) over the raw HTTP string.
                const data =
                  err && typeof err === "object" && "data" in err
                    ? (err as { data: unknown }).data
                    : null;
                const message =
                  data && typeof data === "object" && "message" in data
                    ? String((data as { message: unknown }).message)
                    : "Could not delete your account. Please try again.";
                Alert.alert("Couldn't delete account", message);
              },
            });
          },
        },
      ],
    );
  };

  const rows: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    sub: string;
    onPress: () => void;
    tint?: string;
    busy?: boolean;
  }[] = [
    {
      icon: "file-text",
      label: "Privacy Policy",
      sub: "How we collect and protect your data",
      onPress: () => router.push("/legal/privacy"),
    },
    {
      icon: "book-open",
      label: "Terms of Service",
      sub: "The rules for using Kultr Hub",
      onPress: () => router.push("/legal/terms"),
    },
  ];

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy & Data</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={r.onPress}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            style={({ pressed }) => [
              styles.row,
              {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: pressed ? colors.muted : "transparent",
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
              <Feather name={r.icon} size={16} color="#FF6B00" />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{r.label}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{r.sub}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}

        {/* Export — requires sign-in */}
        <Pressable
          onPress={() => (authToken ? handleExport() : router.push("/login"))}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityLabel="Download my data"
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.muted : "transparent", opacity: exporting ? 0.6 : 1 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
            <Feather name="download" size={16} color="#FF6B00" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Download my data</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {authToken ? "Export a copy of everything we hold" : "Sign in to export your data"}
            </Text>
          </View>
          {exporting ? (
            <ActivityIndicator size="small" color="#FF6B00" />
          ) : (
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          )}
        </Pressable>
      </View>

      {/* Danger zone — only when signed in */}
      {authToken ? (
        <Pressable
          onPress={confirmDelete}
          disabled={deleteAccount.isPending}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          style={[styles.deleteBtn, { borderColor: "#D32F2F", opacity: deleteAccount.isPending ? 0.6 : 1 }]}
        >
          {deleteAccount.isPending ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <Feather name="trash-2" size={16} color="#D32F2F" />
          )}
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
        You can access, export or delete your data at any time under Kenya's Data Protection Act,
        Nigeria's NDPR, POPIA and GDPR.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  deleteBtn: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  deleteText: { color: "#D32F2F", fontSize: 15, fontWeight: "600" },
  footnote: { fontSize: 11, lineHeight: 17, textAlign: "center" },
});
