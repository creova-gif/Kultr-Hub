import { useMemo } from "react";
import { useListEvents } from "@workspace/api-client-react";
import type { EventSummary } from "@workspace/api-client-react";
import { EVENTS, type Event } from "@/constants/data";
import { getCountryByCurrency } from "@/constants/currencies";
import { useApp } from "@/context/AppContext";

const VALID_IMAGE_KEYS = ["concert", "art", "food", "culture"] as const;
type ImageKey = (typeof VALID_IMAGE_KEYS)[number];

function toImageKey(raw: string | null | undefined): ImageKey {
  return VALID_IMAGE_KEYS.includes(raw as ImageKey) ? (raw as ImageKey) : "concert";
}

export function adaptEventSummary(e: EventSummary): Event {
  const iso = e.eventDate ?? "";
  const date = iso.slice(0, 10);
  let time = "19:00";
  if (iso.length > 10) {
    try {
      time = new Date(iso).toISOString().slice(11, 16);
    } catch {
      // keep default
    }
  }
  const currencySymbol = getCountryByCurrency(e.currency)?.currencySymbol ?? e.currency;
  return {
    id: e.id,
    title: e.title,
    subtitle: e.subtitle ?? undefined,
    category: e.category as Event["category"],
    venue: e.venue,
    city: e.city,
    country: e.country,
    date,
    time,
    price: e.minPrice,
    currency: e.currency,
    currencySymbol,
    description: "",
    imageKey: toImageKey(e.imageKey),
    featured: e.featured,
    tags: e.tags ?? undefined,
    ticketTypes: [],
  };
}

export function useEventCatalog() {
  const { lowBandwidth } = useApp();
  const { data, isLoading, isError } = useListEvents({ limit: lowBandwidth ? 20 : 100 });

  const events = useMemo<Event[]>(() => {
    if (!data?.events?.length) return EVENTS;
    try {
      return data.events.map(adaptEventSummary);
    } catch {
      return EVENTS;
    }
  }, [data]);

  const getEventById = useMemo(
    () => (id: string) => events.find((e) => e.id === id),
    [events],
  );

  return { events, getEventById, isLoading, isError };
}
