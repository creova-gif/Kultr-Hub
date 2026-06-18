import { Router } from "express";
import { eq, desc, and, sql, inArray, ilike, or } from "drizzle-orm";
import { db, eventsTable, ticketTypesTable, ticketsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import type { Request, Response } from "express";

const router = Router();

function toEventSummary(event: typeof eventsTable.$inferSelect, ticketTypes: typeof ticketTypesTable.$inferSelect[]) {
  const prices = ticketTypes.map((t) => Number(t.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const currency = ticketTypes[0]?.currency ?? "KES";
  return {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    category: event.category,
    venue: event.venue,
    city: event.city,
    country: event.country,
    countryCode: event.countryCode,
    eventDate: event.eventDate,
    imageUrl: event.imageUrl,
    imageKey: event.imageKey,
    featured: event.featured,
    tags: event.tags,
    minPrice,
    currency,
    status: event.status,
  };
}

router.get("/search", async (req: Request, res: Response) => {
  const { q = "", limit = "20", offset = "0" } = req.query as Record<string, string>;
  const term = `%${q.trim()}%`;

  const conditions = [
    eq(eventsTable.status, "live"),
    or(
      ilike(eventsTable.title, term),
      ilike(eventsTable.city, term),
      ilike(eventsTable.venue, term),
      ilike(eventsTable.country, term),
    ),
  ];

  const [events, [{ count }]] = await Promise.all([
    db.select().from(eventsTable)
      .where(and(...conditions))
      .orderBy(desc(eventsTable.featured), desc(eventsTable.eventDate))
      .limit(parseInt(limit))
      .offset(parseInt(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(and(...conditions)),
  ]);

  const eventIds = events.map((e) => e.id);
  const allTicketTypes = eventIds.length > 0
    ? await db.select().from(ticketTypesTable).where(inArray(ticketTypesTable.eventId, eventIds))
    : [];

  const byEvent = new Map<string, typeof ticketTypesTable.$inferSelect[]>();
  for (const tt of allTicketTypes) {
    const arr = byEvent.get(tt.eventId) ?? [];
    arr.push(tt);
    byEvent.set(tt.eventId, arr);
  }

  res.json({
    events: events.map((e) => toEventSummary(e, byEvent.get(e.id) ?? [])),
    total: count,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.get("/", async (req: Request, res: Response) => {
  const { category, city, countryCode, featured, limit = "20", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(eventsTable.status, "live")];
  if (category) conditions.push(eq(eventsTable.category, category as "Music"));
  if (city) conditions.push(eq(eventsTable.city, city));
  if (countryCode) conditions.push(eq(eventsTable.countryCode, countryCode));
  if (featured === "true") conditions.push(eq(eventsTable.featured, true));

  const [events, [{ count }]] = await Promise.all([
    db.select().from(eventsTable)
      .where(and(...conditions))
      .orderBy(desc(eventsTable.eventDate))
      .limit(parseInt(limit))
      .offset(parseInt(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(and(...conditions)),
  ]);

  const eventIds = events.map((e) => e.id);
  const allTicketTypes = eventIds.length > 0
    ? await db.select().from(ticketTypesTable).where(inArray(ticketTypesTable.eventId, eventIds))
    : [];

  const byEvent = new Map<string, typeof ticketTypesTable.$inferSelect[]>();
  for (const tt of allTicketTypes) {
    const arr = byEvent.get(tt.eventId) ?? [];
    arr.push(tt);
    byEvent.set(tt.eventId, arr);
  }

  res.json({
    events: events.map((e) => toEventSummary(e, byEvent.get(e.id) ?? [])),
    total: count,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

router.get("/creator/me", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const events = await db.select().from(eventsTable)
    .where(eq(eventsTable.creatorId, authed.userId))
    .orderBy(desc(eventsTable.createdAt));

  const eventIds = events.map((e) => e.id);
  const allTicketTypes = eventIds.length > 0
    ? await db.select().from(ticketTypesTable).where(inArray(ticketTypesTable.eventId, eventIds))
    : [];

  const byEvent = new Map<string, typeof ticketTypesTable.$inferSelect[]>();
  for (const tt of allTicketTypes) {
    const arr = byEvent.get(tt.eventId) ?? [];
    arr.push(tt);
    byEvent.set(tt.eventId, arr);
  }

  res.json({
    events: events.map((e) => toEventSummary(e, byEvent.get(e.id) ?? [])),
    total: events.length,
    limit: events.length,
    offset: 0,
  });
});

router.get("/creator/analytics", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;

  const events = await db.select().from(eventsTable)
    .where(eq(eventsTable.creatorId, authed.userId))
    .orderBy(desc(eventsTable.createdAt));

  if (events.length === 0) {
    res.json({ events: [], totalRevenue: 0, totalTicketsSold: 0, liveEvents: 0 });
    return;
  }

  const eventIds = events.map((e) => e.id);

  const salesData = await db
    .select({
      eventId: ticketsTable.eventId,
      ticketsSold: sql<number>`coalesce(sum(${ticketsTable.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${ticketsTable.totalAmount}), 0)`,
    })
    .from(ticketsTable)
    .where(and(inArray(ticketsTable.eventId, eventIds), eq(ticketsTable.status, "confirmed")))
    .groupBy(ticketsTable.eventId);

  const salesMap = new Map(salesData.map((s) => [s.eventId, s]));

  const firstTicketTypes = eventIds.length > 0
    ? await db.select({ eventId: ticketTypesTable.eventId, currency: ticketTypesTable.currency })
        .from(ticketTypesTable)
        .where(inArray(ticketTypesTable.eventId, eventIds))
    : [];
  const currencyMap = new Map<string, string>();
  for (const tt of firstTicketTypes) {
    if (!currencyMap.has(tt.eventId)) currencyMap.set(tt.eventId, tt.currency);
  }

  const eventStats = events.map((event) => {
    const sales = salesMap.get(event.id);
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      eventDate: event.eventDate.toISOString(),
      venue: event.venue,
      city: event.city,
      status: event.status,
      ticketsSold: sales?.ticketsSold ?? 0,
      revenue: Number(sales?.revenue ?? 0),
      currency: currencyMap.get(event.id) ?? "KES",
    };
  });

  const totalRevenue = eventStats.reduce((s, e) => s + e.revenue, 0);
  const totalTicketsSold = eventStats.reduce((s, e) => s + e.ticketsSold, 0);
  const liveEvents = eventStats.filter((e) => e.status === "live").length;

  res.json({ events: eventStats, totalRevenue, totalTicketsSold, liveEvents });
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return;
  }

  const ticketTypes = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.eventId, id));

  res.json({
    ...toEventSummary(event, ticketTypes),
    description: event.description,
    capacity: event.capacity,
    latitude: event.latitude ? Number(event.latitude) : null,
    longitude: event.longitude ? Number(event.longitude) : null,
    creatorId: event.creatorId,
    ticketTypes: ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: Number(tt.price),
      currency: tt.currency,
      available: tt.totalQuantity - tt.soldQuantity,
    })),
  });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const body = req.body as {
    title: string;
    subtitle?: string;
    description: string;
    category: "Music" | "Art" | "Food" | "Heritage" | "Comedy" | "Sports" | "Nightlife";
    venue: string;
    city: string;
    country: string;
    countryCode: string;
    eventDate: string;
    imageUrl?: string;
    capacity?: number;
    tags?: string[];
    ticketTypes: Array<{
      name: string;
      description?: string;
      price: number;
      currency: string;
      totalQuantity: number;
    }>;
  };

  const [event] = await db.insert(eventsTable).values({
    creatorId: authed.userId,
    title: body.title,
    subtitle: body.subtitle,
    description: body.description,
    category: body.category,
    venue: body.venue,
    city: body.city,
    country: body.country,
    countryCode: body.countryCode,
    eventDate: new Date(body.eventDate),
    imageUrl: body.imageUrl,
    capacity: body.capacity,
    tags: body.tags,
    status: "draft",
  }).returning();

  const ticketTypes = await db.insert(ticketTypesTable).values(
    body.ticketTypes.map((tt) => ({
      eventId: event.id,
      name: tt.name,
      description: tt.description,
      price: String(tt.price),
      currency: tt.currency,
      totalQuantity: tt.totalQuantity,
    }))
  ).returning();

  res.status(201).json({
    ...toEventSummary(event, ticketTypes),
    description: event.description,
    capacity: event.capacity,
    latitude: null,
    longitude: null,
    creatorId: event.creatorId,
    ticketTypes: ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: Number(tt.price),
      currency: tt.currency,
      available: tt.totalQuantity,
    })),
  });
});

export default router;
