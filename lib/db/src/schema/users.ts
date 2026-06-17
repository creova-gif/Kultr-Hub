import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  countryCode: text("country_code").notNull().default("KE"),
  isCreator: boolean("is_creator").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One-time passcodes for phone-based authentication.
 * A row is created per OTP request; the code is stored hashed (bcrypt).
 */
export const otpCodesTable = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: text("purpose").notNull().default("login"),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(usersTable);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type OtpCode = typeof otpCodesTable.$inferSelect;
