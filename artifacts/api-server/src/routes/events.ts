import { Router } from "express";
import { eq, desc, and, sql, inArray, ilike, or } from "drizzle-orm";
import { db, eventsTable, ticketTypesTable, ticketsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
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
    res.json({ events: [], totalRevenue: 0, totalTicketsSold: 0, liveEvents: 0, weeklySales: [], salesByCity: [] });
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

  // Real 8-week sales trend from actual purchase timestamps — Creator Studio
  // previously rendered this as a seeded pseudo-random curve. generate_series
  // zero-fills weeks with no sales so the chart doesn't just stop at the last
  // week that happened to have a purchase.
  const weeklySalesResult = await db.execute<{ week_start: Date; tickets_sold: number }>(sql`
    select
      gs.week_start as week_start,
      coalesce(sum(tickets.quantity), 0)::int as tickets_sold
    from generate_series(
      date_trunc('week', now()) - interval '7 weeks',
      date_trunc('week', now()),
      interval '1 week'
    ) as gs(week_start)
    left join tickets
      on date_trunc('week', tickets.purchased_at) = gs.week_start
      and ${inArray(ticketsTable.eventId, eventIds)}
      and tickets.status = 'confirmed'
    group by gs.week_start
    order by gs.week_start
  `);
  const weeklySales = weeklySalesResult.rows.map((r) => ({
    weekStart: new Date(r.week_start).toISOString(),
    ticketsSold: Number(r.tickets_sold),
  }));

  // Real per-city breakdown — replaces the previous fabricated "Audience"
  // age-bracket donut, for which no such data (age, gender, location) is
  // captured anywhere in the schema. City-of-event is real and meaningful.
  const salesByCityRows = await db
    .select({
      city: eventsTable.city,
      ticketsSold: sql<number>`coalesce(sum(${ticketsTable.quantity}), 0)::int`,
    })
    .from(ticketsTable)
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .where(and(inArray(ticketsTable.eventId, eventIds), eq(ticketsTable.status, "confirmed")))
    .groupBy(eventsTable.city)
    .orderBy(sql`coalesce(sum(${ticketsTable.quantity}), 0) desc`)
    .limit(6);
  const salesByCity = salesByCityRows.map((r) => ({ city: r.city, ticketsSold: Number(r.ticketsSold) }));

  res.json({ events: eventStats, totalRevenue, totalTicketsSold, liveEvents, weeklySales, salesByCity });
});

/**
 * GET /api/events/admin/all — every event regardless of status, newest
 * first, so an admin can find something to moderate. Registered before the
 * generic /:id route below so "admin" is never matched as an event id.
 */
router.get("/admin/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { limit = "50", offset = "0" } = req.query as Record<string, string>;

  const [events, [{ count }]] = await Promise.all([
    db.select().from(eventsTable)
      .orderBy(desc(eventsTable.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable),
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
    events: events.map((e) => ({ ...toEventSummary(e, byEvent.get(e.id) ?? []), creatorId: e.creatorId })),
    total: count,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
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

const STATUS_TARGETS = ["live", "cancelled", "ended"] as const;
type StatusTarget = (typeof STATUS_TARGETS)[number];

/**
 * PATCH /api/events/:id/status
 *
 * Before this route existed there was no way for ANY event — including ones
 * created through the app's own create-event flow, which always inserts as
 * "draft" — to ever become publicly visible; only hand-seeded demo data was
 * ever "live". This closes that gap while also closing the broken-access-
 * control one: creators may only move their OWN event, and only through
 * sensible transitions; an admin may force ANY event to cancelled/ended at
 * any time regardless of its current status — the moderation kill-switch a
 * platform with zero organizer verification needs before it can safely
 * accept public event creation.
 */
router.patch("/:id/status", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const id = String(req.params.id);
  const { status } = req.body as { status?: string };

  if (!status || !STATUS_TARGETS.includes(status as StatusTarget)) {
    res.status(400).json({ message: `status must be one of: ${STATUS_TARGETS.join(", ")}` });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!event) { res.status(404).json({ message: "Event not found" }); return; }

  const [actor] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1);
  const isAdmin = actor?.isAdmin ?? false;

  if (!isAdmin) {
    if (event.creatorId !== authed.userId) {
      res.status(403).json({ message: "You do not have permission to change this event." });
      return;
    }
    if (event.status === "cancelled" || event.status === "ended") {
      res.status(409).json({ message: "This event's status can no longer be changed." });
      return;
    }
  }

  const [updated] = await db
    .update(eventsTable)
    .set({ status: status as StatusTarget, updatedAt: new Date() })
    .where(eq(eventsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status });
});

export default router;
