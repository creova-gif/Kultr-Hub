import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, ticketTypesTable, eventsTable, usersTable, pendingPaymentsTable, kultrPassPaymentsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { initializePayment, verifyPayment, isPaystackConfigured } from "../lib/paystack.js";
import { initiateStkPush, queryStkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { initiateMoMoRequest, getMoMoPaymentStatus, isMoMoConfigured } from "../lib/mtn-momo.js";
import { createCheckoutSession, retrieveCheckoutSession, isStripeConfigured } from "../lib/stripe.js";
import { createSelcomOrder, getSelcomOrderStatus, isSelcomConfigured } from "../lib/selcom.js";
import { getRates } from "../lib/fx.js";
import { normalizeMsisdn } from "../lib/phone.js";
import { simulationAllowed } from "../lib/simulation.js";
import { issueTicket, validateQuantity, TicketIssueError } from "../lib/issue.js";
import type { Request, Response } from "express";

const router = Router();

function toCurrencyKobo(amount: number, currency: string): number {
  // Paystack accepts amounts in the smallest currency unit
  // NGN, GHS, KES, ZAR, USD are all 100 subunits
  return Math.round(amount * 100);
}

// Currencies Stripe can settle a Checkout session in that this app currently
// offers as a "card" method — kept as an allowlist rather than accepting any
// client-supplied code, since it flows straight into an FX conversion and a
// real charge amount.
const STRIPE_SUPPORTED_CURRENCIES = new Set(["USD", "GBP", "CAD", "EUR"]);

function generatePaymentRef(): string {
  return `kultr_${nanoid(16)}`;
}

/** Translate a TicketIssueError into an HTTP response; returns true if handled. */
function handleIssueError(err: unknown, res: Response): boolean {
  if (err instanceof TicketIssueError) {
    res.status(err.code === "sold_out" ? 409 : 400).json({ message: err.message });
    return true;
  }
  return false;
}

/**
 * POST /api/payments/init
 * Initialize a Paystack transaction. Returns an authorization URL to redirect
 * the user to, plus a reference to track the payment.
 */
router.post("/init", requireAuth, async (req: Request, res: Response) => {
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

  const [[user], [event], [ticketType]] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1),
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticketTypeId)).limit(1),
  ]);

  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} ticket(s) remaining` });
    return;
  }

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;
  const reference = generatePaymentRef();

  const callbackUrl =
    process.env.PAYSTACK_CALLBACK_URL ??
    `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/payments/callback?ref=${reference}`;

  const paystack = await initializePayment({
    email: user.email,
    amountKobo: toCurrencyKobo(totalAmount, ticketType.currency),
    currency: ticketType.currency,
    reference,
    callbackUrl,
    metadata: {
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      eventTitle: event.title,
      ticketTypeName: ticketType.name,
    },
  });

  if (!paystack) {
    // Paystack key not configured — simulate payment for dev/demo
    res.json({
      reference,
      authorizationUrl: null,
      simulated: true,
      totalAmount,
      currency: ticketType.currency,
    });
    return;
  }

  res.json({
    reference: paystack.reference,
    authorizationUrl: paystack.authorizationUrl,
    simulated: false,
    totalAmount,
    currency: ticketType.currency,
  });
});

/**
 * POST /api/payments/verify
 * Called after payment. Verifies with Paystack, then creates the ticket.
 */
router.post("/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference, eventId, ticketTypeId } = req.body as {
    reference: string;
    eventId: string;
    ticketTypeId: string;
  };

  if (!reference || !eventId || !ticketTypeId) {
    res.status(400).json({ message: "reference, eventId and ticketTypeId are required" });
    return;
  }

  let quantity: number;
  try {
    quantity = validateQuantity((req.body as { quantity?: unknown }).quantity ?? 1);
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }

  const [ticketType] = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.id, ticketTypeId)).limit(1);

  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  // Simulation is a server-side decision only — never trust a client flag.
  const allowSimulation = simulationAllowed(isPaystackConfigured());

  if (!allowSimulation) {
    const result = await verifyPayment(reference);
    if (!result?.success) {
      res.status(402).json({ message: "Payment could not be verified" });
      return;
    }
    // Bind the charge to what we are about to issue: amount, currency and buyer
    // must all match, otherwise this is an amount/tier/quantity tampering attempt.
    const expectedKobo = toCurrencyKobo(totalAmount, ticketType.currency);
    if (result.amount !== expectedKobo || result.currency !== ticketType.currency) {
      res.status(400).json({ message: "Payment amount does not match the requested ticket." });
      return;
    }
    const metaUserId = (result.metadata as { userId?: string } | undefined)?.userId;
    if (metaUserId && metaUserId !== authed.userId) {
      res.status(403).json({ message: "This payment belongs to a different account." });
      return;
    }
  }

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice,
      currency: ticketType.currency,
      paymentReference: reference,
      paymentProvider: allowSimulation ? "simulated" : "paystack",
    });
    res.status(201).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount,
      currency: ticketType.currency,
    });
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }
});

/**
 * KULTR PASS is a one-time charge with manual renewal (not an
 * auto-recurring subscription) — see routes/gamification.ts POST
 * /pass/activate, which sets a real 30-day expiresAt on every activation.
 * The price is deliberately a plain constant, not user- or client-supplied.
 */
const KULTR_PASS_PRICE_KES = 500; // KES — one 30-day KULTR PASS period.
const KULTR_PASS_CURRENCY = "KES";

/**
 * POST /api/payments/pass/init
 * Mirrors POST /payments/init above, but for a KULTR PASS purchase instead
 * of a ticket. Writes a "pending" row to kultr_pass_payments before ever
 * contacting Paystack (or, when unconfigured, before telling the client to
 * simulate) so /pass/verify — and ultimately gamification.ts's
 * /pass/activate — always has a server-authoritative record to check
 * against instead of trusting the client's word that payment happened.
 */
router.post("/pass/init", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const reference = generatePaymentRef();

  await db.insert(kultrPassPaymentsTable).values({
    reference,
    userId: authed.userId,
    amount: String(KULTR_PASS_PRICE_KES),
    currency: KULTR_PASS_CURRENCY,
    status: "pending",
  });

  const callbackUrl =
    process.env.PAYSTACK_CALLBACK_URL ??
    `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/payments/callback?ref=${reference}`;

  const paystack = await initializePayment({
    email: user.email,
    amountKobo: toCurrencyKobo(KULTR_PASS_PRICE_KES, KULTR_PASS_CURRENCY),
    currency: KULTR_PASS_CURRENCY,
    reference,
    callbackUrl,
    metadata: { userId: authed.userId, kind: "kultr_pass" },
  });

  if (!paystack) {
    // Paystack key not configured — simulate payment for dev/demo, same as
    // ticket purchase above. The client still has to call /pass/verify
    // (and then gamification.ts's /pass/activate) before anything is granted.
    res.json({
      reference,
      authorizationUrl: null,
      simulated: true,
      amount: KULTR_PASS_PRICE_KES,
      currency: KULTR_PASS_CURRENCY,
    });
    return;
  }

  res.json({
    reference: paystack.reference,
    authorizationUrl: paystack.authorizationUrl,
    simulated: false,
    amount: KULTR_PASS_PRICE_KES,
    currency: KULTR_PASS_CURRENCY,
  });
});

/**
 * POST /api/payments/pass/verify
 * Verifies the charge from /pass/init (for real via Paystack, or simulated
 * when no gateway is configured) and flips the payment row to "verified".
 * Idempotent — replaying with an already-verified or already-consumed
 * reference just confirms success again rather than erroring or re-verifying.
 * Does NOT itself grant the entitlement; POST /pass/activate does that,
 * consuming this row exactly once.
 */
router.post("/pass/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference } = req.body as { reference?: string };

  if (!reference) {
    res.status(400).json({ message: "reference is required" });
    return;
  }

  const [pending] = await db.select().from(kultrPassPaymentsTable)
    .where(eq(kultrPassPaymentsTable.reference, reference)).limit(1);

  if (!pending || pending.userId !== authed.userId) {
    res.status(400).json({ message: "Unknown or expired payment reference" });
    return;
  }

  if (pending.status !== "pending") {
    // Already verified (or already consumed by /pass/activate) — replaying
    // this call is harmless, just confirm success again.
    res.json({ verified: true, reference });
    return;
  }

  const allowSimulation = simulationAllowed(isPaystackConfigured());

  if (!allowSimulation) {
    const result = await verifyPayment(reference);
    if (!result?.success) {
      res.status(402).json({ message: "Payment could not be verified" });
      return;
    }
    const expectedKobo = toCurrencyKobo(Number(pending.amount), pending.currency);
    if (result.amount !== expectedKobo || result.currency !== pending.currency) {
      res.status(400).json({ message: "Payment amount does not match the expected KULTR PASS price." });
      return;
    }
    const metaUserId = (result.metadata as { userId?: string } | undefined)?.userId;
    if (metaUserId && metaUserId !== authed.userId) {
      res.status(403).json({ message: "This payment belongs to a different account." });
      return;
    }
  }

  // Guarded update: only transitions out of "pending" once, so a race
  // between two concurrent verify calls can't double-apply anything here
  // (there's nothing to double-apply yet — the real one-time effect is
  // /pass/activate's consume step — but this keeps the row's history honest).
  await db
    .update(kultrPassPaymentsTable)
    .set({ status: "verified", verifiedAt: new Date() })
    .where(and(eq(kultrPassPaymentsTable.reference, reference), eq(kultrPassPaymentsTable.status, "pending")));

  res.json({ verified: true, reference });
});

/**
 * GET /api/payments/callback
 * Paystack redirects here after payment. Verifies and issues ticket, then
 * redirects the user to the deep link / app callback URL.
 */
router.get("/callback", async (req: Request, res: Response) => {
  const ref = String(req.query.reference ?? req.query.ref ?? "");
  if (!ref) { res.status(400).send("Missing reference"); return; }

  const result = await verifyPayment(ref);
  const appCallback = process.env.APP_CALLBACK_URL ?? "kultr://payment";

  if (!result?.success) {
    res.redirect(`${appCallback}?status=failed&ref=${ref}`);
    return;
  }

  const { metadata } = result;
  const { userId, eventId, ticketTypeId, quantity: rawQuantity } = metadata as {
    userId: string;
    eventId: string;
    ticketTypeId: string;
    quantity: number;
  };

  let quantity: number;
  try {
    quantity = validateQuantity(rawQuantity);
  } catch {
    res.redirect(`${appCallback}?status=failed&ref=${ref}`);
    return;
  }

  const [ticketType] = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.id, ticketTypeId)).limit(1);

  if (!ticketType) { res.redirect(`${appCallback}?status=failed&ref=${ref}`); return; }

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  // Bind the verified charge to the ticket being issued.
  const expectedKobo = toCurrencyKobo(totalAmount, ticketType.currency);
  if (result.amount !== expectedKobo || result.currency !== ticketType.currency) {
    res.redirect(`${appCallback}?status=failed&ref=${ref}`);
    return;
  }

  try {
    const { ticket } = await issueTicket({
      userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice,
      currency: ticketType.currency,
      paymentReference: ref,
      paymentProvider: "paystack",
    });
    res.redirect(`${appCallback}?status=success&ticketId=${ticket.id}&ref=${ref}`);
  } catch (err) {
    if (err instanceof TicketIssueError && err.code === "sold_out") {
      res.redirect(`${appCallback}?status=sold_out&ref=${ref}`);
      return;
    }
    throw err;
  }
});

/**
 * POST /api/payments/mpesa/stk-push
 * Initiate M-Pesa STK Push (Lipa na M-Pesa Online).
 * Returns { checkoutRequestId, simulated } — frontend polls /mpesa/status.
 */
router.post("/mpesa/stk-push", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { eventId, ticketTypeId, phone, countryCode } = req.body as {
    eventId: string;
    ticketTypeId: string;
    phone: string;
    countryCode?: string;
  };

  if (!eventId || !ticketTypeId || !phone) {
    res.status(400).json({ message: "eventId, ticketTypeId, and phone are required" });
    return;
  }

  let quantity: number;
  try {
    quantity = validateQuantity((req.body as { quantity?: unknown }).quantity ?? 1);
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }

  const [[event], [ticketType], [user]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticketTypeId)).limit(1),
    db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1),
  ]);

  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} ticket(s) remaining` });
    return;
  }

  const totalAmount = Number(ticketType.price) * quantity;
  const reference = generatePaymentRef();

  // Normalise to a bare E.164 MSISDN using the caller's country (body override
  // → user's stored country → defaults handled by the normalizer).
  let normalised: string;
  try {
    normalised = normalizeMsisdn(phone, countryCode ?? user?.countryCode);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid phone number" });
    return;
  }

  try {
    const stkResult = await initiateStkPush({
      phone: normalised,
      amountKES: totalAmount,
      reference,
      description: `${event.title} ticket`,
    });

    // Persist what this reference is actually for, server-side, before ever
    // responding to the client. /mpesa/verify (and the reconciliation worker,
    // which never talks to the client at all) read quantity/price/providerHandle
    // back from here — the M-Pesa STK query response carries no amount, so
    // without this a client could pay for one ticket and verify with a larger
    // quantity to receive tickets it never paid for.
    await db.insert(pendingPaymentsTable).values({
      reference,
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: String(Number(ticketType.price)),
      currency: ticketType.currency,
      provider: "mpesa",
      providerHandle: stkResult ? stkResult.checkoutRequestId : `sim_${reference}`,
    });

    if (!stkResult) {
      // Simulated mode (no M-Pesa credentials)
      res.json({
        checkoutRequestId: `sim_${reference}`,
        merchantRequestId: `sim_${reference}`,
        reference,
        simulated: true,
        totalAmount,
        currency: ticketType.currency,
        customerMessage: "Enter your M-Pesa PIN to complete payment (simulated)",
      });
      return;
    }

    res.json({
      checkoutRequestId: stkResult.checkoutRequestId,
      merchantRequestId: stkResult.merchantRequestId,
      reference,
      simulated: false,
      totalAmount,
      currency: ticketType.currency,
      customerMessage: stkResult.customerMessage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STK Push failed";
    res.status(502).json({ message });
  }
});

