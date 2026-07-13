/**
 * Reconciliation worker for M-Pesa / MTN MoMo payments (R6).
 *
 * The normal flow issues a ticket when the CLIENT calls /verify after the
 * user approves the STK/MoMo prompt. If the app is closed, crashes, or loses
 * connectivity between initiating the payment and calling /verify, the
 * charge can succeed at the provider while Kultr never finds out — the
 * customer paid real money and got nothing, with nobody aware it happened.
 * Paystack doesn't need this: its reference stays queryable indefinitely, so
 * any later /verify call still completes the purchase correctly.
 *
 * Run periodically (see .github/workflows/reconcile-payments.yml). Safe to
 * run concurrently with itself or with normal traffic — reconciliation goes
 * through the same issueTicket() idempotency guard as the live /verify
 * routes, so double-processing a reference is a no-op, not a double-charge.
 */
import { and, eq, lt, gt, isNotNull, notExists, sql } from "drizzle-orm";
import { db, pendingPaymentsTable, ticketsTable } from "@workspace/db";
import { queryStkPush } from "../lib/mpesa.js";
import { getMoMoPaymentStatus } from "../lib/mtn-momo.js";
import { getSelcomOrderStatus } from "../lib/selcom.js";
import { issueTicket, TicketIssueError } from "../lib/issue.js";
import { logger } from "../lib/logger.js";

// Give the client's own polling loop a head start before we step in —
// reconciling too eagerly would just race the normal flow for no benefit.
const MIN_AGE_MINUTES = Number(process.env.RECONCILE_MIN_AGE_MINUTES ?? 10);
// Provider polling handles (STK checkoutRequestId, MoMo referenceId) expire
// server-side after a while — past this window there's nothing left to
// query, so stop looking rather than hammering the provider forever.
const MAX_AGE_HOURS = Number(process.env.RECONCILE_MAX_AGE_HOURS ?? 24);

async function findUnreconciled() {
  const cutoffMin = new Date(Date.now() - MIN_AGE_MINUTES * 60_000);
  const cutoffMax = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60_000);

  return db
    .select()
    .from(pendingPaymentsTable)
    .where(
      and(
        lt(pendingPaymentsTable.createdAt, cutoffMin),
        gt(pendingPaymentsTable.createdAt, cutoffMax),
        isNotNull(pendingPaymentsTable.providerHandle),
        // NOT an inArray/notInArray on a plain subquery of ticketsTable.paymentReference:
        // that column is nullable, and SQL's NOT IN silently matches zero rows the
        // moment the subquery returns even one NULL. A correlated NOT EXISTS has no
        // such trap.
        notExists(
          db
            .select({ one: sql`1` })
            .from(ticketsTable)
            .where(eq(ticketsTable.paymentReference, pendingPaymentsTable.reference)),
        ),
      ),
    );
}

async function reconcileOne(pending: Awaited<ReturnType<typeof findUnreconciled>>[number]) {
  const handle = pending.providerHandle!;
  if (handle.startsWith("sim_")) return "skipped-simulated" as const;

  let paid = false;
  if (pending.provider === "mpesa") {
    const status = await queryStkPush(handle);
    paid = status?.resultCode === "0";
  } else if (pending.provider === "mtn_momo") {
    const status = await getMoMoPaymentStatus(handle);
    paid = status?.status === "SUCCESSFUL";
  } else if (pending.provider === "selcom") {
    const status = await getSelcomOrderStatus(handle);
    paid = status?.status === "COMPLETED";
  } else {
    // Stripe references stay queryable indefinitely (like Paystack), so a
    // client that never calls /stripe/verify can still complete the
    // purchase whenever it does — no reconciliation needed for "stripe".
    return "skipped-unsupported-provider" as const;
  }

  if (!paid) return "still-pending" as const;

  try {
    await issueTicket({
      userId: pending.userId,
      eventId: pending.eventId,
      ticketTypeId: pending.ticketTypeId,
      quantity: pending.quantity,
      unitPrice: Number(pending.unitPrice),
      currency: pending.currency,
      paymentReference: pending.reference,
      paymentProvider: pending.provider,
    });
    return "reconciled" as const;
  } catch (err) {
    if (err instanceof TicketIssueError && err.code === "sold_out") {
      // The customer paid but inventory sold out in the meantime — this is a
      // genuine refund case, not something this worker can resolve. Surface
      // it loudly; there is no refund automation yet (see audit finding
      // "no refund/chargeback handling").
      logger.error(
        { reference: pending.reference, userId: pending.userId },
        "RECONCILIATION: payment succeeded but inventory sold out — manual refund required",
      );
      return "needs-manual-refund" as const;
    }
    throw err;
  }
}

async function main() {
  const candidates = await findUnreconciled();
  logger.info({ count: candidates.length }, "Reconciliation sweep starting");

  const results: Record<string, number> = {};
  for (const pending of candidates) {
    let outcome: string;
    try {
      outcome = await reconcileOne(pending);
    } catch (err) {
      outcome = "error";
      logger.error({ err, reference: pending.reference }, "Reconciliation error");
    }
    results[outcome] = (results[outcome] ?? 0) + 1;
    if (outcome === "reconciled") {
      logger.info({ reference: pending.reference, userId: pending.userId }, "Reconciled a payment the client never confirmed");
    }
  }

  logger.info({ results }, "Reconciliation sweep finished");
}

await main();
