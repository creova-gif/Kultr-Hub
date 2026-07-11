/**
 * Integration test for the event publish gate — the property that a
 * non-admin creator can never move their own event straight to "live".
 * An earlier version of PATCH /:id/status allowed exactly that, reopening
 * the self-serve-fraud surface the platform's original audit brief asked
 * to be closed. Requires a real Postgres (same DATABASE_URL convention as
 * the other integration tests); skips gracefully if none is reachable.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, eventsTable, ticketTypesTable } from "@workspace/db";

let dbAvailable = false;
let server: import("node:http").Server;
let baseUrl: string;
let creatorId: string;
let adminId: string;
let creatorToken: string;
let adminToken: string;

async function createDraftEvent(): Promise<string> {
  const [event] = await db.insert(eventsTable).values({
    creatorId,
    title: "Status Gate Test Event",
    description: "test",
    category: "Music",
    venue: "Test Venue",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "draft",
  }).returning();
  await db.insert(ticketTypesTable).values({
    eventId: event.id,
    name: "General",
    price: "1000",
    currency: "KES",
    totalQuantity: 10,
  });
  return event.id;
}

before(async () => {
  try {
    await db.execute(sql`select 1`);
    dbAvailable = true;
  } catch (err) {
    console.log(`\n[events-status.integration.test] Skipping — no reachable database (${(err as Error).message}).\n`);
    return;
  }

  const { default: app } = await import("../../app.js");
  server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  const [creator] = await db.insert(usersTable).values({
    email: `status-gate-creator-${Date.now()}@example.com`,
    displayName: "Status Gate Creator",
  }).returning();
  creatorId = creator.id;

  const [admin] = await db.insert(usersTable).values({
    email: `status-gate-admin-${Date.now()}@example.com`,
    displayName: "Status Gate Admin",
    isAdmin: true,
  }).returning();
  adminId = admin.id;

  const { signToken } = await import("../../lib/jwt.js");
  creatorToken = signToken({ userId: creatorId, email: creator.email, tokenVersion: creator.tokenVersion });
  adminToken = signToken({ userId: adminId, email: admin.email, tokenVersion: admin.tokenVersion });
});

after(async () => {
  if (!dbAvailable) return;
  server?.close();
  await db.delete(eventsTable).where(eq(eventsTable.creatorId, creatorId));
  await db.delete(usersTable).where(eq(usersTable.id, creatorId));
  await db.delete(usersTable).where(eq(usersTable.id, adminId));
});

test("a non-admin creator cannot move their own draft event straight to live", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const eventId = await createDraftEvent();

  const res = await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${creatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "live" }),
  });
  assert.equal(res.status, 409);

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  assert.equal(event.status, "draft", "the event must not have been published");
});

test("a creator can submit their draft for review, but not skip straight to live from there either", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const eventId = await createDraftEvent();

  const submit = await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${creatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending_review" }),
  });
  assert.equal(submit.status, 200);
  assert.equal((await submit.json()).status, "pending_review");

  const skipToLive = await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${creatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "live" }),
  });
  assert.equal(skipToLive.status, 409);
});

test("only an admin can approve a pending_review event to live, and it becomes publicly visible", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const eventId = await createDraftEvent();

  await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${creatorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "pending_review" }),
  });

  const notYetPublic = await fetch(`${baseUrl}/api/events/${eventId}`);
  const notYetPublicBody = await notYetPublic.json();
  assert.equal(notYetPublicBody.status, "pending_review");

  const inPublicList = await fetch(`${baseUrl}/api/events`);
  const listedIds = (await inPublicList.json()).events.map((e: { id: string }) => e.id);
  assert.ok(!listedIds.includes(eventId), "a pending_review event must not appear in the public listing");

  const approve = await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "live" }),
  });
  assert.equal(approve.status, 200);
  assert.equal((await approve.json()).status, "live");

  const nowPublicList = await fetch(`${baseUrl}/api/events`);
  const nowListedIds = (await nowPublicList.json()).events.map((e: { id: string }) => e.id);
  assert.ok(nowListedIds.includes(eventId), "an approved event must appear in the public listing");
});

test("an admin can force-cancel any event regardless of status (moderation kill-switch)", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const eventId = await createDraftEvent();

  const res = await fetch(`${baseUrl}/api/events/${eventId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "cancelled");
});
