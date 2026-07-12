import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Tabs } from "expo-router";
import React from "react";
import {
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

// "Home" routes to index.tsx — the richer category-browsing screen (Featured
// carousel + category pills + bento grid). It previously routed to foryou.tsx,
// which left the real home screen reachable only once, right after onboarding.
// foryou.tsx keeps its own file/route, it's just no longer wired into the tab
// bar's "Home" slot (see Tabs.Screen below).
const LEFT_TABS = [
  { name: "index",    label: "Home",     icon: "home"           },
  { name: "discover", label: "Discover", icon: "compass"        },
] as const;

const RIGHT_TABS = [
  { name: "tickets",  label: "Tickets",  icon: "tag"            },
  { name: "social",   label: "Messages", icon: "message-circle" },
  { name: "profile",  label: "Profile",  icon: "user"           },
] as const;

const BAR_HEIGHT = 64;
const FAB_SIZE   = 54;
const FAB_LIFT   = 14; // how far the FAB rises above the bar top

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

function TabBar({ state, navigation }: TabBarProps) {
  const insets  = useSafeAreaInsets();
  const { isRTL } = useApp();
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 20) : insets.bottom;
  const activeRoute = state.routes[state.index]?.name;

  const pressTab = (name: string) => {
    const route = state.routes.find((r: { name: string }) => r.name === name);
    if (!route) return;
    const focused = activeRoute === name;
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      Haptics.selectionAsync();
      navigation.navigate(name, {});
    }
  };

  const renderTab = (tab: { name: string; label: string; icon: string }) => {
    const focused = activeRoute === tab.name;
    // Inactive-tab gray measured ~4.52:1 on the #0D0D0D tab bar — right at
    // the WCAG AA edge. #A0A0A0 (the app's mutedForeground token) clears it
    // comfortably at ~6.6:1.
    const tint = focused ? "#FF6B00" : "#A0A0A0";
    return (
      <Pressable
        key={tab.name}
        onPress={() => pressTab(tab.name)}
        style={styles.tabItem}
        accessibilityLabel={tab.label}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
      >
        <Feather name={tab.icon as any} size={22} color={tint} />
        <Text style={[styles.tabLabel, { color: tint }]}>{tab.label}</Text>
        {focused && <View style={styles.activeDot} />}
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      {/* Subtle top border line */}
      <View style={styles.topBorder} />

      {/* Tab row sits at BAR_HEIGHT; FAB lifts above it */}
      <View style={[styles.row, { height: BAR_HEIGHT, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Left side tabs */}
        <View style={styles.side}>
          {LEFT_TABS.map(renderTab)}
        </View>

        {/* Center FAB — raised above the bar */}
        <View style={[styles.fabWrap, { marginTop: -FAB_LIFT }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/create-event" as any);
            }}
            style={styles.fab}
            accessibilityLabel="Create event"
            accessibilityRole="button"
          >
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Right side tabs */}
        <View style={styles.side}>
          {RIGHT_TABS.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: "Home"     }} />
      <Tabs.Screen name="foryou"   options={{ href: null        }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="social"   options={{ title: "Messages" }} />
      <Tabs.Screen name="tickets"  options={{ title: "Tickets"  }} />
      <Tabs.Screen name="profile"  options={{ title: "Profile"  }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0D0D0D",
    width: "100%",
    overflow: "visible",
  },
  topBorder: {
    height: 1,
    backgroundColor: "#1E1E1E",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",  // tabs anchor to bottom; FAB lifts via negative marginTop
    overflow: "visible",
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: "100%",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  activeDot: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF6B00",
  },
  fabWrap: {
    width: FAB_SIZE + 16,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
    overflow: "visible",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0D0D0D",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 14,
  },
});
