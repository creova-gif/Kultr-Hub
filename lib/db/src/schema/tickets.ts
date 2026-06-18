import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable, ticketTypesTable } from "./events";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
]);

export const ticketsTable = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: text("ticket_number").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  ticketTypeId: uuid("ticket_type_id")
    .notNull()
    .references(() => ticketTypesTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: ticketStatusEnum("status").notNull().default("confirmed"),
  paymentReference: text("payment_reference"),
  paymentProvider: text("payment_provider"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  purchasedAt: true,
});

export const selectTicketSchema = createSelectSchema(ticketsTable);

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