/**
 * POST /api/payments/mpesa/verify
 * Poll / confirm an STK Push result. On success, atomically creates the ticket.
 */
router.post("/mpesa/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference } = req.body as { reference: string };

  if (!reference) {
    res.status(400).json({ message: "reference is required" });
    return;
  }

  // Quantity, price, currency and the M-Pesa checkoutRequestId are never
  // re-read from the client here — they come from the pending-payment record
  // written at stk-push time, closing the amount/quantity-tampering gap
  // M-Pesa's STK query response can't cover.
  const [pending] = await db.select().from(pendingPaymentsTable)
    .where(eq(pendingPaymentsTable.reference, reference)).limit(1);

  if (!pending || pending.provider !== "mpesa") {
    res.status(400).json({ message: "Unknown or expired payment reference" });
    return;
  }
  if (pending.userId !== authed.userId) {
    res.status(403).json({ message: "This payment belongs to a different account." });
    return;
  }

  const [ticketType] = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.id, pending.ticketTypeId)).limit(1);

  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const allowSimulation = simulationAllowed(isMpesaConfigured());
  let paid = allowSimulation;

  if (!paid && pending.providerHandle) {
    const status = await queryStkPush(pending.providerHandle);
    paid = status?.resultCode === "0";
  }

  if (!paid) {
    res.status(402).json({ message: "M-Pesa payment not yet confirmed. Retry or cancel." });
    return;
  }

  const unitPrice = Number(pending.unitPrice);
  const totalAmount = unitPrice * pending.quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId: pending.eventId,
      ticketTypeId: pending.ticketTypeId,
      quantity: pending.quantity,
      unitPrice,
      currency: pending.currency,
      paymentReference: reference,
      paymentProvider: allowSimulation ? "mpesa_simulated" : "mpesa",
    });
    res.status(201).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount,
      currency: ticketType.currency,
    });
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }
});

