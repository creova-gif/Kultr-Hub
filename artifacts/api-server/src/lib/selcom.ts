/**
 * Selcom Pay integration — Tanzania mobile money (M-Pesa Tanzania/Vodacom,
 * Tigo Pesa, Airtel Money TZ, HaloPesa) via a single aggregator API, the same
 * role Paystack plays for Kenya/Ghana/Nigeria/South Africa card rails and MTN
 * MoMo plays for Uganda/Rwanda/Ghana. Selcom is the dominant Tanzanian
 * payment gateway and is the only rail in this codebase that reaches TZS
 * mobile money — Safaricom's Daraja API (lib/mpesa.ts) is Kenya-only.
 *
 * Follows the same simulated-fallback contract as lib/mtn-momo.ts: with no
 * API key configured, every call below returns null without making a
 * network request; a configured-but-rejected call throws instead of
 * returning null.
 *
 * ⚠ IMPORTANT — before enabling in production: this client implements
 * Selcom's published "Create Order (minimal / USSD push)" + order-status
 * contract from their integration docs, but the exact request-signing
 * details have NOT been verified against a live Selcom sandbox account (none
 * was available while writing this). Test end-to-end against sandbox
 * credentials before pointing SELCOM_ENVIRONMENT at "production" — a wrong
 * signature simply makes every call fail closed (502 to the client), it can
 * never falsely report a payment as successful, but it also won't work until
 * verified.
 *
 * Env vars (leave unset for simulated mode):
 *   SELCOM_API_KEY       — Vendor API key from the Selcom merchant portal
 *   SELCOM_API_SECRET    — Used to HMAC-sign each request
 *   SELCOM_VENDOR_ID     — Vendor/merchant ID assigned by Selcom
 *   SELCOM_ENVIRONMENT   — "sandbox" (default) | "production"
 *
 * Docs: https://developers.selcommobile.com
 */
import { createHmac } from "node:crypto";

const API_KEY = process.env.SELCOM_API_KEY ?? "";
const API_SECRET = process.env.SELCOM_API_SECRET ?? "";
const VENDOR_ID = process.env.SELCOM_VENDOR_ID ?? "";
const ENVIRONMENT = process.env.SELCOM_ENVIRONMENT ?? "sandbox";

const BASE_URL =
  ENVIRONMENT === "production"
    ? "https://apigw.selcommobile.com/v1"
    : "https://apigwtest.selcommobile.com/v1";

export function isSelcomConfigured(): boolean {
  return Boolean(API_KEY && API_SECRET && VENDOR_ID);
}

function signRequest(fields: Record<string, string>, timestamp: string): string {
  // Selcom signs a "SIGNED-FIELDS" digest: timestamp + each declared field's
  // value, joined with "&", HMAC-SHA256'd with the API secret, base64-encoded.
  const orderedKeys = Object.keys(fields).sort();
  const payload = [timestamp, ...orderedKeys.map((k) => `${k}=${fields[k]}`)].join("&");
  return createHmac("sha256", API_SECRET).update(payload).digest("base64");
}

async function selcomFetch<T>(path: string, fields: Record<string, string>): Promise<T> {
  const timestamp = new Date().toISOString();
  const signature = signRequest(fields, timestamp);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `SELCOM ${Buffer.from(API_KEY).toString("base64")}`,
      "Digest-Method": "HS256",
      Digest: signature,
      Timestamp: timestamp,
      "Signed-Fields": Object.keys(fields).sort().join(","),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Selcom API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export interface SelcomOrderParams {
  /** Bare MSISDN, no "+", e.g. "255712345678" */
  phone: string;
  /** Amount in whole TZS (Selcom does not use minor units) */
  amountTZS: number;
  orderId: string;
  buyerEmail: string;
  buyerName: string;
}

interface SelcomCreateOrderResponse {
  result: "SUCCESS" | "FAIL";
  data?: Array<{ payment_token?: string }>;
}

/**
 * Push a USSD payment prompt to the buyer's phone. Returns null in
 * simulated mode. Poll {@link getSelcomOrderStatus} until resolved.
 */
export async function createSelcomOrder(params: SelcomOrderParams): Promise<{ orderId: string } | null> {
  if (!isSelcomConfigured()) {
    console.log(`[selcom:simulated] phone=${params.phone} amount=${params.amountTZS} TZS order=${params.orderId}`);
    return null;
  }

  const result = await selcomFetch<SelcomCreateOrderResponse>("/checkout/create-order-minimal", {
    vendor: VENDOR_ID,
    order_id: params.orderId,
    buyer_email: params.buyerEmail,
    buyer_name: params.buyerName,
    buyer_phone: params.phone,
    amount: String(Math.round(params.amountTZS)),
    currency: "TZS",
    no_of_items: "1",
  });

  if (result.result !== "SUCCESS") throw new Error("Selcom order creation was rejected");
  return { orderId: params.orderId };
}

export type SelcomOrderStatus = "PENDING" | "COMPLETED" | "FAILED";

interface SelcomOrderStatusResponse {
  result: "SUCCESS" | "FAIL";
  data?: Array<{ payment_status?: string }>;
}

/** Poll an order's payment status by orderId. Returns null in simulated mode. */
export async function getSelcomOrderStatus(orderId: string): Promise<{ status: SelcomOrderStatus } | null> {
  if (!isSelcomConfigured()) return null;

  const result = await selcomFetch<SelcomOrderStatusResponse>("/checkout/order-status", {
    vendor: VENDOR_ID,
    order_id: orderId,
  });

  const rawStatus = result.data?.[0]?.payment_status ?? "";
  const status: SelcomOrderStatus =
    rawStatus === "COMPLETED" ? "COMPLETED" : rawStatus === "FAILED" ? "FAILED" : "PENDING";
  return { status };
}
