import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { AlertHost } from "@/components/AlertHost";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { setBaseUrl } from "@workspace/api-client-react";
import { Sentry } from "@/utils/sentry";

SplashScreen.preventAutoHideAsync();

// Point the API client at the backend server.
// In dev the API server runs on port 3001; in production set EXPO_PUBLIC_API_URL.
const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3001";
setBaseUrl(apiUrl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes; serve stale while revalidating in background.
      staleTime: 5 * 60 * 1000,
      // Retain cached data for 30 minutes so navigating back doesn't flash empty state.
      gcTime: 30 * 60 * 1000,
      // On poor connections, retry up to 2 times with exponential backoff.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      // Serve cached data even when the network request fails (offline/2G resilience).
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

function RootLayoutNav() {
  const { onboardingDone, isHydrated, isRTL } = useApp();

  I18nManager.allowRTL(true);

  // Keep the native splash screen up until persisted state (auth,
  // onboarding flag, etc.) has actually been read — hiding it any earlier
  // is what let a returning, already-onboarded user see a flash of (or get
  // redirected to) the onboarding screen on every cold start.
  React.useEffect(() => {
    if (isHydrated) SplashScreen.hideAsync();
  }, [isHydrated]);

  React.useEffect(() => {
    if (isHydrated && !onboardingDone) {
      router.replace("/onboarding");
    }
  }, [isHydrated, onboardingDone]);

  // Native-only: on web the browser's address bar already *is* the resolved
  // route, so Expo Router's own web URL handling gets you to /event/:id with
  // no help needed. Linking.getInitialURL() on web returns the current page
  // URL (not just a genuine external-launch link), so running this
  // unconditionally meant every direct visit or refresh of an event page
  // triggered a redundant router.push() back to the very route already
  // showing — which never let the stack settle and left the screen blank.
  React.useEffect(() => {
    if (Platform.OS === "web") return;
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path?.startsWith("event/")) {
        const id = parsed.path.replace("event/", "");
        if (id) router.push(`/event/${id}` as any);
      }
    };
    const sub = Linking.addEventListener("url", handleUrl);
    // Handle app opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => sub.remove();
  }, []);

  if (!isHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="checkout/[eventId]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="ticket/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="saved" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="create-event" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="creator-studio" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="culture-compass" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="quests" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="rewards" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="legal/privacy" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="legal/terms" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="privacy-data" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="gamification" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="tribe-leaders" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="vibe-tribes" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

function RootLayoutContent() {
  return (
    <>
      <RootLayoutNav />
      <AlertHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Splash screen is hidden by RootLayoutNav once isHydrated is true, not
  // here — hiding it as soon as fonts load (before persisted auth/onboarding
  // state was read) is what caused the returning-user redirect flash.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary onError={(error) => Sentry.captureException(error)}>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutContent />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
