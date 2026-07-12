import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { I18nManager, Platform } from "react-native";
import { Alert } from "@/lib/alert";
import { EA_COUNTRIES, getCountryByCurrency, type EACountry } from "@/constants/currencies";
import type { Language } from "@/constants/translations";
import { setAuthTokenGetter, useGetCreatorAnalytics, getGetCreatorAnalyticsQueryKey, useAuthLogout, type CreatedEventStats } from "@workspace/api-client-react";

export interface PurchasedTicket {
  id: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketNumber: string;
  purchaseDate: string;
  quantity: number;
  totalPaid: number;
  currency: string;
  currencySymbol: string;
}

export interface CreatedEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  currency: string;
  currencySymbol: string;
  description: string;
  ticketsSold: number;
  revenue: number;
  status: "draft" | "pending_review" | "live" | "ended" | "cancelled";
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string;
  isCreator: boolean;
  isAdmin: boolean;
}

interface AppContextType {
  tickets: PurchasedTicket[];
  savedEvents: string[];
  userCountry: EACountry;
  onboardingDone: boolean;
  isHydrated: boolean;
  userInterests: string[];
  createdEvents: CreatedEvent[];
  authToken: string | null;
  authUser: AuthUser | null;
  language: Language;
  isRTL: boolean;
  lowBandwidth: boolean;
  addTicket: (ticket: PurchasedTicket) => void;
  toggleSaved: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
  setUserCountry: (country: EACountry) => void;
  setOnboardingDone: (done: boolean) => Promise<void>;
  setUserInterests: (interests: string[]) => Promise<void>;
  addCreatedEvent: (event: CreatedEvent) => void;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setLowBandwidth: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_COUNTRY = EA_COUNTRIES.find((c) => c.code === "KE")!;

const TOKEN_KEY = "kultr_auth_token";
const USER_KEY = "kultr_auth_user";
const LANG_KEY = "kultr_language";
const ONBOARDING_KEY = "kultr_onboarding_done";
const INTERESTS_KEY = "kultr_user_interests";
const TICKETS_KEY = "kultr_tickets";

// The auth token is the one piece of state worth OS keychain/keystore
// protection; SecureStore has no web equivalent, so web keeps AsyncStorage.
const tokenStorage = {
  getItem: (key: string): Promise<string | null> =>
    Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    Platform.OS === "web" ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> =>
    Platform.OS === "web" ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

function adaptAnalyticsStat(stat: CreatedEventStats): CreatedEvent {
  const date = stat.eventDate.slice(0, 10);
  const time = stat.eventDate.length > 10 ? new Date(stat.eventDate).toISOString().slice(11, 16) : "19:00";
  const currencySymbol = getCountryByCurrency(stat.currency)?.currencySymbol ?? stat.currency;
  return {
    id: stat.id,
    title: stat.title,
    category: stat.category,
    date,
    time,
    venue: stat.venue,
    city: stat.city,
    price: 0,
    currency: stat.currency,
    currencySymbol,
    description: "",
    ticketsSold: stat.ticketsSold,
    revenue: stat.revenue,
    status: stat.status as "draft" | "pending_review" | "live" | "ended" | "cancelled",
    createdAt: date,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Real accounts start with no tickets, no saved events, and no created
  // events — these used to default to hardcoded demo records, which meant
  // every brand-new user saw a ticket they never bought and a creator
  // dashboard reporting someone else's revenue as their own.
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [userCountry, setUserCountry] = useState<EACountry>(DEFAULT_COUNTRY);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [language, setLanguageState] = useState<Language>("en");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  // False until every persisted key below has been read at least once.
  // Screens (and the root redirect guard) must not make decisions off
  // onboardingDone/authToken/etc. before this flips true, or a brand-new
  // reload/deep-link race can bounce an already-onboarded, already-signed-in
  // user back through onboarding.
  const [isHydrated, setIsHydrated] = useState(false);

  // Fetch creator analytics when authenticated
  const { data: analyticsData } = useGetCreatorAnalytics({
    query: { queryKey: getGetCreatorAnalyticsQueryKey(), enabled: !!authToken },
  });

  React.useEffect(() => {
    if (analyticsData?.events) {
      setCreatedEvents(analyticsData.events.map(adaptAnalyticsStat));
    }
  }, [analyticsData]);

  const authLogoutMutation = useAuthLogout();

  // Register token getter with the API client so every request is authenticated
  React.useEffect(() => {
    setAuthTokenGetter(async () => {
      if (authToken) return authToken;
      return tokenStorage.getItem(TOKEN_KEY);
    });
    return () => setAuthTokenGetter(null);
  }, [authToken]);

  // Restore persisted token + language + onboarding state on mount
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      tokenStorage.getItem(TOKEN_KEY).then((stored) => {
        if (stored) setAuthToken(stored);
      }),
      AsyncStorage.getItem(USER_KEY).then((stored) => {
        if (stored) {
          try { setAuthUser(JSON.parse(stored) as AuthUser); } catch { /* ignore corrupt data */ }
        }
      }),
      AsyncStorage.getItem(LANG_KEY).then((stored) => {
        if (stored && ["en", "fr", "sw", "ar"].includes(stored)) {
          const lang = stored as Language;
          setLanguageState(lang);
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(lang === "ar");
        }
      }),
      AsyncStorage.getItem(ONBOARDING_KEY).then((stored) => {
        if (stored === "true") setOnboardingDone(true);
      }),
      AsyncStorage.getItem(INTERESTS_KEY).then((stored) => {
        if (stored) {
          try { setUserInterests(JSON.parse(stored)); } catch { /* ignore corrupt data */ }
        }
      }),
      AsyncStorage.getItem(TICKETS_KEY).then((stored) => {
        if (stored) {
          try { setTickets(JSON.parse(stored) as PurchasedTicket[]); } catch { /* ignore corrupt data */ }
        }
      }),
    ]).finally(() => {
      if (!cancelled) setIsHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  const isRTL = language === "ar";

  const setLanguage = useCallback(async (lang: Language) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
    const needsRTLFlip = (lang === "ar") !== I18nManager.isRTL;
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(lang === "ar");
    if (needsRTLFlip) {
      Alert.alert(
        lang === "ar" ? "إعادة التشغيل مطلوبة" : "Restart required",
        lang === "ar"
          ? "أغلق التطبيق وأعد فتحه لتطبيق تخطيط اليمين إلى اليسار."
          : "Close and reopen the app to apply the new layout direction.",
        [{ text: lang === "ar" ? "حسناً" : "OK" }],
      );
    }
  }, [language]);

  const persistOnboardingDone = useCallback(async (done: boolean) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(done));
    setOnboardingDone(done);
  }, []);

