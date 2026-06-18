import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  numeric,
  boolean,
  bigserial,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable, eventCategoryEnum } from "./events";
import { ticketsTable } from "./tickets";

/**
 * How a quest decides whether a verified check-in counts toward it.
 * - category   → event.category must equal requiredCategory
 * - tag        → event.tags must include requiredTag
 * - early_bird → ticket was purchased >= earlyBirdDays before the event date
 * - any        → every verified check-in counts (e.g. "Culture Explorer")
 */
export const questMatchRuleEnum = pgEnum("quest_match_rule", [
  "category",
  "tag",
  "early_bird",
  "any",
]);

export const collectibleRarityEnum = pgEnum("collectible_rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);

export const kultroinReasonEnum = pgEnum("kultroin_reason", [
  "quest_completion",
  "milestone_bonus",
  "perk_redemption",
  "manual_adjust",
  "signup_bonus",
]);

/* ──────────────────────────────────────────────────────────────────────────
 * Quest catalog — admin-defined quests. A quest is "completed" when a user
 * accumulates `targetCount` qualifying verified check-ins.
 * ────────────────────────────────────────────────────────────────────────── */
export const questsTable = pgTable("quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  matchRule: questMatchRuleEnum("match_rule").notNull().default("category"),
  requiredCategory: eventCategoryEnum("required_category"),
  requiredTag: text("required_tag"),
  earlyBirdDays: integer("early_bird_days").notNull().default(7),
  targetCount: integer("target_count").notNull().default(1),
  pointsReward: integer("points_reward").notNull().default(100),
  collectibleSlug: text("collectible_slug").notNull(),
  collectibleName: text("collectible_name").notNull(),
  collectibleRarity: collectibleRarityEnum("collectible_rarity").notNull().default("common"),
  badgeImageKey: text("badge_image_key"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * Per-user wallet. Denormalized balance is the fast-read source; it is only
 * ever mutated inside a transaction that holds a FOR UPDATE row lock, which
 * serializes concurrent writes for a single user and prevents overdrafts /
 * double-credits without needing Redis.
 * ────────────────────────────────────────────────────────────────────────── */
export const kultroinWalletsTable = pgTable("kultroin_wallets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * Append-only KULTROIN ledger. `delta` is positive for earns, negative for
 * spends. Every row carries `balanceAfter`, a per-user hash chain
 * (prevHash → txHash) for tamper-evidence, and a unique `idempotencyKey` that
 * makes every award/spend exactly-once even under concurrent retries.
 * ────────────────────────────────────────────────────────────────────────── */
export const kultroinLedgerTable = pgTable(
  "kultroin_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: bigserial("seq", { mode: "number" }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: kultroinReasonEnum("reason").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    prevHash: text("prev_hash"),
    txHash: text("tx_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("kultroin_ledger_user_idx").on(t.userId)],
);

/* ──────────────────────────────────────────────────────────────────────────
 * Per-user progress toward each quest.
 * ────────────────────────────────────────────────────────────────────────── */
export const userQuestProgressTable = pgTable(
  "user_quest_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    questId: uuid("quest_id")
      .notNull()
      .references(() => questsTable.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("user_quest_unique").on(t.userId, t.questId)],
);

/* ──────────────────────────────────────────────────────────────────────────
 * Verified event attendance. The unique(userId, eventId) constraint is the
 * core anti-cheat / atomicity guard: a user can only be credited once per
 * event no matter how many devices fire the check-in simultaneously.
 * ────────────────────────────────────────────────────────────────────────── */
export const eventCheckinsTable = pgTable(
  "event_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => ticketsTable.id, { onDelete: "set null" }),
    source: text("source").notNull().default("qr"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("event_checkin_unique").on(t.userId, t.eventId)],
);

/* ──────────────────────────────────────────────────────────────────────────
 * Digital collectibles ("cultural legacy"). DB-backed, granted exactly once
 * per (user, slug). Verifiable in-app; no blockchain.
 * ────────────────────────────────────────────────────────────────────────── */
export const collectibleInventoryTable = pgTable(
  "collectible_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    rarity: collectibleRarityEnum("rarity").notNull().default("common"),
    imageKey: text("image_key"),
    questId: uuid("quest_id").references(() => questsTable.id, { onDelete: "set null" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("collectible_unique").on(t.userId, t.slug)],
);

/* ──────────────────────────────────────────────────────────────────────────
 * KULTR PASS — premium entitlement that applies a points multiplier. Modeled
 * as an entitlement flag for now; recurring billing is a later integration.
 * ────────────────────────────────────────────────────────────────────────── */
export const kultrPassSubscriptionsTable = pgTable("kultr_pass_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("standard"),
  multiplier: numeric("multiplier", { precision: 3, scale: 2 }).notNull().default("1.50"),
  active: boolean("active").notNull().default(true),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * Spendable perks catalog ("unlock more experiences") + redemption records.
 * ────────────────────────────────────────────────────────────────────────── */
export const perksTable = pgTable("perks", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
  repeatable: boolean("repeatable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPerkUnlocksTable = pgTable(
  "user_perk_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    perkId: uuid("perk_id")
      .notNull()
      .references(() => perksTable.id, { onDelete: "cascade" }),
    cost: integer("cost").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_perk_unlocks_user_idx").on(t.userId)],
);

/* ── zod + inferred types ─────────────────────────────────────────────────── */
export const insertQuestSchema = createInsertSchema(questsTable).omit({
  id: true,
  createdAt: true,
});
export const selectQuestSchema = createSelectSchema(questsTable);
export const selectCollectibleSchema = createSelectSchema(collectibleInventoryTable);
export const selectLedgerSchema = createSelectSchema(kultroinLedgerTable);

export type Quest = typeof questsTable.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type KultroinWallet = typeof kultroinWalletsTable.$inferSelect;
export type KultroinLedgerEntry = typeof kultroinLedgerTable.$inferSelect;
export type UserQuestProgress = typeof userQuestProgressTable.$inferSelect;
export type EventCheckin = typeof eventCheckinsTable.$inferSelect;
export type CollectibleItem = typeof collectibleInventoryTable.$inferSelect;
export type KultrPassSubscription = typeof kultrPassSubscriptionsTable.$inferSelect;
export type Perk = typeof perksTable.$inferSelect;
export type UserPerkUnlock = typeof userPerkUnlocksTable.$inferSelect;