/**
 * POST /api/payments/mpesa/callback
 * Safaricom calls this URL when the STK Push completes.
 * This is a webhook — no auth header from Safaricom, and Daraja has no
 * signature scheme to verify against (unlike e.g. Stripe webhooks). Real
 * ticket issuance never trusts this payload — it happens independently via
 * /mpesa/verify re-querying Safaricom directly — so this handler is
 * inherently low-risk today (it only logs). The one thing worth guarding
 * against is anyone who discovers the URL polluting that log with fake
 * callback noise, which is what MPESA_CALLBACK_TOKEN is for: set it, embed
 * it as ?token=... in MPESA_CALLBACK_URL when registering the callback with
 * Safaricom, and this handler will ignore any request missing a match.
 * Unset (the default), behavior is unchanged from before this check existed.
 */
router.post("/mpesa/callback", async (req: Request, res: Response) => {
  // Acknowledge immediately — Safaricom requires a quick 200 regardless of
  // whether the token check below passes, since we can't tell a legitimate
  // late/duplicate callback from a probe without also delaying every real one.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const expectedToken = process.env.MPESA_CALLBACK_TOKEN;
  if (expectedToken && req.query.token !== expectedToken) {
    return;
  }

  const body = req.body as {
    Body?: {
      stkCallback?: {
        ResultCode: number;
        ResultDesc: string;
        CheckoutRequestID: string;
        CallbackMetadata?: {
          Item: Array<{ Name: string; Value: string | number }>;
        };
      };
    };
  };

  const callback = body?.Body?.stkCallback;
  if (!callback || callback.ResultCode !== 0) return;

  // Extract phone and amount from callback metadata
  const items = callback.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  const mpesaReceiptNumber = String(get("MpesaReceiptNumber") ?? "");

  // Log for audit — actual ticket creation happens via /mpesa/verify polling
  console.log(`M-Pesa callback OK: ${callback.CheckoutRequestID} receipt=${mpesaReceiptNumber}`);
});

