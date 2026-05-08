import React, { createContext, useContext, useState } from "react";

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

interface AppContextType {
  tickets: PurchasedTicket[];
  savedEvents: string[];
  addTicket: (ticket: PurchasedTicket) => void;
  toggleSaved: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<PurchasedTicket[]>([
    {
      id: "ticket-demo-001",
      eventId: "evt-004",
      ticketTypeId: "t1",
      ticketTypeName: "General Admission",
      ticketNumber: "KTR-98321",
      purchaseDate: "2025-05-10",
      quantity: 1,
      totalPaid: 2000,
      currency: "KES",
      currencySymbol: "KSh",
    },
  ]);
  const [savedEvents, setSavedEvents] = useState<string[]>(["evt-002"]);

  const addTicket = (ticket: PurchasedTicket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const toggleSaved = (eventId: string) => {
    setSavedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const isSaved = (eventId: string) => savedEvents.includes(eventId);

  return (
    <AppContext.Provider value={{ tickets, savedEvents, addTicket, toggleSaved, isSaved }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
