import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, ticketsTable, ticketTypesTable, eventsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import type { Request, Response } from "express";

const router = Router();

function generateTicketNumber(): string {
  return `KTR-${nanoid(8).toUpperCase()}`;
}

async function buildTicketDetail(ticket: typeof ticketsTable.$inferSelect) {
  const [ticketType] = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticket.ticketTypeId)).limit(1);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, ticket.eventId)).limit(1);
  const eventTicketTypes = await db.select().from(ticketTypesTable).where(eq(ticketTypesTable.eventId, ticket.eventId));

  const prices = eventTicketTypes.map((t) => Number(t.price));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    eventId: ticket.eventId,
    ticketTypeId: ticket.ticketTypeId,
    ticketTypeName: ticketType?.name ?? "",
    quantity: ticket.quantity,
    unitPrice: Number(ticket.unitPrice),
    totalAmount: Number(ticket.totalAmount),
    currency: ticket.currency,
    status: ticket.status,
    purchasedAt: ticket.purchasedAt,
    event: {
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
      currency: eventTicketTypes[0]?.currency ?? ticket.currency,
      status: event.status,
    },
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const tickets = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.userId, authed.userId))
    .orderBy(desc(ticketsTable.purchasedAt));

  const details = await Promise.all(tickets.map(buildTicketDetail));
  res.json({ tickets: details, total: details.length });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { eventId, ticketTypeId, quantity = 1 } = req.body as {
    eventId: string;
    ticketTypeId: string;
    quantity?: number;
  };

  if (!eventId || !ticketTypeId) {
    res.status(400).json({ message: "eventId and ticketTypeId are required" });
    return;
  }

  const [ticketType] = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.id, ticketTypeId)).limit(1);

  if (!ticketType) {
    res.status(404).json({ message: "Ticket type not found" });
    return;
  }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} tickets remaining` });
    return;
  }

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  const [ticket] = await db.transaction(async (tx) => {
    await tx.update(ticketTypesTable)
      .set({ soldQuantity: sql`${ticketTypesTable.soldQuantity} + ${quantity}` })
      .where(eq(ticketTypesTable.id, ticketTypeId));

    return tx.insert(ticketsTable).values({
      ticketNumber: generateTicketNumber(),
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: String(unitPrice),
      totalAmount: String(totalAmount),
      currency: ticketType.currency,
      status: "confirmed",
    }).returning();
  });

  const detail = await buildTicketDetail(ticket);
  res.status(201).json(detail);
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const id = String(req.params.id);

  const [ticket] = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.id, id)).limit(1);

  if (!ticket || ticket.userId !== authed.userId) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  const detail = await buildTicketDetail(ticket);
  res.json(detail);
});

export default router;