/**
 * POST /api/payments/momo/request
 * Initiate an MTN MoMo Request-to-Pay.
 * Returns { referenceId, simulated } — frontend polls /momo/verify until resolved.
 */
router.post("/momo/request", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { eventId, ticketTypeId, phone, countryCode } = req.body as {
    eventId: string;
    ticketTypeId: string;
    phone: string;
    countryCode?: string;
  };

  if (!eventId || !ticketTypeId || !phone) {
    res.status(400).json({ message: "eventId, ticketTypeId, and phone are required" });
    return;
  }

  let quantity: number;
  try {
    quantity = validateQuantity((req.body as { quantity?: unknown }).quantity ?? 1);
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }

  const [[event], [ticketType], [user]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticketTypeId)).limit(1),
    db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1),
  ]);

  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} ticket(s) remaining` });
    return;
  }

  const totalAmount = Number(ticketType.price) * quantity;
  const reference = generatePaymentRef();

  let normalised: string;
  try {
    normalised = normalizeMsisdn(phone, countryCode ?? user?.countryCode);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid phone number" });
    return;
  }

  try {
    const momoResult = await initiateMoMoRequest({
      phone: normalised,
      amount: totalAmount,
      currency: ticketType.currency,
      externalId: reference,
      payerMessage: `${event.title} ticket`,
      payeeNote: "Kultr",
    });

    // Persist what this reference is actually for, server-side, before ever
    // responding to the client — /momo/verify (and the reconciliation worker)
    // read quantity/price/providerHandle back from here rather than trusting
    // the client again, closing the same tampering gap as M-Pesa above.
    await db.insert(pendingPaymentsTable).values({
      reference,
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: String(Number(ticketType.price)),
      currency: ticketType.currency,
      provider: "mtn_momo",
      providerHandle: momoResult ? momoResult.referenceId : `sim_${reference}`,
    });

    if (!momoResult) {
      res.json({
        referenceId: `sim_${reference}`,
        reference,
        simulated: true,
        totalAmount,
        currency: ticketType.currency,
        customerMessage: "Approve the MoMo payment request on your phone (simulated)",
      });
      return;
    }

    res.json({
      referenceId: momoResult.referenceId,
      reference,
      simulated: false,
      totalAmount,
      currency: ticketType.currency,
      customerMessage: "Check your phone and approve the MoMo payment request",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MoMo request failed";
    res.status(502).json({ message });
  }
});

/**
 * POST /api/payments/momo/verify
 * Poll MoMo payment status. On SUCCESSFUL, atomically creates the ticket.
 */
router.post("/momo/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference } = req.body as { reference: string };

  if (!reference) {
    res.status(400).json({ message: "reference is required" });
    return;
  }

  // Quantity, price, currency and the MoMo referenceId are never re-read from
  // the client here — they come from the pending-payment record written at
  // request time.
  const [pending] = await db.select().from(pendingPaymentsTable)
    .where(eq(pendingPaymentsTable.reference, reference)).limit(1);

  if (!pending || pending.provider !== "mtn_momo" || !pending.providerHandle) {
    res.status(400).json({ message: "Unknown or expired payment reference" });
    return;
  }
  if (pending.userId !== authed.userId) {
    res.status(403).json({ message: "This payment belongs to a different account." });
    return;
  }

  const [ticketType] = await db.select().from(ticketTypesTable)
    .where(eq(ticketTypesTable.id, pending.ticketTypeId)).limit(1);

  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const allowSimulation = simulationAllowed(isMoMoConfigured());
  let paid = allowSimulation;

  if (!paid) {
    const status = await getMoMoPaymentStatus(pending.providerHandle);
    paid = status?.status === "SUCCESSFUL";
    if (status?.status === "FAILED") {
      res.status(402).json({ message: "MoMo payment was declined or failed." });
      return;
    }
  }

  if (!paid) {
    res.status(202).json({ message: "MoMo payment still pending. Poll again shortly.", status: "PENDING" });
    return;
  }

  const unitPrice = Number(pending.unitPrice);
  const totalAmount = unitPrice * pending.quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId: pending.eventId,
      ticketTypeId: pending.ticketTypeId,
      quantity: pending.quantity,
      unitPrice,
      currency: pending.currency,
      paymentReference: reference,
      paymentProvider: allowSimulation ? "momo_simulated" : "mtn_momo",
    });
    res.status(201).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount,
      currency: ticketType.currency,
    });
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }
});

/**
 * POST /api/payments/stripe/init
 * Create a Stripe Checkout session for a ticket purchase. Used for diaspora
 * card payments and any market whose currency Paystack can't settle in (see
 * STRIPE_SUPPORTED_CURRENCIES above). The ticket's own price is converted
 * server-side (never trusting a client-supplied amount) from the event's
 * native currency into the requested settlement currency, and the converted
 * unit price is persisted to pending_payments — /stripe/verify re-reads it
 * from there rather than recomputing the conversion, so a live FX rate move
 * between init and verify can never cause a false amount mismatch.
 */
router.post("/stripe/init", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { eventId, ticketTypeId, currency: targetCurrencyRaw } = req.body as {
    eventId: string;
    ticketTypeId: string;
    currency?: string;
  };

  if (!eventId || !ticketTypeId) {
    res.status(400).json({ message: "eventId and ticketTypeId are required" });
    return;
  }

  let quantity: number;
  try {
    quantity = validateQuantity((req.body as { quantity?: unknown }).quantity ?? 1);
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }

  const targetCurrency = (targetCurrencyRaw ?? "USD").toUpperCase();
  if (!STRIPE_SUPPORTED_CURRENCIES.has(targetCurrency)) {
    res.status(400).json({ message: `Unsupported card payment currency: ${targetCurrency}` });
    return;
  }

  const [[user], [event], [ticketType]] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1),
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticketTypeId)).limit(1),
  ]);

  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} ticket(s) remaining` });
    return;
  }

  const unitPrice = Number(ticketType.price);
  const isSameCurrency = ticketType.currency === targetCurrency;
  let unitPriceInTarget = unitPrice;
  if (!isSameCurrency) {
    const { rates } = await getRates(ticketType.currency);
    const rate = rates[targetCurrency];
    if (!rate) {
      res.status(502).json({ message: "Currency conversion unavailable right now. Please try again shortly." });
      return;
    }
    unitPriceInTarget = unitPrice * rate;
  }

  const reference = generatePaymentRef();
  const appCallback = process.env.APP_CALLBACK_URL ?? "kultr://payment";

  try {
    const session = await createCheckoutSession({
      email: user.email,
      unitAmountMinor: Math.round(unitPriceInTarget * 100),
      quantity,
      currency: targetCurrency,
      productName: `${event.title} — ${ticketType.name}`,
      reference,
      successUrl: `${appCallback}?status=success&ref=${reference}`,
      cancelUrl: `${appCallback}?status=cancelled&ref=${reference}`,
      metadata: { userId: authed.userId, eventId, ticketTypeId, quantity: String(quantity) },
    });

    await db.insert(pendingPaymentsTable).values({
      reference,
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: String(unitPriceInTarget),
      currency: targetCurrency,
      provider: "stripe",
      providerHandle: session ? session.sessionId : `sim_${reference}`,
    });

    const totalAmount = unitPriceInTarget * quantity;

    if (!session) {
      res.json({ reference, checkoutUrl: null, simulated: true, totalAmount, currency: targetCurrency });
      return;
    }

    res.json({ reference, checkoutUrl: session.checkoutUrl, simulated: false, totalAmount, currency: targetCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start card payment";
    res.status(502).json({ message });
  }
});

