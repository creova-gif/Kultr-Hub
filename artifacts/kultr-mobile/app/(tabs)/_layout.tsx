import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const TABS = [
  { name: "index", label: "Home", icon: "home" },
  { name: "discover", label: "Discover", icon: "compass" },
  { name: "tickets", label: "Tickets", icon: "tag" },
  { name: "profile", label: "Profile", icon: "user" },
] as const;

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const bottomOffset = Platform.OS === "web"
    ? Math.max(insets.bottom, 20) + 8
    : insets.bottom + 8;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      {/* Glow behind pill */}
      <View style={styles.glow} />

      <View style={[styles.pill, { backgroundColor: "#1A1A1A" }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = TABS[index];
          if (!tab) return null;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name, {});
                }
              }}
              style={[styles.tabItem, focused && styles.tabItemActive]}
            >
              {focused ? (
                <View style={styles.activeContent}>
                  <View style={styles.activeIconWrap}>
                    <Feather name={tab.icon} size={15} color="#FF6B00" />
                  </View>
                  <Text style={styles.activeLabel}>{tab.label}</Text>
                </View>
              ) : (
                <View style={styles.inactiveContent}>
                  <Feather name={tab.icon} size={22} color="#555" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const PILL_WIDTH = Math.min(width - 40, 360);

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  glow: {
    position: "absolute",
    width: PILL_WIDTH,
    height: 60,
    borderRadius: 40,
    backgroundColor: "#FF6B00",
    opacity: 0.12,
    top: 2,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 0,
  },
  pill: {
    width: PILL_WIDTH,
    height: 62,
    borderRadius: 31,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
  tabItemActive: {
    // handled by inner styles
  },
  activeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,0,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,107,0,0.3)",
  },
  activeIconWrap: {
    // just the icon
  },
  activeLabel: {
    color: "#FF6B00",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  inactiveContent: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
});
