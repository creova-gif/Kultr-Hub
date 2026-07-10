import { Router } from "express";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, ticketTypesTable, eventsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { initializePayment, verifyPayment, isPaystackConfigured } from "../lib/paystack.js";
import { initiateStkPush, queryStkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { initiateMoMoRequest, getMoMoPaymentStatus, isMoMoConfigured } from "../lib/mtn-momo.js";
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
  const { eventId, ticketTypeId, quantity = 1, phone, countryCode } = req.body as {
    eventId: string;
    ticketTypeId: string;
    quantity?: number;
    phone: string;
    countryCode?: string;
  };

  if (!eventId || !ticketTypeId || !phone) {
    res.status(400).json({ message: "eventId, ticketTypeId, and phone are required" });
    return;
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
  const { checkoutRequestId, reference, eventId, ticketTypeId } = req.body as {
    checkoutRequestId: string;
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

  const allowSimulation = simulationAllowed(isMpesaConfigured());
  let paid = allowSimulation;

  if (!paid && checkoutRequestId) {
    const status = await queryStkPush(checkoutRequestId);
    paid = status?.resultCode === "0";
  }

  if (!paid) {
    res.status(402).json({ message: "M-Pesa payment not yet confirmed. Retry or cancel." });
    return;
  }

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice,
      currency: ticketType.currency,
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
 * This is a webhook — no auth header from Safaricom.
 */
router.post("/mpesa/callback", async (req: Request, res: Response) => {
  // Acknowledge immediately — Safaricom requires a quick 200
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });

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
  const { eventId, ticketTypeId, quantity = 1, phone, countryCode } = req.body as {
    eventId: string;
    ticketTypeId: string;
    quantity?: number;
    phone: string;
    countryCode?: string;
  };

  if (!eventId || !ticketTypeId || !phone) {
    res.status(400).json({ message: "eventId, ticketTypeId, and phone are required" });
    return;
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
  const { referenceId, reference, eventId, ticketTypeId } = req.body as {
    referenceId: string;
    reference: string;
    eventId: string;
    ticketTypeId: string;
  };

  if (!referenceId || !reference || !eventId || !ticketTypeId) {
    res.status(400).json({ message: "referenceId, reference, eventId and ticketTypeId are required" });
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

  const allowSimulation = simulationAllowed(isMoMoConfigured());
  let paid = allowSimulation;

  if (!paid) {
    const status = await getMoMoPaymentStatus(referenceId);
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

  const unitPrice = Number(ticketType.price);
  const totalAmount = unitPrice * quantity;

  try {
    const { ticket } = await issueTicket({
      userId: authed.userId,
      eventId,
      ticketTypeId,
      quantity,
      unitPrice,
      currency: ticketType.currency,
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

export default router;