/**
 * POST /api/payments/stripe/verify
 * Poll / confirm a Stripe Checkout session. Quantity, converted unit price
 * and currency are read from the pending-payment record written at init
 * time, never from the client, matching /mpesa/verify and /momo/verify.
 */
router.post("/stripe/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference } = req.body as { reference: string };

  if (!reference) {
    res.status(400).json({ message: "reference is required" });
    return;
  }

  const [pending] = await db.select().from(pendingPaymentsTable)
    .where(eq(pendingPaymentsTable.reference, reference)).limit(1);

  if (!pending || pending.provider !== "stripe" || !pending.providerHandle) {
    res.status(400).json({ message: "Unknown or expired payment reference" });
    return;
  }
  if (pending.userId !== authed.userId) {
    res.status(403).json({ message: "This payment belongs to a different account." });
    return;
  }

  const allowSimulation = simulationAllowed(isStripeConfigured());
  let paid = allowSimulation;

  if (!paid) {
    const session = await retrieveCheckoutSession(pending.providerHandle);
    if (!session) {
      res.status(402).json({ message: "Payment could not be verified" });
      return;
    }
    const expectedMinor = Math.round(Number(pending.unitPrice) * pending.quantity * 100);
    if (session.success && (session.amountTotalMinor !== expectedMinor || session.currency !== pending.currency)) {
      res.status(400).json({ message: "Payment amount does not match the requested ticket." });
      return;
    }
    if (session.success && session.metadata.userId && session.metadata.userId !== authed.userId) {
      res.status(403).json({ message: "This payment belongs to a different account." });
      return;
    }
    paid = session.success;
  }

  if (!paid) {
    res.status(402).json({ message: "Card payment could not be confirmed. Please try again." });
    return;
  }

  const unitPrice = Number(pending.unitPrice);
  const totalAmount = unitPrice * pending.quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId: pending.eventId,
      ticketTypeId: pending.ticketTypeId,
      quantity: pending.quantity,
      unitPrice,
      currency: pending.currency,
      paymentReference: reference,
      paymentProvider: allowSimulation ? "stripe_simulated" : "stripe",
    });
    res.status(201).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount,
      currency: pending.currency,
    });
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }
});