  const persistUserInterests = useCallback(async (interests: string[]) => {
    await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
    setUserInterests(interests);
  }, []);

  const setAuth = useCallback(async (token: string, user: AuthUser) => {
    await tokenStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);
  }, []);

  const clearAuth = useCallback(async () => {
    // Best-effort: revoke the token server-side (bumps tokenVersion, so it
    // can't be replayed) before wiping local state. A logged-out device
    // with no network shouldn't be stuck signed in, so failures here don't
    // block the local sign-out.
    try {
      await authLogoutMutation.mutateAsync();
    } catch {
      /* offline or already revoked — proceed with local sign-out regardless */
    }
    await tokenStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setAuthUser(null);
    // Clear account-scoped local state so a different account signing in
    // on the same device never sees the previous user's data merged in.
    setTickets([]);
    setSavedEvents([]);
    setCreatedEvents([]);
  }, [authLogoutMutation]);

  // Persist tickets whenever they change
  React.useEffect(() => {
    AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const addTicket = (ticket: PurchasedTicket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const toggleSaved = (eventId: string) => {
    setSavedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const isSaved = (eventId: string) => savedEvents.includes(eventId);

  const addCreatedEvent = (event: CreatedEvent) => {
    setCreatedEvents((prev) => [event, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        tickets,
        savedEvents,
        userCountry,
        onboardingDone,
        isHydrated,
        userInterests,
        createdEvents,
        authToken,
        authUser,
        language,
        isRTL,
        lowBandwidth,
        addTicket,
        toggleSaved,
        isSaved,
        setUserCountry,
        setOnboardingDone: persistOnboardingDone,
        setUserInterests: persistUserInterests,
        addCreatedEvent,
        setAuth,
        clearAuth,
        setLanguage,
        setLowBandwidth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
