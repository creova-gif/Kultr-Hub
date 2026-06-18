import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EA_COUNTRIES, getCountryByCurrency, type EACountry } from "@/constants/currencies";
import type { Language } from "@/constants/translations";
import { setAuthTokenGetter, useGetCreatorAnalytics, getGetCreatorAnalyticsQueryKey, type CreatedEventStats } from "@workspace/api-client-react";

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
  status: "draft" | "live" | "ended";
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string;
  isCreator: boolean;
}

interface AppContextType {
  tickets: PurchasedTicket[];
  savedEvents: string[];
  userCountry: EACountry;
  onboardingDone: boolean;
  userInterests: string[];
  createdEvents: CreatedEvent[];
  authToken: string | null;
  authUser: AuthUser | null;
  language: Language;
  lowBandwidth: boolean;
  addTicket: (ticket: PurchasedTicket) => void;
  toggleSaved: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
  setUserCountry: (country: EACountry) => void;
  setOnboardingDone: (done: boolean) => void;
  setUserInterests: (interests: string[]) => void;
  addCreatedEvent: (event: CreatedEvent) => void;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setLowBandwidth: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_COUNTRY = EA_COUNTRIES.find((c) => c.code === "KE")!;

const DEMO_CREATED_EVENTS: CreatedEvent[] = [
  {
    id: "ce-001",
    title: "Nairobi Jazz Collective",
    category: "Music",
    date: "2026-07-20",
    time: "19:00",
    venue: "Sankara Nairobi",
    city: "Nairobi",
    price: 2500,
    currency: "KES",
    currencySymbol: "KSh",
    description: "An intimate evening of East African jazz.",
    ticketsSold: 142,
    revenue: 355000,
    status: "live",
    createdAt: "2026-05-01",
  },
];

const TOKEN_KEY = "kultr_auth_token";

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
    status: stat.status as "draft" | "live" | "ended",
    createdAt: date,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<PurchasedTicket[]>([
    {
      id: "ticket-demo-001",
      eventId: "evt-004",
      ticketTypeId: "t1",
      ticketTypeName: "General Admission",
      ticketNumber: "KTR-98321",
      purchaseDate: "2026-05-10",
      quantity: 1,
      totalPaid: 2000,
      currency: "KES",
      currencySymbol: "KSh",
    },
  ]);
  const [savedEvents, setSavedEvents] = useState<string[]>(["evt-002"]);
  const [userCountry, setUserCountry] = useState<EACountry>(DEFAULT_COUNTRY);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>(DEMO_CREATED_EVENTS);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [lowBandwidth, setLowBandwidth] = useState(false);

  // Fetch creator analytics when authenticated
  const { data: analyticsData } = useGetCreatorAnalytics({
    query: { queryKey: getGetCreatorAnalyticsQueryKey(), enabled: !!authToken },
  });

  React.useEffect(() => {
    if (analyticsData?.events?.length) {
      const adapted = analyticsData.events.map(adaptAnalyticsStat);
      setCreatedEvents(adapted);
    }
  }, [analyticsData]);

  // Register token getter with the API client so every request is authenticated
  React.useEffect(() => {
    setAuthTokenGetter(async () => {
      if (authToken) return authToken;
      return AsyncStorage.getItem(TOKEN_KEY);
    });
    return () => setAuthTokenGetter(null);
  }, [authToken]);

  // Restore persisted token on mount
  React.useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((stored) => {
      if (stored) setAuthToken(stored);
    });
  }, []);

  const setAuth = useCallback(async (token: string, user: AuthUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setAuthUser(user);
  }, []);

  const clearAuth = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setAuthUser(null);
  }, []);

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
        userInterests,
        createdEvents,
        authToken,
        authUser,
        language,
        lowBandwidth,
        addTicket,
        toggleSaved,
        isSaved,
        setUserCountry,
        setOnboardingDone,
        setUserInterests,
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