/**
 * POST /api/payments/selcom/request
 * Push a Selcom USSD payment prompt for Tanzania mobile money (M-Pesa TZ,
 * Tigo Pesa, Airtel Money TZ). The ticket's price is converted server-side
 * from the event's native currency into TZS, mirroring /stripe/init.
 */
router.post("/selcom/request", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { eventId, ticketTypeId, phone, countryCode } = req.body as {
    eventId: string;
    ticketTypeId: string;
    phone: string;
    countryCode?: string;
  };

  if (!eventId || !ticketTypeId || !phone) {
    res.status(400).json({ message: "eventId, ticketTypeId, and phone are required" });
    return;
  }

  let quantity: number;
  try {
    quantity = validateQuantity((req.body as { quantity?: unknown }).quantity ?? 1);
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }

  const [[event], [ticketType], [user]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1),
    db.select().from(ticketTypesTable).where(eq(ticketTypesTable.id, ticketTypeId)).limit(1),
    db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1),
  ]);

  if (!event) { res.status(404).json({ message: "Event not found" }); return; }
  if (!ticketType) { res.status(404).json({ message: "Ticket type not found" }); return; }

  const available = ticketType.totalQuantity - ticketType.soldQuantity;
  if (available < quantity) {
    res.status(400).json({ message: `Only ${available} ticket(s) remaining` });
    return;
  }

  let normalised: string;
  try {
    normalised = normalizeMsisdn(phone, countryCode ?? user?.countryCode ?? "TZ");
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid phone number" });
    return;
  }

  const unitPrice = Number(ticketType.price);
  let unitPriceTZS = unitPrice;
  if (ticketType.currency !== "TZS") {
    const { rates } = await getRates(ticketType.currency);
    const rate = rates.TZS;
    if (!rate) {
      res.status(502).json({ message: "Currency conversion unavailable right now. Please try again shortly." });
      return;
    }
    unitPriceTZS = unitPrice * rate;
  }
  const totalAmountTZS = unitPriceTZS * quantity;
  const reference = generatePaymentRef();

  try {
    const orderResult = await createSelcomOrder({
      phone: normalised,
      amountTZS: totalAmountTZS,
      orderId: reference,
      buyerEmail: user.email,
      buyerName: user.displayName,
    });

    await db.insert(pendingPaymentsTable).values({
      reference,
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: String(unitPriceTZS),
      currency: "TZS",
      provider: "selcom",
      providerHandle: orderResult ? orderResult.orderId : `sim_${reference}`,
    });

    if (!orderResult) {
      res.json({
        reference,
        simulated: true,
        totalAmount: totalAmountTZS,
        currency: "TZS",
        customerMessage: "Approve the payment prompt on your phone (simulated)",
      });
      return;
    }

    res.json({
      reference,
      simulated: false,
      totalAmount: totalAmountTZS,
      currency: "TZS",
      customerMessage: "Check your phone and approve the payment prompt",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Selcom payment request failed";
    res.status(502).json({ message });
  }
});

