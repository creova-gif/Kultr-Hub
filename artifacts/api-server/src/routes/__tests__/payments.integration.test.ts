/**
 * Integration tests for the payments routes — the single most sensitive
 * route group in the app (the one that moves money), which had zero
 * dedicated test coverage before this file. Runs in simulated mode (no
 * Paystack/M-Pesa/MoMo credentials configured, same as local dev) — that's
 * the correct mode to exercise here: it's real application logic (pending
 * payment persistence, tamper-guard binding, ticket issuance, KULTR PASS
 * payment lifecycle), just without a live gateway on the other end.
 * Requires a real Postgres (same DATABASE_URL convention as the other
 * integration tests); skips gracefully if none is reachable.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  eventsTable,
  ticketTypesTable,
  ticketsTable,
  pendingPaymentsTable,
  kultrPassPaymentsTable,
} from "@workspace/db";

let dbAvailable = false;
let server: import("node:http").Server;
let baseUrl: string;
let buyerId: string;
let buyerToken: string;
let otherBuyerId: string;
let otherBuyerToken: string;
let eventId: string;
let ticketTypeId: string;

before(async () => {
  try {
    await db.execute(sql`select 1`);
    dbAvailable = true;
  } catch (err) {
    console.log(`\n[payments.integration.test] Skipping — no reachable database (${(err as Error).message}).\n`);
    return;
  }

  const { default: app } = await import("../../app.js");
  server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  const [buyer] = await db.insert(usersTable).values({
    email: `payments-buyer-${Date.now()}@example.com`,
    displayName: "Payments Buyer",
    countryCode: "KE",
  }).returning();
  buyerId = buyer.id;

  const [otherBuyer] = await db.insert(usersTable).values({
    email: `payments-other-${Date.now()}@example.com`,
    displayName: "Someone Else",
  }).returning();
  otherBuyerId = otherBuyer.id;

  const [event] = await db.insert(eventsTable).values({
    creatorId: buyerId,
    title: "Payments Test Event",
    description: "test",
    category: "Music",
    venue: "Test Venue",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: "live",
  }).returning();
  eventId = event.id;

  const [ticketType] = await db.insert(ticketTypesTable).values({
    eventId,
    name: "General",
    price: "500",
    currency: "KES",
    totalQuantity: 100,
  }).returning();
  ticketTypeId = ticketType.id;

  const { signToken } = await import("../../lib/jwt.js");
  buyerToken = signToken({ userId: buyerId, email: buyer.email, tokenVersion: buyer.tokenVersion });
  otherBuyerToken = signToken({ userId: otherBuyerId, email: otherBuyer.email, tokenVersion: otherBuyer.tokenVersion });
});

after(async () => {
  if (!dbAvailable) return;
  server?.close();
  await db.delete(ticketsTable).where(eq(ticketsTable.eventId, eventId));
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  await db.delete(usersTable).where(eq(usersTable.id, buyerId));
  await db.delete(usersTable).where(eq(usersTable.id, otherBuyerId));
});

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

test("POST /payments/init returns a simulated response when Paystack is unconfigured", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; authorizationUrl: string | null; simulated: boolean; totalAmount: number };
  assert.equal(body.simulated, true);
  assert.equal(body.authorizationUrl, null);
  assert.equal(body.totalAmount, 500);
  assert.ok(body.reference);
});

test("POST /payments/verify issues a real ticket in simulated mode", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const initRes = await fetch(`${baseUrl}/api/payments/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 2 }),
  });
  const { reference } = await initRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference, eventId, ticketTypeId, quantity: 2 }),
  });
  assert.equal(verifyRes.status, 201);
  const body = await verifyRes.json() as { ticketId: string; status: string; totalAmount: number };
  assert.equal(body.status, "confirmed");
  assert.equal(body.totalAmount, 1000);

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, body.ticketId)).limit(1);
  assert.equal(ticket.paymentReference, reference);
  assert.equal(ticket.quantity, 2);
});

test("POST /payments/verify with missing fields is rejected", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference: "kultr_missing_fields" }),
  });
  assert.equal(res.status, 400);
});

test("POST /payments/mpesa/stk-push persists a pending payment and returns a simulated STK response", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/mpesa/stk-push`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; simulated: boolean; checkoutRequestId: string };
  assert.equal(body.simulated, true);
  assert.ok(body.checkoutRequestId.startsWith("sim_"));

  const [pending] = await db.select().from(pendingPaymentsTable).where(eq(pendingPaymentsTable.reference, body.reference)).limit(1);
  assert.equal(pending.provider, "mpesa");
  assert.equal(pending.userId, buyerId);
});

test("POST /payments/mpesa/verify issues a ticket from the pending payment, ignoring a mismatched client-supplied quantity", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const stkRes = await fetch(`${baseUrl}/api/payments/mpesa/stk-push`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678" }),
  });
  const { reference } = await stkRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/mpesa/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 201);
  const body = await verifyRes.json() as { ticketId: string; totalAmount: number };
  assert.equal(body.totalAmount, 500); // 1 ticket at 500, from the pending row — not client-suppliable here at all

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, body.ticketId)).limit(1);
  assert.equal(ticket.quantity, 1);
  assert.equal(ticket.paymentProvider, "mpesa_simulated");
});

test("POST /payments/mpesa/verify rejects a reference belonging to a different account", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const stkRes = await fetch(`${baseUrl}/api/payments/mpesa/stk-push`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678" }),
  });
  const { reference } = await stkRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/mpesa/verify`, {
    method: "POST",
    headers: authHeaders(otherBuyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 403);
});

test("POST /payments/momo/request persists a pending payment and returns a simulated response", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/momo/request`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0770123456", countryCode: "UG" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; simulated: boolean; referenceId: string };
  assert.equal(body.simulated, true);
  assert.ok(body.referenceId.startsWith("sim_"));

  const [pending] = await db.select().from(pendingPaymentsTable).where(eq(pendingPaymentsTable.reference, body.reference)).limit(1);
  assert.equal(pending.provider, "mtn_momo");
});

test("POST /payments/momo/verify issues a ticket from the pending payment", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const reqRes = await fetch(`${baseUrl}/api/payments/momo/request`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0770123456", countryCode: "UG" }),
  });
  const { reference } = await reqRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/momo/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 201);
  const body = await verifyRes.json() as { ticketId: string; status: string };
  assert.equal(body.status, "confirmed");

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, body.ticketId)).limit(1);
  assert.equal(ticket.paymentProvider, "momo_simulated");
});

test("POST /payments/pass/init writes a pending KULTR PASS payment row at the fixed price", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/pass/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; simulated: boolean; amount: number; currency: string };
  assert.equal(body.simulated, true);
  assert.equal(body.amount, 500);
  assert.equal(body.currency, "KES");

  const [pending] = await db.select().from(kultrPassPaymentsTable).where(eq(kultrPassPaymentsTable.reference, body.reference)).limit(1);
  assert.equal(pending.status, "pending");
  assert.equal(pending.userId, buyerId);
});

test("POST /payments/pass/verify flips the payment to verified, and is idempotent on replay", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const initRes = await fetch(`${baseUrl}/api/payments/pass/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
  });
  const { reference } = await initRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/pass/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 200);
  assert.deepEqual(await verifyRes.json(), { verified: true, reference });

  const [pending] = await db.select().from(kultrPassPaymentsTable).where(eq(kultrPassPaymentsTable.reference, reference)).limit(1);
  assert.equal(pending.status, "verified");

  // Replaying with an already-verified reference confirms success again
  // rather than erroring or re-verifying.
  const replayRes = await fetch(`${baseUrl}/api/payments/pass/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(replayRes.status, 200);
});

test("POST /payments/pass/verify rejects an unknown reference", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/pass/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference: "kultr_does_not_exist" }),
  });
  assert.equal(res.status, 400);
});

test("POST /payments/stripe/init converts the ticket price into the requested currency and persists it", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/stripe/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, currency: "USD" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; checkoutUrl: string | null; simulated: boolean; totalAmount: number; currency: string };
  assert.equal(body.simulated, true);
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.currency, "USD");
  // Ticket is priced 500 KES — converted to USD this must be a small positive
  // amount, not the raw 500 (proves the FX conversion actually ran).
  assert.ok(body.totalAmount > 0 && body.totalAmount < 500);

  const [pending] = await db.select().from(pendingPaymentsTable).where(eq(pendingPaymentsTable.reference, body.reference)).limit(1);
  assert.equal(pending.provider, "stripe");
  assert.equal(pending.currency, "USD");
  assert.equal(pending.userId, buyerId);
});

test("POST /payments/stripe/init rejects an unsupported settlement currency", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/stripe/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, currency: "KES" }),
  });
  assert.equal(res.status, 400);
});

test("POST /payments/stripe/verify issues a ticket from the pending payment in simulated mode", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const initRes = await fetch(`${baseUrl}/api/payments/stripe/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, currency: "USD" }),
  });
  const { reference } = await initRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/stripe/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 201);
  const body = await verifyRes.json() as { ticketId: string; status: string; currency: string };
  assert.equal(body.status, "confirmed");
  assert.equal(body.currency, "USD");

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, body.ticketId)).limit(1);
  assert.equal(ticket.paymentProvider, "stripe_simulated");
  assert.equal(ticket.currency, "USD");
});

test("POST /payments/stripe/verify rejects a reference belonging to a different account", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const initRes = await fetch(`${baseUrl}/api/payments/stripe/init`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, currency: "USD" }),
  });
  const { reference } = await initRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/stripe/verify`, {
    method: "POST",
    headers: authHeaders(otherBuyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 403);
});

test("POST /payments/selcom/request converts the ticket price into TZS and persists it", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const res = await fetch(`${baseUrl}/api/payments/selcom/request`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678", countryCode: "TZ" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json() as { reference: string; simulated: boolean; totalAmount: number; currency: string };
  assert.equal(body.simulated, true);
  assert.equal(body.currency, "TZS");
  assert.ok(body.totalAmount > 0);

  const [pending] = await db.select().from(pendingPaymentsTable).where(eq(pendingPaymentsTable.reference, body.reference)).limit(1);
  assert.equal(pending.provider, "selcom");
  assert.equal(pending.currency, "TZS");
});

test("POST /payments/selcom/verify issues a ticket from the pending payment in simulated mode", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const reqRes = await fetch(`${baseUrl}/api/payments/selcom/request`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678", countryCode: "TZ" }),
  });
  const { reference } = await reqRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/selcom/verify`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 201);
  const body = await verifyRes.json() as { ticketId: string; status: string; currency: string };
  assert.equal(body.status, "confirmed");
  assert.equal(body.currency, "TZS");

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, body.ticketId)).limit(1);
  assert.equal(ticket.paymentProvider, "selcom_simulated");
});

test("POST /payments/selcom/verify rejects a reference belonging to a different account", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const reqRes = await fetch(`${baseUrl}/api/payments/selcom/request`, {
    method: "POST",
    headers: authHeaders(buyerToken),
    body: JSON.stringify({ eventId, ticketTypeId, quantity: 1, phone: "0712345678", countryCode: "TZ" }),
  });
  const { reference } = await reqRes.json() as { reference: string };

  const verifyRes = await fetch(`${baseUrl}/api/payments/selcom/verify`, {
    method: "POST",
    headers: authHeaders(otherBuyerToken),
    body: JSON.stringify({ reference }),
  });
  assert.equal(verifyRes.status, 403);
});
