import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  pgEnum,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventCategoryEnum = pgEnum("event_category", [
  "Music",
  "Art",
  "Food",
  "Heritage",
  "Comedy",
  "Sports",
  "Nightlife",
]);

export const eventStatusEnum = pgEnum("event_status", ["draft", "pending_review", "live", "ended", "cancelled"]);

export const eventsTable = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description").notNull(),
    category: eventCategoryEnum("category").notNull(),
    venue: text("venue").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    capacity: integer("capacity"),
    status: eventStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    tags: text("tags").array(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every public browse/search query filters status='live' and sorts by eventDate.
    index("events_status_event_date_idx").on(table.status, table.eventDate),
    index("events_category_idx").on(table.category),
    index("events_city_idx").on(table.city),
    index("events_country_code_idx").on(table.countryCode),
    index("events_creator_id_idx").on(table.creatorId),
    check("events_capacity_non_negative", sql`${table.capacity} is null or ${table.capacity} >= 0`),
  ],
);

export const ticketTypesTable = pgTable(
  "ticket_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("KES"),
    totalQuantity: integer("total_quantity").notNull(),
    soldQuantity: integer("sold_quantity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_types_event_id_idx").on(table.eventId),
    // A DB-level backstop, not the primary guard — the actual oversell
    // protection is the guarded conditional UPDATE in lib/issue.ts. This
    // exists so a bug in that application-layer logic (or a future direct
    // write that bypasses it) can't silently push the row negative or past
    // capacity; it would fail loudly instead.
    check("ticket_types_price_non_negative", sql`${table.price} >= 0`),
    check("ticket_types_total_quantity_non_negative", sql`${table.totalQuantity} >= 0`),
    check("ticket_types_sold_quantity_bounds", sql`${table.soldQuantity} >= 0 and ${table.soldQuantity} <= ${table.totalQuantity}`),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketTypeSchema = createInsertSchema(ticketTypesTable).omit({
  id: true,
  soldQuantity: true,
  createdAt: true,
});

export const selectEventSchema = createSelectSchema(eventsTable);
export const selectTicketTypeSchema = createSelectSchema(ticketTypesTable);

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
export type InsertTicketType = z.infer<typeof insertTicketTypeSchema>;
export type TicketType = typeof ticketTypesTable.$inferSelect;