/**
 * POST /api/payments/selcom/verify
 * Poll Selcom order status. Quantity, converted unit price and the order id
 * are read from the pending-payment record written at request time.
 */
router.post("/selcom/verify", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const { reference } = req.body as { reference: string };

  if (!reference) {
    res.status(400).json({ message: "reference is required" });
    return;
  }

  const [pending] = await db.select().from(pendingPaymentsTable)
    .where(eq(pendingPaymentsTable.reference, reference)).limit(1);

  if (!pending || pending.provider !== "selcom" || !pending.providerHandle) {
    res.status(400).json({ message: "Unknown or expired payment reference" });
    return;
  }
  if (pending.userId !== authed.userId) {
    res.status(403).json({ message: "This payment belongs to a different account." });
    return;
  }

  const allowSimulation = simulationAllowed(isSelcomConfigured());
  let paid = allowSimulation;

  if (!paid) {
    const status = await getSelcomOrderStatus(pending.providerHandle);
    paid = status?.status === "COMPLETED";
    if (status?.status === "FAILED") {
      res.status(402).json({ message: "Payment was declined or failed." });
      return;
    }
  }

  if (!paid) {
    res.status(202).json({ message: "Payment still pending. Poll again shortly.", status: "PENDING" });
    return;
  }

  const unitPrice = Number(pending.unitPrice);
  const totalAmount = unitPrice * pending.quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId: pending.eventId,
      ticketTypeId: pending.ticketTypeId,
      quantity: pending.quantity,
      unitPrice,
      currency: pending.currency,
      paymentReference: reference,
      paymentProvider: allowSimulation ? "selcom_simulated" : "selcom",
    });
    res.status(201).json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      totalAmount,
      currency: pending.currency,
    });
  } catch (err) {
    if (handleIssueError(err, res)) return;
    throw err;
  }
});

export default router;
