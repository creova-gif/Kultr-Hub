import { useMemo } from "react";
import { useGetEvent } from "@workspace/api-client-react";
import type { EventDetail } from "@workspace/api-client-react";
import { getEventById as getStaticEventById, type Event } from "@/constants/data";
import { getCountryByCurrency } from "@/constants/currencies";
import { adaptEventSummary } from "./useEventCatalog";

export function adaptEventDetail(e: EventDetail): Event {
  const base = adaptEventSummary(e);
  const currencySymbol = getCountryByCurrency(e.currency)?.currencySymbol ?? e.currency;
  return {
    ...base,
    description: e.description,
    capacity: e.capacity ?? undefined,
    latitude: e.latitude ?? undefined,
    longitude: e.longitude ?? undefined,
    currencySymbol,
    ticketTypes: e.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description ?? undefined,
      price: tt.price,
      available: tt.available,
    })),
  };
}

export function useEventDetail(id: string | undefined) {
  const { data, isLoading, isError } = useGetEvent(id ?? "");

  const event = useMemo<Event | undefined>(() => {
    if (data) {
      try {
        return adaptEventDetail(data);
      } catch {
        return getStaticEventById(id ?? "");
      }
    }
    // While loading or on error, fall back to static constants
    return getStaticEventById(id ?? "");
  }, [data, id]);

  return { event, isLoading, isError };
}
