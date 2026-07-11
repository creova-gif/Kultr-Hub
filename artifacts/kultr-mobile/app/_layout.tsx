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
import React, { useEffect } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";

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
  const { onboardingDone, isRTL } = useApp();

  I18nManager.allowRTL(true);

  React.useEffect(() => {
    if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [onboardingDone]);

  React.useEffect(() => {
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary onError={(error) => Sentry.captureException(error)}>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
