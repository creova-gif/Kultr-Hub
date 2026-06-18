/**
 * MTN Mobile Money (MoMo) Collections API integration.
 * Covers Ghana, Uganda, Rwanda, Côte d'Ivoire, Senegal, Cameroon, and all
 * other MoMo markets — anywhere the payment method label starts with "mtn_".
 *
 * Follows the same simulated-fallback pattern as M-Pesa and Paystack: when
 * credentials are absent the client returns null so callers can degrade
 * gracefully without hitting the live gateway.
 *
 * Env vars (leave unset for simulated mode):
 *   MTN_MOMO_SUBSCRIPTION_KEY   — Primary key from MoMo developer portal
 *   MTN_MOMO_API_USER           — UUID provisioned via POST /apiuser
 *   MTN_MOMO_API_KEY            — Key generated via POST /apiuser/{userId}/apikey
 *   MTN_MOMO_ENVIRONMENT        — "sandbox" (default) | "production"
 *   MTN_MOMO_CURRENCY           — ISO currency for your target market (e.g. GHS, UGX)
 *
 * Docs: https://momodeveloper.mtn.com/docs/services/collection
 */

const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? "";
const API_USER = process.env.MTN_MOMO_API_USER ?? "";
const API_KEY = process.env.MTN_MOMO_API_KEY ?? "";
const ENVIRONMENT = process.env.MTN_MOMO_ENVIRONMENT ?? "sandbox";
const MOMO_CURRENCY = process.env.MTN_MOMO_CURRENCY ?? "EUR"; // sandbox uses EUR

const BASE_URL =
  ENVIRONMENT === "production"
    ? "https://proxy.momoapi.mtn.com"
    : "https://sandbox.momodeveloper.mtn.com";

export function isMoMoConfigured(): boolean {
  return Boolean(SUBSCRIPTION_KEY && API_USER && API_KEY);
}

async function getBearerToken(): Promise<string> {
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");
  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) throw new Error(`MoMo token error: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface MoMoRequestParams {
  /** E.164 MSISDN without the "+" prefix, e.g. "233241234567" */
  phone: string;
  /** Amount in the market currency */
  amount: number;
  currency: string;
  externalId: string;
  payerMessage?: string;
  payeeNote?: string;
}

export interface MoMoRequestResult {
  referenceId: string;
}

/**
 * Initiate a MoMo Request-to-Pay (Collection). Returns null in simulated mode.
 * Poll {@link getMoMoPaymentStatus} until the status is "SUCCESSFUL" or "FAILED".
 */
export async function initiateMoMoRequest(
  params: MoMoRequestParams,
): Promise<MoMoRequestResult | null> {
  if (!isMoMoConfigured()) {
    console.log(`[mtn-momo:simulated] phone=${params.phone} amount=${params.amount} ${params.currency}`);
    return null;
  }

  const token = await getBearerToken();
  const referenceId = crypto.randomUUID();

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(Math.ceil(params.amount)),
      currency: MOMO_CURRENCY,
      externalId: params.externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: params.phone,
      },
      payerMessage: params.payerMessage ?? "Kultr ticket payment",
      payeeNote: params.payeeNote ?? "Kultr",
    }),
  });

  // 202 Accepted = request queued; any other status is an error.
  if (res.status !== 202) throw new Error(`MoMo request failed: ${res.status}`);
  return { referenceId };
}

export type MoMoPaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED";

export interface MoMoStatusResult {
  status: MoMoPaymentStatus;
  referenceId: string;
}

/**
 * Poll MoMo payment status for a given referenceId.
 */
export async function getMoMoPaymentStatus(
  referenceId: string,
): Promise<MoMoStatusResult | null> {
  if (!isMoMoConfigured()) return null;

  const token = await getBearerToken();
  const res = await fetch(
    `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      },
    },
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { status: string };
  return {
    referenceId,
    status: (data.status as MoMoPaymentStatus) ?? "PENDING",
  };
}
