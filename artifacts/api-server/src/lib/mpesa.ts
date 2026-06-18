/**
 * Daraja API (Safaricom M-Pesa) integration.
 * Supports STK Push (Lipa na M-Pesa Online) for Kenya.
 *
 * Required env vars (leave unset for simulated dev mode):
 *   MPESA_CONSUMER_KEY
 *   MPESA_CONSUMER_SECRET
 *   MPESA_SHORTCODE       — Business short code (PayBill or Till)
 *   MPESA_PASSKEY         — Lipa na M-Pesa passkey from Daraja portal
 *   MPESA_CALLBACK_URL    — Public HTTPS URL Safaricom calls after payment
 *   MPESA_ENVIRONMENT     — "sandbox" (default) or "production"
 */

const env = () => process.env.MPESA_ENVIRONMENT ?? "sandbox";

function baseUrl(): string {
  return env() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function isConfigured(): boolean {
  return !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY
  );
}

async function getOAuthToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
    },
  );

  if (!res.ok) throw new Error(`M-Pesa OAuth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function buildPassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export interface StkPushParams {
  phone: string;      // E.164 format: 254XXXXXXXXX
  amountKES: number;
  reference: string;  // alphanumeric, max 12 chars
  description: string;
}

export interface StkPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  customerMessage: string;
}

/**
 * Initiate an M-Pesa STK Push. Returns null when not configured (dev mode).
 */
export async function initiateStkPush(
  params: StkPushParams,
): Promise<StkPushResult | null> {
  if (!isConfigured()) return null;

  const token = await getOAuthToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const timestamp = formatTimestamp();
  const password = buildPassword(timestamp);
  const callbackUrl =
    process.env.MPESA_CALLBACK_URL ??
    `${process.env.API_BASE_URL ?? "http://localhost:3001"}/api/payments/mpesa/callback`;

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(params.amountKES),
    PartyA: params.phone,
    PartyB: shortcode,
    PhoneNumber: params.phone,
    CallBackURL: callbackUrl,
    AccountReference: params.reference.slice(0, 12),
    TransactionDesc: params.description.slice(0, 13),
  };

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`STK Push failed: ${res.status}`);

  const data = (await res.json()) as {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    CustomerMessage: string;
  };

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    responseCode: data.ResponseCode,
    customerMessage: data.CustomerMessage,
  };
}

export interface StkQueryResult {
  resultCode: string;     // "0" = success
  resultDesc: string;
  checkoutRequestId: string;
}

/**
 * Query STK Push transaction status.
 */
export async function queryStkPush(checkoutRequestId: string): Promise<StkQueryResult | null> {
  if (!isConfigured()) return null;

  const token = await getOAuthToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const timestamp = formatTimestamp();
  const password = buildPassword(timestamp);

  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    ResultCode: string;
    ResultDesc: string;
    CheckoutRequestID: string;
  };

  return {
    resultCode: data.ResultCode,
    resultDesc: data.ResultDesc,
    checkoutRequestId: data.CheckoutRequestID,
  };
}
