/**
 * Stripe Checkout integration — card payments for diaspora buyers (UK, US,
 * Canada, and other markets Paystack's currency list doesn't cover) plus any
 * African market whose local currency Paystack can't settle in (UGX, TZS,
 * RWF, ETB, XOF, XAF, JMD, TTD, BBD, ...). Kenya/Ghana/Nigeria/South Africa
 * keep routing "card" through Paystack — see constants/currencies.ts's
 * `gateway` field on each country's card payment method.
 *
 * Follows the same simulated-fallback contract as lib/paystack.ts: with no
 * secret key configured, every call below returns null without making a
 * network request. Unlike Paystack's client, a *configured* call that Stripe
 * rejects throws instead of returning null — so a live rejection can never
 * be misread by a caller as "not configured" and fall through to a
 * simulated success. See lib/simulation.ts for the server-side gate that
 * actually decides whether simulated mode is permitted.
 *
 * Env vars (leave unset for simulated mode):
 *   STRIPE_SECRET_KEY — https://dashboard.stripe.com/apikeys
 *
 * Docs: https://stripe.com/docs/api/checkout/sessions
 */

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const BASE_URL = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET);
}

interface StripeCheckoutSessionCreateResponse {
  id: string;
  url: string | null;
}

interface StripeCheckoutSessionDetailResponse {
  id: string;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  client_reference_id: string | null;
}

function toFormBody(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

async function stripeFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stripe API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export interface CreateCheckoutSessionParams {
  email: string;
  /** Unit price in the smallest unit of `currency` (e.g. cents). */
  unitAmountMinor: number;
  quantity: number;
  /** ISO 4217 currency code, e.g. "usd", "gbp", "cad". Case-insensitive. */
  currency: string;
  productName: string;
  /** Our own payment reference — round-trips back via client_reference_id. */
  reference: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/**
 * Create a hosted Stripe Checkout session. Returns null only when
 * STRIPE_SECRET_KEY is unset (simulated mode) — a configured-but-rejected
 * request throws.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams,
): Promise<{ sessionId: string; checkoutUrl: string } | null> {
  if (!STRIPE_SECRET) return null;

  const body: Record<string, string> = {
    mode: "payment",
    "line_items[0][price_data][currency]": params.currency.toLowerCase(),
    "line_items[0][price_data][product_data][name]": params.productName,
    "line_items[0][price_data][unit_amount]": String(Math.round(params.unitAmountMinor)),
    "line_items[0][quantity]": String(params.quantity),
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.email,
    client_reference_id: params.reference,
  };
  for (const [key, value] of Object.entries(params.metadata)) {
    body[`metadata[${key}]`] = value;
  }

  const session = await stripeFetch<StripeCheckoutSessionCreateResponse>("/checkout/sessions", {
    method: "POST",
    body: toFormBody(body),
  });

  if (!session.url) throw new Error("Stripe checkout session created without a redirect URL");
  return { sessionId: session.id, checkoutUrl: session.url };
}

export interface CheckoutSessionResult {
  success: boolean;
  amountTotalMinor: number;
  currency: string;
  metadata: Record<string, string>;
  reference: string | null;
}

/**
 * Retrieve a Checkout session's final status. Returns null only when
 * STRIPE_SECRET_KEY is unset (simulated mode) — a configured-but-failing
 * lookup throws.
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionResult | null> {
  if (!STRIPE_SECRET) return null;

  const session = await stripeFetch<StripeCheckoutSessionDetailResponse>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );

  return {
    success: session.payment_status === "paid",
    amountTotalMinor: session.amount_total ?? 0,
    currency: (session.currency ?? "").toUpperCase(),
    metadata: session.metadata ?? {},
    reference: session.client_reference_id,
  };
}
